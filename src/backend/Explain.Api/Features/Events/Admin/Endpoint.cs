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

            return Results.Ok(new { total, page, size, rows });
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
        app.MapGet("/api/admin/events/funnel", async (CosmosService cosmos, int days = 7) =>
        {
            days = Math.Clamp(days, 1, 10);
            var container = cosmos.GetContainer("systemEvents");
            var from = DateTimeOffset.UtcNow.AddDays(-days).ToString("o");

            var marketing = new List<FunnelEvent>();
            var q1 = new QueryDefinition("SELECT TOP 50000 c.sessionId, c.eventType, c.page, c.metadata FROM c WHERE c.portal = 'marketing' AND c.createdAt >= @from")
                .WithParameter("@from", from);
            using (var feed = container.GetItemQueryIterator<FunnelEvent>(q1))
                while (feed.HasMoreResults) marketing.AddRange(await feed.ReadNextAsync());

            var tryEvents = new List<FunnelEvent>();
            var q2 = new QueryDefinition(
                "SELECT TOP 20000 c.sessionId, c.eventType, c.page, c.metadata FROM c WHERE c.portal = 'candidate' AND c.createdAt >= @from " +
                "AND (c.eventType IN ('try_blocked_mobile','try_started','try_first_question','try_completed','try_blocked') " +
                "OR (c.eventType = 'page_view' AND c.page = '/try'))")
                .WithParameter("@from", from);
            using (var feed = container.GetItemQueryIterator<FunnelEvent>(q2))
                while (feed.HasMoreResults) tryEvents.AddRange(await feed.ReadNextAsync());

            return Results.Ok(BuildFunnel(days, marketing, tryEvents));
        })
        .WithName("MarketingFunnel").WithTags("Events")
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

    // Only the fields the funnel needs — keeps the read cheap (no IPs / user agents pulled back).
    public record FunnelEvent(string sessionId, string eventType, string? page, Dictionary<string, object>? metadata);

    private static string? Meta(FunnelEvent e, string key) =>
        e.metadata is not null && e.metadata.TryGetValue(key, out var v) ? v?.ToString() : null;

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
    private static object BuildFunnel(int days, List<FunnelEvent> marketing, List<FunnelEvent> tryEvents)
    {
        var sessions = marketing
            .Where(e => e.sessionId != "no-session-storage")
            .GroupBy(e => e.sessionId)
            .Select(g =>
            {
                var evs = g.ToList();
                return new
                {
                    Human = evs.Any(e => e.eventType == "interaction"),
                    Device = evs.Select(e => Meta(e, "dev")).FirstOrDefault(d => !string.IsNullOrEmpty(d)) ?? "unknown",
                    Src = evs.Select(e => Meta(e, "src")).FirstOrDefault(s => !string.IsNullOrEmpty(s)) ?? "direct",
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
            Step("human", "Real visitors (clicked, tapped, scrolled or moved a mouse)", human.Count),
            Step("pricing", "Reached the pricing section", human.Count(s => s.SawPricing)),
            Step("tried", "Tried it live (typed a role or clicked Try it live)", human.Count(s => s.Tried)),
            Step("signup", "Clicked Register / Subscribe / Login", human.Count(s => s.Signup)),
        };

        var devices = new[] { "mobile", "desktop" }.Select(d => new
        {
            device = d,
            visits = sessions.Count(s => s.Device == d),
            real = human.Count(s => s.Device == d),
            tried = human.Count(s => s.Device == d && s.Tried),
        });

        var sources = sessions.GroupBy(s => s.Src)
            .Select(g => new { source = g.Key, visits = g.Count(), real = g.Count(s => s.Human) })
            .OrderByDescending(x => x.real).ThenByDescending(x => x.visits).Take(10);

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
        var tryPage = new
        {
            visits = tryEvents.Where(e => e.eventType == "page_view").Select(e => e.sessionId).Distinct().Count(),
            blockedMobile = TrySessions("try_blocked_mobile"),
            started = TrySessions("try_started"),
            firstQuestion = TrySessions("try_first_question"),
            completed = TrySessions("try_completed"),
            blocked = TrySessions("try_blocked"),
        };

        return new
        {
            days,
            totalEvents = marketing.Count,
            steps,
            devices,
            sources,
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
