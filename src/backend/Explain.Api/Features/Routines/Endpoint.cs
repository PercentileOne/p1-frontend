using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Routines;

/// <summary>
/// My Routines (Francis, 2026-10-13): a person's daily routine as a TEMPLATE (the master list) plus one DAY ENTRY per date.
/// A day entry is built the first time that date is opened, from the template plus whichever if-then rules apply to that date, then kept as a snapshot,
/// so improving the template never rewrites history. Nothing runs at midnight: a day that was never opened simply does not exist.
/// Private to the signed-in person. Health readings typed into number items are never exposed to anyone else, and no other feature reads this container.
/// Container "routines", partition /userId; document ids are "template" and "day:yyyy-MM-dd".
/// </summary>
public static class Endpoint
{
    public const int MaxItems = 80;
    public const int MaxSections = 12;
    public const int MaxText = 200;
    /// <summary>A "read aloud" item is a whole passage (declarations, a prayer), so it gets a longer limit than a one-line item.</summary>
    public const int MaxReadText = 2000;
    public const int MaxValue = 2000;

    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/routines").RequireAuthorization(Permissions.PracticeInterview).WithTags("Routines");

        group.MapGet("/template", async (HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            var t = await LoadTemplateAsync(cosmos, userId, ct);
            return Results.Ok(new TemplateReply(t.sections, t.items));
        });

        group.MapPut("/template", async (TemplateRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            var (sections, items, error) = Clean(req.sections, req.items);
            if (error is not null) return Results.BadRequest(new { error });
            var doc = new TemplateDoc("template", userId, "template", sections, items, DateTimeOffset.UtcNow.ToString("o"));
            await cosmos.GetContainer("routines").UpsertItemAsync(doc, new PartitionKey(userId), cancellationToken: ct);
            return Results.Ok(new TemplateReply(doc.sections, doc.items));
        });

