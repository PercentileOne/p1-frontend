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
            return Results.Ok(await LoadOrBuildDayAsync(cosmos, userId, d, ct));
        });

        // For the Dashboard card: today's progress WITHOUT creating the day, so people who never open My Routines are not given a stored document every morning.
        group.MapGet("/day/{date}/summary", async (string date, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (!TryDate(date, out var d)) return Results.BadRequest(new { error = "Use a date like 2026-10-13." });
            try
            {
                var r = await cosmos.GetContainer("routines").ReadItemAsync<DayDoc>("day:" + d.ToString("yyyy-MM-dd"), new PartitionKey(userId), cancellationToken: ct);
                return Results.Ok(new SummaryReply(true, Summary(r.Resource)));
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { }
            var t = await LoadTemplateAsync(cosmos, userId, ct);
            return Results.Ok(new SummaryReply(false, Summary(BuildDay(userId, d, t))));
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
            var saved = day with { @checked = checkedMap, values = values, updatedAt = DateTimeOffset.UtcNow.ToString("o") };
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
            if (text.Length > MaxText) text = text[..MaxText];
            var scope = req.scope is "always" or "rule" ? req.scope : "today";
            var kind = req.kind is "number" or "text" ? req.kind : "check";
            var rule = scope == "rule" ? CleanRule(req.rule) : null;
            if (scope == "rule" && rule is null) return Results.BadRequest(new { error = "Choose which days." });

            var day = await LoadOrBuildDayAsync(cosmos, userId, d, ct);
            if (day.items.Count >= MaxItems) return Results.BadRequest(new { error = "That's the most items one day can hold." });
            var section = day.sections.Contains(req.section ?? "") ? req.section! : day.sections.FirstOrDefault() ?? "Today";
            var id = NewId();
            var essential = req.essential == true;

            if (scope != "today")
            {
                var t = await LoadTemplateAsync(cosmos, userId, ct);
                if (t.items.Count >= MaxItems) return Results.BadRequest(new { error = "Your template is full." });
                var sections = t.sections.Contains(section) ? t.sections : t.sections.Append(section).ToList();
                var items = t.items.Append(new TemplateItem(id, text, section, kind, essential, rule)).ToList();
                var tdoc = new TemplateDoc("template", userId, "template", sections, items, DateTimeOffset.UtcNow.ToString("o"));
                await cosmos.GetContainer("routines").UpsertItemAsync(tdoc, new PartitionKey(userId), cancellationToken: ct);
            }
            // The rule item only shows today if the rule covers today; "just for today" and "every day" always do.
            if (scope != "rule" || Applies(rule, d))
            {
                var items = day.items.Append(new DayItem(id, text, section, kind, essential, rule?.label, scope == "today" ? "today" : "template")).ToList();
                day = day with { items = items, updatedAt = DateTimeOffset.UtcNow.ToString("o") };
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
            if (text.Length > MaxText) text = text[..MaxText];
            var essential = req.essential ?? target.essential;
            day = day with { items = day.items.Select(i => i.id == itemId ? i with { text = text, essential = essential } : i).ToList(), updatedAt = DateTimeOffset.UtcNow.ToString("o") };
            await cosmos.GetContainer("routines").UpsertItemAsync(day, new PartitionKey(userId), cancellationToken: ct);
            if (target.source == "template")
            {
                var t = await LoadTemplateAsync(cosmos, userId, ct);
                if (t.items.Any(i => i.id == itemId))
                {
                    var tdoc = new TemplateDoc("template", userId, "template", t.sections,
                        t.items.Select(i => i.id == itemId ? i with { text = text, essential = essential } : i).ToList(), DateTimeOffset.UtcNow.ToString("o"));
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
    public record TemplateItem(string id, string text, string section, string kind, bool essential, RuleDto? rule);
    public record TemplateDoc(string id, string userId, string type, List<string> sections, List<TemplateItem> items, string updatedAt);
    public record DayItem(string id, string text, string section, string kind, bool essential, string? ruleLabel, string source);
    public record DayDoc(string id, string userId, string type, string date, List<string> sections, List<DayItem> items,
        Dictionary<string, bool> @checked, Dictionary<string, string> values, string updatedAt);
    public record DaySummary(string date, int essentialsDone, int essentialsTotal, int done, int total);
    public record SummaryReply(bool exists, DaySummary summary);
    public record TemplateReply(List<string> sections, List<TemplateItem> items);
    public record TemplateRequest(List<string>? sections, List<TemplateItem>? items);
    public record StateRequest(Dictionary<string, bool>? @checked, Dictionary<string, string>? values);
    public record AddItemRequest(string? text, string? section, string? kind, bool? essential, string? scope, RuleDto? rule);
    public record UpdateItemRequest(string? text, bool? essential);

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
            var kind = i.kind is "number" or "text" ? i.kind : "check";
            list.Add(new TemplateItem(id, text[..Math.Min(text.Length, MaxText)], section, kind, i.essential, CleanRule(i.rule)));
        }
        if (list.Count > MaxItems) return ([], [], "That's more items than a routine can hold.");
        return (secs, list, null);
    }

    /// <summary>What a brand-new person starts with: plain, sensible, and theirs to change straight away. No health items are assumed.</summary>
    public static TemplateDoc DefaultTemplate(string userId)
    {
        var sections = new List<string> { "Morning", "Plan for today", "Check in" };
        TemplateItem I(string text, string section, bool essential, string kind = "check", RuleDto? rule = null) => new(NewId(), text, section, kind, essential, rule);
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

    private static async Task<DayDoc> LoadOrBuildDayAsync(CosmosService cosmos, string userId, DateOnly d, CancellationToken ct)
    {
        var date = d.ToString("yyyy-MM-dd");
        var container = cosmos.GetContainer("routines");
        try
        {
            var r = await container.ReadItemAsync<DayDoc>("day:" + date, new PartitionKey(userId), cancellationToken: ct);
            return r.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { }

        var day = BuildDay(userId, d, await LoadTemplateAsync(cosmos, userId, ct));
        await container.UpsertItemAsync(day, new PartitionKey(userId), cancellationToken: ct);
        return day;
    }

    /// <summary>A day as it would be built from this template: only the items whose if-then rule covers the date.</summary>
    public static DayDoc BuildDay(string userId, DateOnly d, TemplateDoc t)
    {
        var date = d.ToString("yyyy-MM-dd");
        var items = t.items.Where(i => Applies(i.rule, d))
            .Select(i => new DayItem(i.id, i.text, i.section, i.kind, i.essential, i.rule?.label, "template")).ToList();
        return new DayDoc("day:" + date, userId, "day", date, t.sections, items, new(), new(), DateTimeOffset.UtcNow.ToString("o"));
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
