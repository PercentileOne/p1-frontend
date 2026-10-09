using System.Net;
using System.Text.Json;
using Azure.Storage.Blobs;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Events.Admin;

/// <summary>
/// Admin-facing search/list over the hot (10-day) system event window — see Features/Events for
/// ingestion and Features/Events/EventsArchiveService.cs for what happens to older data. Deep
/// historical search over the permanent Blob archive is a deliberate v2 problem, not solved here.
///
/// Response shape matches Features/Users/List/Endpoint.cs's existing convention
/// ({ total, page, size, rows }) for consistency with the rest of the admin portal.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapGet("/api/admin/events", async (
            CosmosService cosmos,
            Explain.Api.Infrastructure.Geo.IpOwnerService owners,
            CancellationToken ct,
            string? userId, string? email, string? eventType, string? portal, string? q,
            DateTimeOffset? from, DateTimeOffset? to,
            string? sortBy, string? sortDir,
            int page = 1, int size = 50) =>
        {
            page = Math.Max(1, page);
            size = Math.Clamp(size, 1, 200);

            var container = cosmos.GetContainer("systemEvents");
            var (whereClause, parameters) = BuildFilter(userId, email, eventType, portal, q, from, to);
            var orderByClause = BuildOrderBy(sortBy, sortDir);

            var countQuery = new QueryDefinition($"SELECT VALUE COUNT(1) FROM c{whereClause}");
            foreach (var p in parameters) countQuery = countQuery.WithParameter(p.Name, p.Value);
            var total = 0;
            using (var countFeed = container.GetItemQueryIterator<int>(countQuery))
                if (countFeed.HasMoreResults) total = (await countFeed.ReadNextAsync()).FirstOrDefault();

            var rowsQuery = new QueryDefinition(
                $"SELECT * FROM c{whereClause}{orderByClause} OFFSET @offset LIMIT @limit")
                .WithParameter("@offset", (page - 1) * size)
                .WithParameter("@limit", size);
            foreach (var p in parameters) rowsQuery = rowsQuery.WithParameter(p.Name, p.Value);

            var rows = new List<SystemEventDoc>();
            using (var feed = container.GetItemQueryIterator<SystemEventDoc>(rowsQuery))
                while (feed.HasMoreResults)
                    rows.AddRange(await feed.ReadNextAsync());

            // Who owns each visitor's network (Francis, 2026-10-09: "is that a bot?"): a cloud/hosting/crawler owner is tagged so the Activity Log can mark it and hide it.
            // Same lookup the visitor funnel uses; if the ownership data is unavailable the tag is simply absent.
            var ownerOf = await owners.GetResolverAsync(ct);
            var tagged = rows.Select(r =>
            {
                var node = System.Text.Json.JsonSerializer.SerializeToNode(r, new JsonSerializerOptions(JsonSerializerDefaults.Web))!.AsObject();
                var o = ownerOf(r.ipAddress);
                node["ownerName"] = o?.Name;
                node["isMachine"] = o?.IsMachine ?? false;
                return node;
            }).ToList();
            return Results.Ok(new { total, page, size, rows = tagged });
        })
        .WithName("ListSystemEvents").WithTags("Events")
        // Matches Users/List/Endpoint.cs's own gate — CAN_VIEW_ADMIN_PORTAL, not the stricter
        // CAN_VIEW_SYSTEM_SETTINGS the original plan sketch assumed. Confirmed via the real DB
        // migration seed (20260731170031_AddRbacRolesAndPermissions.cs) that CAN_VIEW_SYSTEM_SETTINGS
        // is SuperAdmin-only, not granted to the plain Admin role — using it here would have
        // silently locked a regular Admin account (Francis's own, day to day) out of a page they
        // explicitly asked for. CAN_VIEW_ADMIN_PORTAL is confirmed granted to Admin and is the
        // baseline "can see admin-portal pages at all" gate every other read-only list here uses.
        .RequireAuthorization(Permissions.ViewAdminPortal);

        // GET /api/admin/events/funnel — "what do visitors actually do?" (Francis, 2026-09-26: lots of traffic, no sign-ups).
        // Reads the hot marketing-site events (Cosmos keeps 10 days) and answers, per visit (= sessionId): how many were real
        // people vs crawlers, how far they got, what they clicked, where they came from, phone vs desktop. "Real" = the visit
        // fired an `interaction` event (track.js only sends that after a trusted click/tap/key/scroll/mouse movement; crawlers
        // that just load the page never do). The candidate app's /try events are folded in so the phone "desktop only" wall shows up.
        app.MapGet("/api/admin/events/funnel", async (CosmosService cosmos, Explain.Api.Infrastructure.Geo.IpOwnerService owners, [Microsoft.AspNetCore.Mvc.FromServices] AnalyticsIgnoreList ignoreList, CancellationToken ct, IConfiguration config, int days = 7) =>
        {
            // days = 0 means "All" (Francis, 2026-10-04): everything ever recorded — the permanent blob archive plus whatever is newer than the last archive run.
            var all = days <= 0;
            days = all ? 0 : Math.Clamp(days, 1, 10);
            var container = cosmos.GetContainer("systemEvents");
            var from = all ? await ReadLastArchivedAtAsync(cosmos, ct) : DateTimeOffset.UtcNow.AddDays(-days).ToString("o");

            var marketing = new List<FunnelEvent>();
            var tryEvents = new List<FunnelEvent>();
            if (all) await LoadArchivedFunnelEventsAsync(config, marketing, tryEvents, ct);
            var q1 = new QueryDefinition("SELECT TOP 50000 c.sessionId, c.eventType, c.page, c.metadata, c.ipAddress, c.country, c.userAgent FROM c WHERE c.portal = 'marketing' AND c.createdAt > @from")
                .WithParameter("@from", from);
            using (var feed = container.GetItemQueryIterator<FunnelEvent>(q1))
                while (feed.HasMoreResults) marketing.AddRange(await feed.ReadNextAsync());

            var q2 = new QueryDefinition(
                "SELECT TOP 20000 c.sessionId, c.eventType, c.page, c.metadata, c.ipAddress, c.country, c.userAgent FROM c WHERE c.portal = 'candidate' AND c.createdAt > @from " +
                "AND (c.eventType IN ('try_mobile_visit','try_blocked_mobile','try_started','try_first_question','try_completed','try_blocked','try_answering','try_answer_submitted','try_left','try_register_click','try_email_score') " +
                "OR (c.eventType = 'page_view' AND c.page = '/try'))")
                .WithParameter("@from", from);
            using (var feed = container.GetItemQueryIterator<FunnelEvent>(q2))
                while (feed.HasMoreResults) tryEvents.AddRange(await feed.ReadNextAsync());

            // The owner's own addresses (Francis, 2026-09-26: "exclude all previous visits by me") — any visit that came from one of them is
            // left out, old and new alike, because this is applied when the numbers are calculated, not when events are stored.
            var ignored = await ignoreList.GetAsync();
            var excludedVisits = 0;
            if (ignored.Count > 0)
            {
                var before = marketing.Select(e => e.sessionId).Distinct().Count();
                marketing = DropSessionsFrom(marketing, ignored);
                tryEvents = DropSessionsFrom(tryEvents, ignored);
                excludedVisits = before - marketing.Select(e => e.sessionId).Distinct().Count();
            }

            // Who owns each visitor's network — lets the funnel tell people on home/mobile connections from crawlers and cloud servers.
            var ownerOf = await owners.GetResolverAsync(ct);
            return Results.Ok(new { funnel = BuildFunnel(days, marketing, tryEvents, ownerOf), ignoredIps = ignored.OrderBy(i => i).ToList(), excludedVisits });
        })
        .WithName("MarketingFunnel").WithTags("Events")
        .RequireAuthorization(Permissions.ViewAdminPortal);

        // Addresses whose visits the funnel leaves out. GET also returns the caller's own address so the screen can offer "add my current address".
        app.MapGet("/api/admin/events/ignored-ips", async (HttpContext ctx, [Microsoft.AspNetCore.Mvc.FromServices] AnalyticsIgnoreList ignoreList) =>
        {
            var ips = await ignoreList.GetAsync();
            return Results.Ok(new { ips = ips.OrderBy(i => i).ToList(), yourIp = ctx.Connection.RemoteIpAddress?.ToString() });
        })
        .WithName("GetIgnoredIps").WithTags("Events")
        .RequireAuthorization(Permissions.ViewAdminPortal);

        app.MapPost("/api/admin/events/ignored-ips", async (IgnoredIpsRequest req, HttpContext ctx, CosmosService cosmos, [Microsoft.AspNetCore.Mvc.FromServices] AnalyticsIgnoreList ignoreList) =>
        {
            var clean = new List<string>();
            foreach (var raw in req.Ips ?? [])
            {
                var t = raw?.Trim();
                if (string.IsNullOrEmpty(t)) continue;
                if (!IPAddress.TryParse(t, out var parsed)) return Results.BadRequest(new { error = $"\"{t}\" is not a valid IP address." });
                var normal = parsed.ToString();
                if (!clean.Contains(normal)) clean.Add(normal);
            }
            if (clean.Count > 20) return Results.BadRequest(new { error = "At most 20 addresses." });

            var setting = new AnalyticsIgnoreList.AnalyticsIgnoreSetting("analyticsIgnore", "analyticsIgnore", clean, DateTimeOffset.UtcNow, ctx.User.FindFirst("sub")?.Value ?? "unknown");
            await cosmos.GetContainer("platformSettings").UpsertItemAsync(setting, new PartitionKey("analyticsIgnore"));
            ignoreList.Invalidate();   // the event intake sees the new list straight away, not after the cache expires
            return Results.Ok(new { ips = clean.OrderBy(i => i).ToList(), yourIp = ctx.Connection.RemoteIpAddress?.ToString() });
        })
        .WithName("SetIgnoredIps").WithTags("Events")
        .RequireAuthorization(Permissions.ViewAdminPortal);

        // POST /api/admin/events/delete — remove activity records from the log (Francis, 2026-09-20: he wanted a
        // way to clear noise such as his own open browser tabs and test traffic). Two modes:
        //   • Items:  specific events the admin ticked/opened (id + sessionId, the container's partition key), max 500.
        //   • Filter: EVERY event matching the current search, but only if `expectedCount` equals the live match
        //             count — so what is deleted is exactly what the admin was shown and confirmed, never a different
        //             set because new events arrived or a filter changed in between. Max 5,000 per request.
        // Each deletion writes an `admin_events_deleted` audit event (who, how many, which filter) so the act of
        // deleting is itself never invisible. This only affects the hot Activity Log copy: events are also copied
        // to the permanent blob archive every few minutes (EventsArchiveService), and those archive copies and
        // the anonymous daily summary counters are deliberately left untouched.
        app.MapPost("/api/admin/events/delete", async (DeleteEventsRequest req, HttpContext ctx, CosmosService cosmos, ILogger<Program> logger) =>
        {
            var container = cosmos.GetContainer("systemEvents");
            var targets = new List<EventRef>();
            string mode;

            if (req.Items is { Count: > 0 })
            {
                if (req.Items.Count > MaxItemsPerRequest)
                    return Results.BadRequest(new { error = $"Select at most {MaxItemsPerRequest} events at a time." });
                mode = "selected";
                targets.AddRange(req.Items.Where(i => !string.IsNullOrWhiteSpace(i.Id) && !string.IsNullOrWhiteSpace(i.SessionId)));
            }
            else if (req.Filter is not null && req.ExpectedCount is not null)
            {
                mode = "matching-filter";
                var f = req.Filter;
                var (where, parameters) = BuildFilter(f.UserId, f.Email, f.EventType, f.Portal, f.Q, f.From, f.To);

                var countQuery = new QueryDefinition($"SELECT VALUE COUNT(1) FROM c{where}");
                foreach (var p in parameters) countQuery = countQuery.WithParameter(p.Name, p.Value);
                var live = 0;
                using (var countFeed = container.GetItemQueryIterator<int>(countQuery))
                    if (countFeed.HasMoreResults) live = (await countFeed.ReadNextAsync()).FirstOrDefault();

                if (live != req.ExpectedCount)
                    return Results.Conflict(new { error = $"The number of matching events changed (now {live}). Nothing was deleted — please review and confirm again.", actualCount = live });
                if (live > MaxMatchingPerRequest)
                    return Results.BadRequest(new { error = $"That would delete {live} events; the limit is {MaxMatchingPerRequest} per go. Narrow the search (for example by date) first." });

                var idQuery = new QueryDefinition($"SELECT c.id, c.sessionId FROM c{where}");
                foreach (var p in parameters) idQuery = idQuery.WithParameter(p.Name, p.Value);
                using var idFeed = container.GetItemQueryIterator<EventRef>(idQuery);
                while (idFeed.HasMoreResults) targets.AddRange(await idFeed.ReadNextAsync());
            }
            else
            {
                return Results.BadRequest(new { error = "Provide either items, or a filter with the expected count." });
            }

            var deleted = 0;
            foreach (var chunk in targets.Chunk(20))
            {
                var results = await Task.WhenAll(chunk.Select(async t =>
                {
                    try { await container.DeleteItemAsync<object>(t.Id, new PartitionKey(t.SessionId)); return true; }
                    catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { return false; } // already gone
                }));
                deleted += results.Count(r => r);
            }

            // Audit trail for the deletion itself.
            try
            {
                var actorId = ctx.User.FindFirst("sub")?.Value;
                var actorEmail = ctx.User.FindFirst("email")?.Value;
                var audit = new SystemEventDoc(
                    id: Guid.NewGuid().ToString(), sessionId: "admin-audit", userId: actorId, email: actorEmail, role: ctx.User.FindFirst("role")?.Value,
                    eventType: "admin_events_deleted", page: "/admin/activity-log", portal: "admin", ipAddress: ctx.Connection.RemoteIpAddress?.ToString(),
                    country: null, city: null, userAgent: null,
                    metadata: new Dictionary<string, object> { ["mode"] = mode, ["deleted"] = deleted, ["requested"] = targets.Count },
                    createdAt: DateTimeOffset.UtcNow.ToString("o"));
                await container.CreateItemAsync(audit, new PartitionKey(audit.sessionId));
            }
            catch (Exception ex) { logger.LogWarning(ex, "Could not write the audit event for an activity-log deletion."); }

            logger.LogWarning("Activity log: {Deleted} event(s) deleted by {Admin} ({Mode}).", deleted, ctx.User.FindFirst("email")?.Value, mode);
            return Results.Ok(new { deleted });
        })
        .WithName("DeleteSystemEvents").WithTags("Events")
        .RequireAuthorization(Permissions.ViewAdminPortal);
    }

    private const int MaxItemsPerRequest = 500;
    private const int MaxMatchingPerRequest = 5000;

    public record EventRef(string Id, string SessionId);
    public record EventFilter(string? UserId, string? Email, string? EventType, string? Portal, string? Q, DateTimeOffset? From, DateTimeOffset? To);
    public record DeleteEventsRequest(List<EventRef>? Items, EventFilter? Filter, int? ExpectedCount);

    public record IgnoredIpsRequest(List<string>? Ips);
    // Drops every visit (session) that has even one event from an ignored address.
    public static List<FunnelEvent> DropSessionsFrom(List<FunnelEvent> events, HashSet<string> ips)
    {
        var bad = events.Where(e => e.ipAddress is not null && ips.Contains(e.ipAddress)).Select(e => e.sessionId).ToHashSet();
        return bad.Count == 0 ? events : events.Where(e => !bad.Contains(e.sessionId)).ToList();
    }

    // Only the fields the funnel needs — keeps the read cheap (no IPs / user agents pulled back).
    // ── "All" (2026-10-04): the funnel over everything ever recorded ──────────────────────────────────────────────────────────────────────
    // Cosmos keeps only the last 10 days; EventsArchiveService copies every event to a permanent blob archive (one .jsonl file per run, one event per line)
    // every five minutes. "All" reads that archive plus the Cosmos events newer than the last archive run, so nothing is counted twice.
    private const int ArchiveEventCap = 600_000;   // a safety ceiling, far above today's volume

    private record ArchivedEvent(string? sessionId, string? eventType, string? page, string? portal, Dictionary<string, object>? metadata, string? ipAddress, string? country, string? userAgent = null);
    private record ArchiveStateRow(string id, string pk, string lastArchivedAt);

    private static async Task<string> ReadLastArchivedAtAsync(CosmosService cosmos, CancellationToken ct)
    {
        try
        {
            var resp = await cosmos.GetContainer("platformSettings").ReadItemAsync<ArchiveStateRow>("eventArchiveState", new PartitionKey("pk"), cancellationToken: ct);
            return resp.Resource.lastArchivedAt;
        }
        catch (Exception) { return DateTimeOffset.UtcNow.AddDays(-10).ToString("o"); }   // no archive yet: fall back to the hot window
    }

    private static readonly HashSet<string> TryFunnelEventTypes = ["try_mobile_visit", "try_blocked_mobile", "try_started", "try_first_question", "try_completed", "try_blocked", "try_answering", "try_answer_submitted", "try_left", "try_register_click", "try_email_score"];

    // Archive files never change once written, so each one is read and parsed ONCE and remembered in memory (about 800 small files / 2.5 MB today); later calls only fetch
    // files that are new. Files are fetched 16 at a time — reading them one by one was minutes of round-trips and made "All time" fail.
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, (List<FunnelEvent> Marketing, List<FunnelEvent> Try)> ArchiveCache = new();

    private static async Task LoadArchivedFunnelEventsAsync(IConfiguration config, List<FunnelEvent> marketing, List<FunnelEvent> tryEvents, CancellationToken ct)
    {
        var connectionString = config.GetConnectionString("BlobStorage");
        if (string.IsNullOrWhiteSpace(connectionString)) return;
        try
        {
            var container = new BlobContainerClient(connectionString, "system-events-archive");
            var names = new List<string>();
            await foreach (var blob in container.GetBlobsAsync(cancellationToken: ct)) names.Add(blob.Name);

            var gate = new SemaphoreSlim(16);
            await Task.WhenAll(names.Where(n => !ArchiveCache.ContainsKey(n)).Select(async name =>
            {
                await gate.WaitAsync(ct);
                try { ArchiveCache[name] = await ReadArchiveBlobAsync(container, name, ct); }
                catch (Exception) { /* skipped this time; retried on the next call */ }
                finally { gate.Release(); }
            }));

            var total = 0;
            foreach (var name in names.OrderBy(n => n, StringComparer.Ordinal))
            {
                if (!ArchiveCache.TryGetValue(name, out var parsed)) continue;
                marketing.AddRange(parsed.Marketing);
                tryEvents.AddRange(parsed.Try);
                total += parsed.Marketing.Count + parsed.Try.Count;
                if (total >= ArchiveEventCap) break;
            }
        }
        catch (Exception) { /* best-effort: whatever was read, plus the live events, still gives a useful funnel */ }
    }

    private static async Task<(List<FunnelEvent> Marketing, List<FunnelEvent> Try)> ReadArchiveBlobAsync(BlobContainerClient container, string name, CancellationToken ct)
    {
        var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var marketing = new List<FunnelEvent>();
        var tryEvents = new List<FunnelEvent>();
        using var stream = await container.GetBlobClient(name).OpenReadAsync(cancellationToken: ct);
        using var reader = new StreamReader(stream);
        string? line;
        while ((line = await reader.ReadLineAsync(ct)) is not null)
        {
            if (line.Length == 0) continue;
            ArchivedEvent? e;
            try { e = JsonSerializer.Deserialize<ArchivedEvent>(line, opts); } catch (JsonException) { continue; }
            if (e?.sessionId is null || e.eventType is null) continue;
            var fe = new FunnelEvent(e.sessionId, e.eventType, e.page, e.metadata, e.ipAddress, e.country, e.userAgent);
            if (e.portal == "marketing") marketing.Add(fe);
            else if (e.portal == "candidate" && (TryFunnelEventTypes.Contains(e.eventType) || (e.eventType == "page_view" && e.page == "/try"))) tryEvents.Add(fe);
        }
        return (marketing, tryEvents);
    }

    public record FunnelEvent(string sessionId, string eventType, string? page, Dictionary<string, object>? metadata, string? ipAddress = null, string? country = null, string? userAgent = null);

    private static string? Meta(FunnelEvent e, string key) =>
        e.metadata is not null && e.metadata.TryGetValue(key, out var v) ? v?.ToString() : null;

    /// <summary>
    /// Robots that name themselves (Francis, 2026-10-06: "the majority of them will say Bot"): Googlebot, bingbot, LinkedInBot, link-preview fetchers, headless browsers,
    /// scripts and uptime monitors. A visit whose user agent says so is a robot for certain, whatever else it did.
    /// </summary>
    internal static bool IsBotAgent(string? userAgent) =>
        !string.IsNullOrEmpty(userAgent) && BotAgentPattern.IsMatch(userAgent);

    private static readonly System.Text.RegularExpressions.Regex BotAgentPattern = new(
        @"bot|bot/|crawl|spider|slurp|scrap|headless|facebookexternalhit|facebot|embedly|bingpreview|google-read-aloud|lighthouse|gtmetrix|pingdom|uptime|monitor|"
        + @"python-requests|python-urllib|aiohttp|curl/|wget|go-http-client|libwww|httpclient|node-fetch|axios/|java/|apache-httpclient|phantomjs|puppeteer|playwright|selenium|"
        + @"preview|validator|ahrefs|semrush|mj12|dotbot|petalbot|bytespider|gptbot|claudebot|ccbot|yandex|baiduspider|duckduckbot|applebot|whatsapp|telegram|discord|skypeuripreview",
        System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Compiled);

    private static bool IsClick(FunnelEvent e) => e.eventType is "menu_click" or "cta_click" or "link_click";

    private static bool HrefHas(FunnelEvent e, params string[] needles)
    {
        var href = Meta(e, "href");
        return href is not null && needles.Any(n => href.Contains(n, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Turns raw marketing events into the funnel. Sessions are grouped by sessionId (one browser tab visit); the
    /// shared 'no-session-storage' id (browsers that block storage) is left out because it would merge unrelated people.
    /// </summary>
    public static object BuildFunnel(int days, List<FunnelEvent> marketing, List<FunnelEvent> tryEvents, Func<string?, Explain.Api.Infrastructure.Geo.IpOwner?>? ownerOf = null)
    {
        var sessions = marketing
            .Where(e => e.sessionId != "no-session-storage")
            .GroupBy(e => e.sessionId)
            .Select(g =>
            {
                var evs = g.ToList();
                var owner = ownerOf?.Invoke(evs.Select(e => e.ipAddress).FirstOrDefault(i => !string.IsNullOrEmpty(i)));
                var machine = owner?.IsMachine == true;
                var interacted = evs.Any(e => e.eventType == "interaction");
                // A robot we are SURE about (Francis, 2026-10-06: only discount people we are sure are robots, and "the majority of them will say Bot"): its user agent
                // says "bot" (or another robot or preview-fetcher name). Older stored events carry no user agent, so for those only, a cloud-network visit that never interacted is still
                // treated as a robot (the earlier rule). A visit from a company, university or VPN network that looks like a cloud server is otherwise NOT assumed to be a robot: it
                // counts as a person unless it says otherwise, so a recruiter at work is not thrown away.
                var agents = evs.Select(e => e.userAgent).ToList();
                // Also a sure robot (2026-10-07, seen live: a Frankfurt cloud address fetched /, /contact, /about, /imprint and /impressum in 20 seconds looking for contact
                // details): a cloud-network visit that loaded three or more different pages and never clicked, scrolled or moved a mouse.
                var distinctPages = evs.Where(e => e.eventType == "page_view").Select(e => e.page).Where(p => !string.IsNullOrEmpty(p)).Distinct().Count();
                var sureRobot = agents.Any(IsBotAgent)
                    || (agents.Count > 0 && agents.All(string.IsNullOrWhiteSpace) && machine && !interacted)
                    || (machine && !interacted && distinctPages >= 3);
                return new
                {
                    Machine = machine,
                    SureRobot = sureRobot,
                    OwnerName = owner?.Name,
                    Human = !sureRobot && interacted,
                    // Stayed on the page 5s+ (page_leave carries visible seconds) — see track.js; counted separately from Human.
                    Dwelled = !sureRobot && evs.Any(e => e.eventType == "page_leave" && double.TryParse(Meta(e, "sec"), out var sec) && sec >= 5),
                    // Company, university and VPN networks are routed through the same cloud servers crawlers use, so a real recruiter at work can look like a machine
                    // (Francis, 2026-10-05: hundreds of anonymous recruiters view his profile). Since 2026-10-06 such a visit counts as a person in the funnel as soon as it
                    // interacted (it is not a sure robot); this flag marks those visits in the machines table.
                    LikelyPerson = machine && !sureRobot,
                    Device = evs.Select(e => Meta(e, "dev")).FirstOrDefault(d => !string.IsNullOrEmpty(d)) ?? "unknown",
                    Src = evs.Select(e => Meta(e, "src")).FirstOrDefault(s => !string.IsNullOrEmpty(s)) ?? "direct",
                    Country = evs.Select(e => e.country).FirstOrDefault(c => !string.IsNullOrEmpty(c)) ?? "Unknown",
                    SawPricing = evs.Any(e => e.eventType == "section_view" && Meta(e, "section") == "pricing"),
                    Tried = evs.Any(e => e.eventType == "try_submit" || (IsClick(e) && HrefHas(e, "/try"))),
                    Signup = evs.Any(e => IsClick(e) && HrefHas(e, "/register", "/subscription", "login.theinterviewchair.com")),
                    Sections = evs.Where(e => e.eventType == "section_view").Select(e => Meta(e, "section")).Where(s => !string.IsNullOrEmpty(s)).Distinct().ToList(),
                    Clicks = evs.Where(IsClick).Select(e => (Type: e.eventType, Label: Meta(e, "label") ?? "", Area: Meta(e, "area") ?? "", Href: Meta(e, "href") ?? "")).ToList(),
                };
            })
            .ToList();

        var human = sessions.Where(s => s.Human).ToList();

        object Step(string key, string label, int n) => new { key, label, sessions = n };
        var steps = new[]
        {
            Step("visits", "Visits (everything that loaded a page)", sessions.Count),
            Step("people", "Visits from people (everything except robots we're sure of: crawlers, scanners, link previews)", sessions.Count(s => !s.SureRobot)),
            Step("looked", "Looked around (stayed 5+ seconds but didn't click, scroll or move a mouse)", sessions.Count(s => s.Dwelled && !s.Human)),
            Step("human", "Interacted (a person who clicked, tapped, scrolled or moved a mouse)", human.Count),
            Step("pricing", "Reached the pricing section", human.Count(s => s.SawPricing)),
            Step("tried", "Tried it live (typed a role or clicked Try it live)", human.Count(s => s.Tried)),
            Step("signup", "Clicked Register / Subscribe / Login", human.Count(s => s.Signup)),
        };

        var devices = new[] { "mobile", "desktop" }.Select(d => new
        {
            device = d,
            visits = sessions.Count(s => s.Device == d),
            people = sessions.Count(s => s.Device == d && !s.SureRobot),
            real = human.Count(s => s.Device == d),
            tried = human.Count(s => s.Device == d && s.Tried),
        });

        var sources = sessions.GroupBy(s => s.Src)
            .Select(g => new { source = g.Key, visits = g.Count(), people = g.Count(s => !s.SureRobot), real = g.Count(s => s.Human) })
            .OrderByDescending(x => x.people).ThenByDescending(x => x.visits).Take(10);

        // Where visitors are (2026-09-29): GA showed lots of US "users" that were really crawlers — here "real" is the same
        // interaction test as the rest of the funnel, so bot-heavy countries show up as many visits, few real.
        var countries = sessions.GroupBy(s => s.Country)
            .Select(g => new { country = g.Key, visits = g.Count(), people = g.Count(s => !s.SureRobot), looked = g.Count(s => s.Dwelled && !s.Human), real = g.Count(s => s.Human), tried = g.Count(s => s.Human && s.Tried) })
            .OrderByDescending(x => x.people).ThenByDescending(x => x.visits); // every country — worldwide, not just a top few

        // Who the machines are (Googlebot, Microsoft/LinkedIn previews, Amazon, Facebook…), by network owner.
        var machines = sessions.Where(s => s.Machine).GroupBy(s => s.OwnerName ?? "Unknown")
            .Select(g => new { owner = g.Key, visits = g.Count(), likelyPeople = g.Count(s => s.LikelyPerson) })
            .OrderByDescending(x => x.visits).Take(10);

        // Clicks: how many DIFFERENT real visitors clicked each thing (not raw click counts, so one person hammering a button counts once).
        var topClicks = human
            .SelectMany(s => s.Clicks.Select(c => (c.Type, c.Label, c.Area, c.Href)).Distinct())
            .GroupBy(c => c)
            .Select(g => new { type = g.Key.Type, label = g.Key.Label, area = g.Key.Area, href = g.Key.Href, visitors = g.Count() })
            .OrderByDescending(x => x.visitors).Take(20);

        var sections = human.SelectMany(s => s.Sections).GroupBy(x => x)
            .Select(g => new { section = g.Key, visitors = g.Count() })
            .OrderByDescending(x => x.visitors);

        var leaves = marketing.Where(e => e.eventType == "page_leave")
            .Select(e => double.TryParse(Meta(e, "sec"), out var s) ? s : (double?)null).Where(s => s is not null).Select(s => s!.Value).OrderBy(s => s).ToList();

        int TrySessions(string type) => tryEvents.Where(e => e.eventType == type).Select(e => e.sessionId).Distinct().Count();
        // "mobile":true is stamped on the demo's later steps by the candidate app (TryItLivePage) so phones can be compared with computers.
        int OnPhone(string type) => tryEvents.Where(e => e.eventType == type && string.Equals(Meta(e, "mobile"), "true", StringComparison.OrdinalIgnoreCase))
            .Select(e => e.sessionId).Distinct().Count();
        // Per-question drop-off inside the demo (try_answering / try_answer_submitted / try_left carry a "q" = question number).
        int TrySessionsAtQ(string type, string q) => tryEvents.Where(e => e.eventType == type && Meta(e, "q") == q).Select(e => e.sessionId).Distinct().Count();
        var byQuestion = new[] { "1", "2", "3" }.Select(q => new
        {
            q = int.Parse(q),
            answering = TrySessionsAtQ("try_answering", q),
            submitted = TrySessionsAtQ("try_answer_submitted", q),
            left = TrySessionsAtQ("try_left", q),
        }).ToList();
        var leftAt = tryEvents.Where(e => e.eventType == "try_left")
            .GroupBy(e => (Phase: Meta(e, "phase") ?? "?", Q: Meta(e, "q") ?? "?"))
            .Select(g => new { phase = g.Key.Phase, q = g.Key.Q, visitors = g.Select(e => e.sessionId).Distinct().Count() })
            .OrderByDescending(x => x.visitors).ToList();
        var tryPage = new
        {
            byQuestion,
            leftAt,
            visits = tryEvents.Where(e => e.eventType == "page_view").Select(e => e.sessionId).Distinct().Count(),
            // try_blocked_mobile is the old "desktop only" wall (until 2026-09-26) — still counted so earlier days show up.
            phoneVisits = tryEvents.Where(e => e.eventType is "try_mobile_visit" or "try_blocked_mobile").Select(e => e.sessionId).Distinct().Count(),
            started = TrySessions("try_started"),
            startedOnPhone = OnPhone("try_started"),
            firstQuestion = TrySessions("try_first_question"),
            completed = TrySessions("try_completed"),
            registerClicks = TrySessions("try_register_click"),
            emailCaptures = TrySessions("try_email_score"),
            completedOnPhone = OnPhone("try_completed"),
            blocked = TrySessions("try_blocked"),
        };

        return new
        {
            days,
            totalEvents = marketing.Count,
            steps,
            devices,
            sources,
            countries,
            machines,
            topClicks,
            sections,
            medianSecondsOnPage = leaves.Count == 0 ? (double?)null : leaves[leaves.Count / 2],
            tryPage,
        };
    }

    // Whitelisted, not interpolated from the raw query string — sortBy/sortDir feed directly
    // into a SQL clause, so an unrecognised value must fall back to the default rather than
    // ever reach the query string as-is.
    private static readonly Dictionary<string, string> SortableFields = new(StringComparer.OrdinalIgnoreCase)
    {
        ["createdAt"] = "c.createdAt",
        ["email"]     = "c.email",
        ["eventType"] = "c.eventType",
        ["page"]      = "c.page",
        ["portal"]    = "c.portal",
        ["country"]   = "c.country",
    };

    private static string BuildOrderBy(string? sortBy, string? sortDir)
    {
        var field = SortableFields.TryGetValue(sortBy ?? "", out var mapped) ? mapped : "c.createdAt";
        var dir = string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase) ? "ASC" : "DESC";
        return $" ORDER BY {field} {dir}";
    }

    private static (string WhereClause, List<(string Name, object Value)> Parameters) BuildFilter(
        string? userId, string? email, string? eventType, string? portal, string? q, DateTimeOffset? from, DateTimeOffset? to)
    {
        var clauses = new List<string>();
        var parameters = new List<(string, object)>();

        if (!string.IsNullOrWhiteSpace(userId))
        {
            clauses.Add("c.userId = @userId");
            parameters.Add(("@userId", userId.Trim()));
        }
        if (!string.IsNullOrWhiteSpace(email))
        {
            clauses.Add("CONTAINS(LOWER(c.email), @email)");
            parameters.Add(("@email", email.Trim().ToLowerInvariant()));
        }
        // Free-text "search anything" box (admin portal's ActivityLog.tsx) — ORs a CONTAINS
        // across every column the table actually displays (User/Event/Page/Portal/Location), so
        // typing "States" finds "United States" and "webhook" finds an eventType, all from one
        // box. "Anonymous" is not a real stored value — it's just how the UI labels a null email
        // (see ActivityLog.tsx's `e.email ?? 'Anonymous'`) — so a query that could plausibly be
        // short for "anonymous" (e.g. "Anony") also matches rows with no email, or the literal
        // typed text would silently return zero results for a value the user can see on screen.
        if (!string.IsNullOrWhiteSpace(q))
        {
            var needle = q.Trim().ToLowerInvariant();
            var orClauses = new List<string>
            {
                "CONTAINS(LOWER(c.email), @q)",
                "CONTAINS(LOWER(c.eventType), @q)",
                "CONTAINS(LOWER(c.page), @q)",
                "CONTAINS(LOWER(c.portal), @q)",
                "CONTAINS(LOWER(c.country), @q)",
                "CONTAINS(LOWER(c.city), @q)",
                "CONTAINS(c.ipAddress, @q)",
            };
            parameters.Add(("@q", needle));
            if ("anonymous".Contains(needle))
                orClauses.Add("(NOT IS_DEFINED(c.email) OR IS_NULL(c.email))");
            clauses.Add("(" + string.Join(" OR ", orClauses) + ")");
        }
        if (!string.IsNullOrWhiteSpace(eventType))
        {
            clauses.Add("c.eventType = @eventType");
            parameters.Add(("@eventType", eventType.Trim()));
        }
        if (!string.IsNullOrWhiteSpace(portal))
        {
            clauses.Add("c.portal = @portal");
            parameters.Add(("@portal", portal.Trim()));
        }
        if (from is not null)
        {
            clauses.Add("c.createdAt >= @from");
            parameters.Add(("@from", from.Value.ToString("o")));
        }
        if (to is not null)
        {
            clauses.Add("c.createdAt <= @to");
            parameters.Add(("@to", to.Value.ToString("o")));
        }

        var whereClause = clauses.Count == 0 ? "" : " WHERE " + string.Join(" AND ", clauses);
        return (whereClause, parameters);
    }
}