        group.MapGet("/day/{date}", async (string date, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (!TryDate(date, out var d)) return Results.BadRequest(new { error = "Use a date like 2026-10-13." });
            // Browsing to an old date (a date picker can reach any day) must not store an empty day for every date looked at: that would fill the tree with grey dots and
            // inflate "days opened" in the reviews. A day from before yesterday (UTC; the extra day covers every time zone) is built from the template for viewing only,
            // and is stored the first time something on it is changed. Today and later are stored on opening, as before.
            var persist = d >= DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-1);
            return Results.Ok(await LoadOrBuildDayAsync(cosmos, userId, d, ct, persist));
        });

        // For the Dashboard card: today's progress WITHOUT creating the day, so people who never open My Routines are not given a stored document every morning.
        group.MapGet("/day/{date}/summary", async (string date, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (!TryDate(date, out var d)) return Results.BadRequest(new { error = "Use a date like 2026-10-13." });
            try
            {
                var r = await cosmos.GetContainer("routines").ReadItemAsync<DayDoc>("day:" + d.ToString("yyyy-MM-dd"), new PartitionKey(userId), cancellationToken: ct);
                return Results.Ok(new SummaryReply(true, Summary(await ApplyAutoTicksAsync(cosmos, userId, d, r.Resource, ct, persistIfChanged: false))));
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { }
            var t = await LoadTemplateAsync(cosmos, userId, ct);
            return Results.Ok(new SummaryReply(false, Summary(await ApplyAutoTicksAsync(cosmos, userId, d, BuildDay(userId, d, t), ct, persistIfChanged: false))));
        });

        group.MapPut("/day/{date}/state", async (string date, StateRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (!TryDate(date, out var d)) return Results.BadRequest(new { error = "Use a date like 2026-10-13." });
            var day = await LoadOrBuildDayAsync(cosmos, userId, d, ct);
            var ids = day.items.Select(i => i.id).ToHashSet();
            var kinds = day.items.ToDictionary(i => i.id, i => i.kind);
            var checkedMap = (req.@checked ?? new()).Where(kv => ids.Contains(kv.Key) && kv.Value).ToDictionary(kv => kv.Key, kv => true);
            var values = (req.values ?? new()).Where(kv => ids.Contains(kv.Key) && !string.IsNullOrWhiteSpace(kv.Value))
                .ToDictionary(kv => kv.Key, kv => kv.Value.Length > MaxValue ? kv.Value[..MaxValue] : kv.Value);
            var saved = WithAutoTicks(day with { @checked = checkedMap, values = values, updatedAt = DateTimeOffset.UtcNow.ToString("o") },
                HasAutoItems(day) && await QotdAnsweredAsync(cosmos, userId, d, ct));
            await cosmos.GetContainer("routines").UpsertItemAsync(saved, new PartitionKey(userId), cancellationToken: ct);
            return Results.Ok(Summary(saved));
        });

        // Add an item: just for this day, every day (also joins the template), or on certain days (a rule on the template item).
        group.MapPost("/day/{date}/items", async (string date, AddItemRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (!TryDate(date, out var d)) return Results.BadRequest(new { error = "Use a date like 2026-10-13." });
            var text = (req.text ?? "").Trim();
            if (text.Length == 0) return Results.BadRequest(new { error = "Type what the item is." });
            var scope = req.scope is "always" or "rule" ? req.scope : "today";
            var kind = NormaliseKind(req.kind);
            var limit = TextLimit(kind);
            if (text.Length > limit) text = text[..limit];
            var rule = scope == "rule" ? CleanRule(req.rule) : null;
            if (scope == "rule" && rule is null) return Results.BadRequest(new { error = "Choose which days." });

            var day = await LoadOrBuildDayAsync(cosmos, userId, d, ct);
            if (day.items.Count >= MaxItems) return Results.BadRequest(new { error = "That's the most items one day can hold." });
            var (section, isNewSection, sectionError) = ResolveSection(day.sections, req.section);
            if (sectionError is not null) return Results.BadRequest(new { error = sectionError });
            var id = NewId();
            var priority = NormalisePriority(req.priority, req.essential);
            var essential = priority == "essential";

            if (scope != "today")
            {
                var t = await LoadTemplateAsync(cosmos, userId, ct);
                if (t.items.Count >= MaxItems) return Results.BadRequest(new { error = "Your template is full." });
                var sections = t.sections.Contains(section) ? t.sections : t.sections.Append(section).ToList();
                var items = t.items.Append(new TemplateItem(id, text, section, kind, essential, rule, priority)).ToList();
                var tdoc = new TemplateDoc("template", userId, "template", sections, items, DateTimeOffset.UtcNow.ToString("o"));
                await cosmos.GetContainer("routines").UpsertItemAsync(tdoc, new PartitionKey(userId), cancellationToken: ct);
            }
            // The rule item only shows today if the rule covers today; "just for today" and "every day" always do.
            if (scope != "rule" || Applies(rule, d))
            {
                var items = day.items.Append(new DayItem(id, text, section, kind, essential, rule?.label, scope == "today" ? "today" : "template", priority)).ToList();
                var daySections = isNewSection ? day.sections.Append(section).ToList() : day.sections;
                day = day with { sections = daySections, items = items, updatedAt = DateTimeOffset.UtcNow.ToString("o") };
                await cosmos.GetContainer("routines").UpsertItemAsync(day, new PartitionKey(userId), cancellationToken: ct);
            }
            return Results.Ok(day);
        });

        // Change an item's wording or whether it's essential. On the day, and (when it came from the template) in the template too.
        group.MapPut("/day/{date}/items/{itemId}", async (string date, string itemId, UpdateItemRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (!TryDate(date, out var d)) return Results.BadRequest(new { error = "Use a date like 2026-10-13." });
            var day = await LoadOrBuildDayAsync(cosmos, userId, d, ct);
            var target = day.items.FirstOrDefault(i => i.id == itemId);
            if (target is null) return Results.NotFound();
            var text = req.text is null ? target.text : req.text.Trim();
            if (text.Length == 0) return Results.BadRequest(new { error = "Type what the item is." });
            var limit = TextLimit(target.kind);
            if (text.Length > limit) text = text[..limit];
            var priority = req.priority is not null ? NormalisePriority(req.priority, null)
                : req.essential is not null ? (req.essential == true ? "essential" : (PriorityOf(target.essential, target.priority) == "low" ? "low" : "standard"))
                : PriorityOf(target.essential, target.priority);
            var essential = priority == "essential";
            day = day with { items = day.items.Select(i => i.id == itemId ? i with { text = text, essential = essential, priority = priority } : i).ToList(), updatedAt = DateTimeOffset.UtcNow.ToString("o") };
            await cosmos.GetContainer("routines").UpsertItemAsync(day, new PartitionKey(userId), cancellationToken: ct);
            if (target.source == "template")
            {
                var t = await LoadTemplateAsync(cosmos, userId, ct);
                if (t.items.Any(i => i.id == itemId))
                {
                    var tdoc = new TemplateDoc("template", userId, "template", t.sections,
                        t.items.Select(i => i.id == itemId ? i with { text = text, essential = essential, priority = priority } : i).ToList(), DateTimeOffset.UtcNow.ToString("o"));
                    await cosmos.GetContainer("routines").UpsertItemAsync(tdoc, new PartitionKey(userId), cancellationToken: ct);
                }
            }
            return Results.Ok(day);
        });

        // Remove an item from this day only, or (scope=template) from every future day as well.
        group.MapDelete("/day/{date}/items/{itemId}", async (string date, string itemId, string? scope, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (!TryDate(date, out var d)) return Results.BadRequest(new { error = "Use a date like 2026-10-13." });
            var day = await LoadOrBuildDayAsync(cosmos, userId, d, ct);
            day = day with
            {
                items = day.items.Where(i => i.id != itemId).ToList(),
                @checked = day.@checked.Where(kv => kv.Key != itemId).ToDictionary(kv => kv.Key, kv => kv.Value),
                values = day.values.Where(kv => kv.Key != itemId).ToDictionary(kv => kv.Key, kv => kv.Value),
                updatedAt = DateTimeOffset.UtcNow.ToString("o"),
            };
            await cosmos.GetContainer("routines").UpsertItemAsync(day, new PartitionKey(userId), cancellationToken: ct);
            if (scope == "template")
            {
                var t = await LoadTemplateAsync(cosmos, userId, ct);
                var tdoc = new TemplateDoc("template", userId, "template", t.sections, t.items.Where(i => i.id != itemId).ToList(), DateTimeOffset.UtcNow.ToString("o"));
                await cosmos.GetContainer("routines").UpsertItemAsync(tdoc, new PartitionKey(userId), cancellationToken: ct);
            }
            return Results.Ok(day);
        });

        // "Paste your list": the person has reviewed a preview on screen, and this saves it. Replaces the template or adds to it, then brings the given day in line.
        // Ticks and typed values already on that day are never lost. Other days are snapshots and are left alone.
        group.MapPost("/import", async (ImportRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (!TryDate(req.date ?? "", out var d)) return Results.BadRequest(new { error = "Use a date like 2026-10-13." });
            var current = await LoadTemplateAsync(cosmos, userId, ct);
            var (tdoc, newIds, error) = ApplyImport(userId, current, req);
            if (error is not null || tdoc is null) return Results.BadRequest(new { error });
            var container = cosmos.GetContainer("routines");
            await container.UpsertItemAsync(tdoc, new PartitionKey(userId), cancellationToken: ct);

            DayDoc? existing = null;
            try { existing = (await container.ReadItemAsync<DayDoc>("day:" + d.ToString("yyyy-MM-dd"), new PartitionKey(userId), cancellationToken: ct)).Resource; }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { }
            var day = ApplyImportToDay(existing, userId, tdoc, newIds, d, req.mode != "add");
            await container.UpsertItemAsync(day, new PartitionKey(userId), cancellationToken: ct);
            return Results.Ok(day);
        });

        // Put one section's items in a new order (drag and drop, or Move to top / up / down / bottom). Changes this day AND the template, so tomorrow follows it;
        // earlier days are snapshots and keep the order they had.
        group.MapPut("/day/{date}/order", async (string date, ReorderRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (!TryDate(date, out var d)) return Results.BadRequest(new { error = "Use a date like 2026-10-13." });
            var day = await LoadOrBuildDayAsync(cosmos, userId, d, ct);
            var section = (req.section ?? "").Trim();
            if (!day.sections.Contains(section)) return Results.BadRequest(new { error = "That section is not on this day." });

            var items = ReorderSection(day.items, i => i.section, i => i.id, section, req.ids ?? []);
            day = day with { items = items, updatedAt = DateTimeOffset.UtcNow.ToString("o") };
            await cosmos.GetContainer("routines").UpsertItemAsync(day, new PartitionKey(userId), cancellationToken: ct);

            var t = await LoadTemplateAsync(cosmos, userId, ct);
            var reordered = ReorderTemplate(t.items, items.Where(i => i.section == section).ToList());
            if (!reordered.Select(i => i.id).SequenceEqual(t.items.Select(i => i.id)))
            {
                var tdoc = new TemplateDoc("template", userId, "template", t.sections, reordered, DateTimeOffset.UtcNow.ToString("o"));
                await cosmos.GetContainer("routines").UpsertItemAsync(tdoc, new PartitionKey(userId), cancellationToken: ct);
            }
            return Results.Ok(day);
        });

        // Edit the categories (sections): rename, reorder, add, delete (moving a deleted category's items into another one). Applies to the template and to this day;
        // earlier days are snapshots and keep the names they had.
        group.MapPut("/day/{date}/sections", async (string date, SectionsRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (!TryDate(date, out var d)) return Results.BadRequest(new { error = "Use a date like 2026-10-13." });
            var day = await LoadOrBuildDayAsync(cosmos, userId, d, ct);
            var t = await LoadTemplateAsync(cosmos, userId, ct);

            var known = day.sections.Concat(t.sections).Distinct().ToList();
            var withItems = day.items.Select(i => i.section).Concat(t.items.Select(i => i.section)).ToHashSet();
            var (names, remap, error) = PlanSectionEdits(known, withItems, req);
            if (error is not null) return Results.BadRequest(new { error });

            string Map(string s) => remap.TryGetValue(s, out var n) ? n : s;
            var daySections = names.Concat(day.sections.Select(Map).Where(s => !names.Contains(s))).Distinct().ToList();
            var tplSections = names.Concat(t.sections.Select(Map).Where(s => !names.Contains(s))).Distinct().ToList();

            day = day with
            {
                sections = daySections,
                items = day.items.Select(i => i with { section = Map(i.section) }).ToList(),
                updatedAt = DateTimeOffset.UtcNow.ToString("o"),
            };
            var tdoc = new TemplateDoc("template", userId, "template", tplSections, t.items.Select(i => i with { section = Map(i.section) }).ToList(), DateTimeOffset.UtcNow.ToString("o"));
            await cosmos.GetContainer("routines").UpsertItemAsync(tdoc, new PartitionKey(userId), cancellationToken: ct);
            await cosmos.GetContainer("routines").UpsertItemAsync(day, new PartitionKey(userId), cancellationToken: ct);
            return Results.Ok(day);
        });

        // Which months the person has any opened days in (newest first), so the tree can show real history across years instead of a fixed calendar year.
        group.MapGet("/months", async (HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            var q = new QueryDefinition("SELECT VALUE c.date FROM c WHERE c.userId = @u AND c.type = 'day'").WithParameter("@u", userId);
            var dates = new List<string>();
            try
            {
                using var feed = cosmos.GetContainer("routines").GetItemQueryIterator<string>(q, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(userId) });
                while (feed.HasMoreResults) dates.AddRange(await feed.ReadNextAsync(ct));
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { }
            return Results.Ok(MonthsWithDays(dates));
        });

        // One line per opened day in a month, for the dots in the tree.
        group.MapGet("/month/{month}", async (string month, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (!System.Text.RegularExpressions.Regex.IsMatch(month, @"^\d{4}-(0[1-9]|1[0-2])$")) return Results.BadRequest(new { error = "Use a month like 2026-10." });
            var q = new QueryDefinition("SELECT * FROM c WHERE c.userId = @u AND c.type = 'day' AND STARTSWITH(c.date, @m)")
                .WithParameter("@u", userId).WithParameter("@m", month + "-");
            var days = new List<DayDoc>();
            try
            {
                using var feed = cosmos.GetContainer("routines").GetItemQueryIterator<DayDoc>(q, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(userId) });
                while (feed.HasMoreResults) days.AddRange(await feed.ReadNextAsync(ct));
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { }
            return Results.Ok(days.OrderByDescending(x => x.date).Select(Summary).ToList());
        });
    }

    // ---- shapes (lower-case names on purpose: they are also the stored JSON) ----
    public record RuleDto(int[]? weekdays, bool? lastDayOfMonth, string? label);
    /// <summary><c>priority</c> is essential, standard or low. <c>essential</c> is kept in step with it (true only for essential) so older documents and the progress counts keep working.</summary>
    public record TemplateItem(string id, string text, string section, string kind, bool essential, RuleDto? rule, string? priority = null);
    public record TemplateDoc(string id, string userId, string type, List<string> sections, List<TemplateItem> items, string updatedAt);
    public record DayItem(string id, string text, string section, string kind, bool essential, string? ruleLabel, string source, string? priority = null);
    public record DayDoc(string id, string userId, string type, string date, List<string> sections, List<DayItem> items,
        Dictionary<string, bool> @checked, Dictionary<string, string> values, string updatedAt);
    public record DaySummary(string date, int essentialsDone, int essentialsTotal, int done, int total);
    public record SummaryReply(bool exists, DaySummary summary);
    public record TemplateReply(List<string> sections, List<TemplateItem> items);
    public record TemplateRequest(List<string>? sections, List<TemplateItem>? items);
    public record StateRequest(Dictionary<string, bool>? @checked, Dictionary<string, string>? values);
    public record AddItemRequest(string? text, string? section, string? kind, bool? essential, string? scope, RuleDto? rule, string? priority = null);
    public record UpdateItemRequest(string? text, bool? essential, string? priority = null);
    public record ImportRequest(string? date, string? mode, List<string>? sections, List<TemplateItem>? items);
    public record ReorderRequest(string? section, List<string>? ids);
    /// <summary>One category in its new place: <c>was</c> is its current name (null for a brand-new one), <c>name</c> what it should now be called.</summary>
    public record SectionEdit(string? was, string? name);
    /// <summary>A category being deleted, and which category its items move to (required when it has items).</summary>
    public record SectionRemoval(string? was, string? moveTo);
    public record SectionsRequest(List<SectionEdit>? sections, List<SectionRemoval>? removed);

    /// <summary>check = a tick box, number = a tick plus a value, text = a note to write, read = a passage to read aloud with one tick.</summary>
    public static string NormaliseKind(string? kind) => kind is "number" or "text" or "read" or QotdKind ? kind : "check";

    /// <summary>An item that ticks itself when the person answers their Question of the Day (Francis, 2026-10-19). It cannot be ticked by hand: the tick is the answer.</summary>
    public const string QotdKind = "qotd";
    public static int TextLimit(string? kind) => kind == "read" ? MaxReadText : MaxText;

    /// <summary>essential, standard or low. A missing priority is essential when the old essential flag says so, otherwise standard.</summary>
    public static string NormalisePriority(string? priority, bool? essentialFlag)
    {
        var p = (priority ?? "").Trim().ToLowerInvariant();
        if (p is "essential" or "standard" or "low") return p;
        return essentialFlag == true ? "essential" : "standard";
    }
    public static string PriorityOf(bool essential, string? priority) => essential ? "essential" : NormalisePriority(priority, false);

    /// <summary>
    /// Which section an added item goes in. A name the day already has is used as it is; a name it does not have creates a new section (so "Evening" can be added on the spot);
    /// no name falls back to the first section. Returns the section, whether it is new, and an error when the page is already at its section limit.
    /// </summary>
    public static (string section, bool isNew, string? error) ResolveSection(IReadOnlyList<string> existing, string? requested)
    {
        var name = (requested ?? "").Trim();
        if (name.Length > 60) name = name[..60];
        if (name.Length == 0) return (existing.FirstOrDefault() ?? "Today", false, null);
        var match = existing.FirstOrDefault(s => string.Equals(s, name, StringComparison.OrdinalIgnoreCase));
        if (match is not null) return (match, false, null);
        if (existing.Count >= MaxSections) return ("", false, "That's the most sections one page can hold.");
        return (name, true, null);
    }

    /// <summary>
    /// Works out a category edit. <paramref name="current"/> are the existing category names and <paramref name="withItems"/> those that have items. Returns the new names in
    /// order, a map from every old name that changes (renamed, or deleted into another) to its new name, or an error to show the person. Categories the request does not
    /// mention are left as they are.
    /// </summary>
    public static (List<string> names, Dictionary<string, string> remap, string? error) PlanSectionEdits(
        IReadOnlyCollection<string> current, ISet<string> withItems, SectionsRequest req)
    {
        var empty = new Dictionary<string, string>();
        var names = new List<string>();
        foreach (var e in req.sections ?? [])
        {
            var n = (e.name ?? "").Trim();
            if (n.Length == 0) return ([], empty, "A category needs a name.");
            names.Add(n.Length > 60 ? n[..60] : n);
        }
        if (names.Count == 0) return ([], empty, "Keep at least one category.");
        if (names.Count != names.Distinct(StringComparer.OrdinalIgnoreCase).Count()) return ([], empty, "Two categories have the same name.");
        if (names.Count > MaxSections) return ([], empty, $"A routine holds up to {MaxSections} categories.");

        var remap = new Dictionary<string, string>();
        var edits = req.sections ?? [];
        for (var i = 0; i < edits.Count; i++)
        {
            var was = edits[i].was;
            if (was is not null && current.Contains(was) && was != names[i]) remap[was] = names[i];
        }
        foreach (var r in req.removed ?? [])
        {
            if (r.was is null || !current.Contains(r.was)) continue;
            if (names.Contains(r.was, StringComparer.Ordinal) && !remap.ContainsKey(r.was)) continue;   // it is still there under its own name
            var target = (r.moveTo ?? "").Trim();
            if (withItems.Contains(r.was) && target.Length == 0) return ([], empty, $"Choose where the items in \"{r.was}\" should go.");
            if (target.Length > 0)
            {
                var match = names.FirstOrDefault(n => string.Equals(n, target, StringComparison.OrdinalIgnoreCase));
                if (match is null) return ([], empty, "The items have to move to a category that is kept.");
                remap[r.was] = match;
            }
        }
        return (names, remap, null);
    }

    /// <summary>
    /// Puts the items of one section into the given order and leaves everything else exactly where it was: the section's items just trade places among the positions the
    /// section already occupied. Ids that are not in the section are ignored, and items the list forgot keep their relative order at the end.
    /// </summary>
    public static List<T> ReorderSection<T>(IReadOnlyList<T> items, Func<T, string> sectionOf, Func<T, string> idOf, string section, IReadOnlyList<string> orderedIds)
    {
        var slots = new List<int>();
        for (var i = 0; i < items.Count; i++) if (sectionOf(items[i]) == section) slots.Add(i);
        var inSection = slots.Select(i => items[i]).ToList();
        var byId = new Dictionary<string, T>();
        foreach (var it in inSection) byId.TryAdd(idOf(it), it);

        var ordered = new List<T>();
        var used = new HashSet<string>();
        foreach (var id in orderedIds) if (byId.TryGetValue(id, out var it) && used.Add(id)) ordered.Add(it);
        foreach (var it in inSection) if (!used.Contains(idOf(it))) { ordered.Add(it); used.Add(idOf(it)); }

        var result = items.ToList();
        for (var k = 0; k < slots.Count && k < ordered.Count; k++) result[slots[k]] = ordered[k];
        return result;
    }

    /// <summary>
    /// The template after a day's section has been reordered. Each day item is found in the template by id, or (for days built before ids were stable) by section and wording.
    /// The matched template items trade places among the positions they already held, so template items that are hidden today (an if-then item for another weekday)
    /// keep their place.
    /// </summary>
    public static List<TemplateItem> ReorderTemplate(IReadOnlyList<TemplateItem> items, IReadOnlyList<DayItem> orderedDayItems)
    {
        var used = new HashSet<int>();
        var matched = new List<int>();
        foreach (var d in orderedDayItems)
        {
            var idx = -1;
            for (var i = 0; i < items.Count && idx < 0; i++) if (!used.Contains(i) && items[i].id == d.id) idx = i;
            for (var i = 0; i < items.Count && idx < 0; i++)
                if (!used.Contains(i) && items[i].section == d.section && string.Equals(items[i].text.Trim(), d.text.Trim(), StringComparison.OrdinalIgnoreCase)) idx = i;
            if (idx >= 0) { used.Add(idx); matched.Add(idx); }
        }
        var slots = matched.OrderBy(x => x).ToList();
        var result = items.ToList();
        for (var k = 0; k < slots.Count; k++) result[slots[k]] = items[matched[k]];
        return result;
    }

    /// <summary>The distinct yyyy-MM months in a list of yyyy-MM-dd dates, newest first. Anything that is not a date is ignored.</summary>
    public static List<string> MonthsWithDays(IEnumerable<string?> dates) =>
        dates.Where(d => d is not null && TryDate(d, out _)).Select(d => d![..7]).Distinct().OrderByDescending(m => m, StringComparer.Ordinal).ToList();

    private static string? UserId(HttpContext ctx) => ctx.User.FindFirst("sub")?.Value is { Length: > 0 } s ? s : null;
    private static string NewId() => Guid.NewGuid().ToString("N")[..10];

    public static bool TryDate(string s, out DateOnly d) =>
        DateOnly.TryParseExact(s, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out d);

    /// <summary>Does this if-then rule cover that date? No rule, or a rule with no conditions, means every day. Weekdays are 0 = Sunday to 6 = Saturday.</summary>
    public static bool Applies(RuleDto? rule, DateOnly d)
    {
        if (rule is null) return true;
        var hasDays = rule.weekdays is { Length: > 0 };
        var hasLast = rule.lastDayOfMonth == true;
        if (!hasDays && !hasLast) return true;
        if (hasDays && rule.weekdays!.Contains((int)d.DayOfWeek)) return true;
        return hasLast && d.Day == DateTime.DaysInMonth(d.Year, d.Month);
    }

    public static RuleDto? CleanRule(RuleDto? r)
    {
        if (r is null) return null;
        var days = (r.weekdays ?? []).Where(x => x is >= 0 and <= 6).Distinct().OrderBy(x => x).ToArray();
        var last = r.lastDayOfMonth == true;
        if (days.Length == 0 && !last) return null;
        var label = string.IsNullOrWhiteSpace(r.label) ? null : r.label.Trim()[..Math.Min(r.label.Trim().Length, 40)];
        return new RuleDto(days.Length > 0 ? days : null, last ? true : null, label);
    }

    public static (List<string> sections, List<TemplateItem> items, string? error) Clean(List<string>? sections, List<TemplateItem>? items)
    {
        var secs = (sections ?? []).Select(s => (s ?? "").Trim()).Where(s => s.Length > 0).Select(s => s[..Math.Min(s.Length, 60)]).Distinct().ToList();
        if (secs.Count == 0) return ([], [], "Add at least one section.");
        if (secs.Count > MaxSections) return ([], [], "That's more sections than the page can hold.");
        var list = new List<TemplateItem>();
        foreach (var i in items ?? [])
        {
            var text = (i.text ?? "").Trim();
            if (text.Length == 0) continue;
            var section = secs.Contains(i.section ?? "") ? i.section! : secs[0];
            var id = string.IsNullOrWhiteSpace(i.id) || list.Any(x => x.id == i.id) ? NewId() : i.id;
            var kind = NormaliseKind(i.kind);
            var priority = NormalisePriority(i.priority, i.essential);
            list.Add(new TemplateItem(id, text[..Math.Min(text.Length, TextLimit(kind))], section, kind, priority == "essential", CleanRule(i.rule), priority));
        }
        if (list.Count > MaxItems) return ([], [], "That's more items than a routine can hold.");
        return (secs, list, null);
    }

    /// <summary>
    /// The template after "Paste your list": mode "add" appends to what the person has, anything else replaces it. Imported items always get fresh ids (never trusted from the
    /// client), so they cannot collide with existing ones. Returns the ids that are new so the day can be brought in line.
    /// </summary>
    public static (TemplateDoc? template, HashSet<string> newIds, string? error) ApplyImport(string userId, TemplateDoc current, ImportRequest req)
    {
        var incoming = (req.items ?? []).Select(i => i with { id = NewId() }).ToList();
        var (secs, items, error) = Clean(req.sections, incoming);
        if (error is not null) return (null, [], error);
        if (items.Count == 0) return (null, [], "There is nothing to import. Tick at least one item.");
        var newIds = items.Select(i => i.id).ToHashSet();

        var add = req.mode == "add";
        var mergedSections = add ? current.sections.Concat(secs).Distinct().ToList() : secs;
        var mergedItems = add ? current.items.Concat(items).ToList() : items;
        var (cleanSections, cleanItems, mergedError) = Clean(mergedSections, mergedItems);
        if (mergedError is not null) return (null, [], mergedError);
        return (new TemplateDoc("template", userId, "template", cleanSections, cleanItems, DateTimeOffset.UtcNow.ToString("o")), newIds, null);
    }

    /// <summary>
    /// A day after an import. "add": everything already on the day stays and the new items that apply are appended. "replace": the day becomes the new template's day,
    /// except that items the person has already ticked or typed into are kept (and their ticks), so nothing they entered this morning disappears.
    /// </summary>
    public static DayDoc ApplyImportToDay(DayDoc? existing, string userId, TemplateDoc t, HashSet<string> newIds, DateOnly d, bool replace)
    {
        var fresh = BuildDay(userId, d, t);
        if (existing is null) return fresh;
        var keep = replace
            ? existing.items.Where(i => existing.@checked.ContainsKey(i.id) || existing.values.ContainsKey(i.id)).ToList()
            : existing.items.ToList();
        var keepIds = keep.Select(i => i.id).ToHashSet();
        var added = fresh.items.Where(i => newIds.Contains(i.id) && !keepIds.Contains(i.id));
        var sections = t.sections.Concat(keep.Select(i => i.section)).Concat(existing.sections.Where(s => !replace)).Distinct().ToList();
        return existing with { sections = sections, items = keep.Concat(added).ToList(), updatedAt = DateTimeOffset.UtcNow.ToString("o") };
    }

    /// <summary>What a brand-new person starts with: plain, sensible, and theirs to change straight away. No health items are assumed.</summary>
    public static TemplateDoc DefaultTemplate(string userId)
    {
        var sections = new List<string> { "Morning", "Plan for today", "Check in", "Evening" };
        // Stable ids ("d1", "d2", ...): the default routine is rebuilt on every load until the person saves their own, and a day, an edit or a reorder must be able to find the
        // same item again by id. (With random ids a "remove from every day" or "move to top" on a default item could never match the template.)
        var n = 0;
        TemplateItem I(string text, string section, bool essential, string kind = "check", RuleDto? rule = null) => new("d" + (++n), text, section, kind, essential, rule, essential ? "essential" : "standard");
        var items = new List<TemplateItem>
        {
            I("A few minutes of quiet", "Morning", true),
            I("Make the bed and tidy my space", "Morning", true),
            I("Move or stretch for 5 minutes", "Morning", true),
            I("Something healthy to eat or drink", "Morning", false),
            I("Read something", "Morning", false),
            I("Choose my top three priorities", "Plan for today", true),
            I("Plan the week ahead", "Plan for today", false, "check", new RuleDto([0], null, "Sunday")),
            I("Three things I'm thankful for", "Check in", false, "text"),
            I("How do I feel right now?", "Check in", false, "text"),
            I("Evening gratitude", "Evening", false, "text"),
            I("Check tomorrow's calendar", "Evening", true),
            I("Prepare for tomorrow", "Evening", false),
        };
        return new TemplateDoc("template", userId, "template", sections, items, DateTimeOffset.UtcNow.ToString("o"));
    }

    private static async Task<TemplateDoc> LoadTemplateAsync(CosmosService cosmos, string userId, CancellationToken ct)
    {
        try
        {
            var r = await cosmos.GetContainer("routines").ReadItemAsync<TemplateDoc>("template", new PartitionKey(userId), cancellationToken: ct);
            return r.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return DefaultTemplate(userId);
        }
    }

    private static async Task<DayDoc> LoadOrBuildDayAsync(CosmosService cosmos, string userId, DateOnly d, CancellationToken ct, bool persist = true)
    {
        var date = d.ToString("yyyy-MM-dd");
        var container = cosmos.GetContainer("routines");
        try
        {
            var r = await container.ReadItemAsync<DayDoc>("day:" + date, new PartitionKey(userId), cancellationToken: ct);
            return await ApplyAutoTicksAsync(cosmos, userId, d, r.Resource, ct, persistIfChanged: true);
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { }

        var day = await ApplyAutoTicksAsync(cosmos, userId, d, BuildDay(userId, d, await LoadTemplateAsync(cosmos, userId, ct)), ct, persistIfChanged: false);
        if (persist) await container.UpsertItemAsync(day, new PartitionKey(userId), cancellationToken: ct);
        return day;
    }

    /// <summary>A day as it would be built from this template: only the items whose if-then rule covers the date.</summary>
    public static DayDoc BuildDay(string userId, DateOnly d, TemplateDoc t)
    {
        var date = d.ToString("yyyy-MM-dd");
        var items = t.items.Where(i => Applies(i.rule, d))
            .Select(i => new DayItem(i.id, i.text, i.section, i.kind, i.essential, i.rule?.label, "template", PriorityOf(i.essential, i.priority))).ToList();
        return new DayDoc("day:" + date, userId, "day", date, t.sections, items, new(), new(), DateTimeOffset.UtcNow.ToString("o"));
    }

    // ---- the self-ticking "answer my Question of the Day" item ----

    public static bool HasAutoItems(DayDoc d) => d.items.Any(i => i.kind == QotdKind);

    /// <summary>
    /// A day where every self-ticking item matches the real answer: ticked once today's Question of the Day has been answered, not ticked until then. A hand tick (or a stale one) never stands.
    /// Returns the same day object when nothing changes.
    /// </summary>
    public static DayDoc WithAutoTicks(DayDoc d, bool qotdAnswered)
    {
        var ids = d.items.Where(i => i.kind == QotdKind).Select(i => i.id).ToList();
        if (ids.Count == 0) return d;
        var ticks = new Dictionary<string, bool>(d.@checked);
        foreach (var id in ids) { if (qotdAnswered) ticks[id] = true; else ticks.Remove(id); }
        var same = ticks.Count == d.@checked.Count && ticks.Keys.All(d.@checked.ContainsKey);
        return same ? d : d with { @checked = ticks };
    }

    private record QotdProbe(string id, string? answeredAt);

    /// <summary>Whether the person has answered the Question of the Day for this date (the answer lives in the feed's own document: container "planning", id "qotd:{date}").</summary>
    private static async Task<bool> QotdAnsweredAsync(CosmosService cosmos, string userId, DateOnly d, CancellationToken ct)
    {
        try
        {
            var r = await cosmos.GetContainer("planning").ReadItemAsync<QotdProbe>("qotd:" + d.ToString("yyyy-MM-dd"), new PartitionKey(userId), cancellationToken: ct);
            return r.Resource.answeredAt is not null;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { return false; }
    }

    private static async Task<DayDoc> ApplyAutoTicksAsync(CosmosService cosmos, string userId, DateOnly d, DayDoc day, CancellationToken ct, bool persistIfChanged)
    {
        if (!HasAutoItems(day)) return day;   // only people who added the item pay for the extra read
        var updated = WithAutoTicks(day, await QotdAnsweredAsync(cosmos, userId, d, ct));
        if (persistIfChanged && !ReferenceEquals(updated, day))
            await cosmos.GetContainer("routines").UpsertItemAsync(updated, new PartitionKey(userId), cancellationToken: ct);
        return updated;
    }

    public static DaySummary Summary(DayDoc d)
    {
        // Text items are notes, not things to tick: only ticks and filled numbers count toward progress.
        bool Counted(DayItem i) => i.kind != "text";
        bool Done(DayItem i) => i.kind == "number" ? d.values.ContainsKey(i.id) || d.@checked.ContainsKey(i.id) : d.@checked.ContainsKey(i.id);
        var counted = d.items.Where(Counted).ToList();
        var ess = counted.Where(i => i.essential).ToList();
        return new DaySummary(d.date, ess.Count(Done), ess.Count, counted.Count(Done), counted.Count);
    }
}
