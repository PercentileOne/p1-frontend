using Microsoft.Azure.Cosmos;
using Explain.Api.Features.PlatformStats;
using Explain.Api.Features.CareerNews;

namespace Explain.Api.Infrastructure.Cosmos;

public class CosmosService
{
    private Database _database = null!;
    private readonly CosmosClient _client;
    private readonly string _dbName;

    public CosmosService(IConfiguration config)
    {
        _client = new CosmosClient(config["Cosmos:Endpoint"], config["Cosmos:Key"]);
        _dbName = config["Cosmos:Database"] ?? "talktolearn";
    }

    public async Task InitialiseAsync()
    {
        var dbResponse = await _client.CreateDatabaseIfNotExistsAsync(_dbName);
        _database = dbResponse.Database;

        // Identity lives in SQL — profiles holds the flexible, schema-evolving user data.
        // Partition key = /userId so all reads for a user are single-partition.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("profiles", "/userId"));

        // Cached generated lessons — shared across all users; partition key = normalised subject.
        // One document per subject; avoids re-calling Anthropic for the same topic.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("lessons", "/pk"));

        // Name Bank — a personalised interviewer greeting clip, cached per {speaker}:{name}
        // and reused for every candidate who shares that first name. Shared across all users;
        // partition key = the same composite key as the document id (see Features/NameGreetings).
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("nameGreetings", "/pk"));

        // Global, platform-wide settings — deliberately narrow (one document per setting,
        // e.g. "nameBank"), not a general-purpose settings blob. First of its kind in this
        // codebase; every other toggle so far has been per-record, not global.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("platformSettings", "/pk"));

        // Per-user talk history — every scored session; partition key = /userId for efficient user queries.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("lessonHistory", "/userId"));

        // Every topic searched — feeds micro-subject intelligence and leaderboards.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("searches", "/pk"));

        // Platform-level course cache — shared across all users, 2-day TTL.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("courses", "/pk") { DefaultTimeToLive = 172800 });

        // Completed interview sessions — answers, scores, recording, share state.
        // Partition key = /candidateId so a candidate's own sessions are single-partition.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("interviews", "/candidateId"));

        // Completed "My Talks" sessions — same opaque-envelope shape as "interviews" above
        // (subject, transcript, scores, recording, share state all live in one sessionDataJson
        // blob), same partition key for the same reason: a candidate's own talks are
        // single-partition. See Features/Talks/Endpoint.cs.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("talks", "/candidateId"));

        // One document per candidate holding their whole pinned-TED-talks list as an array —
        // a small, bounded personal shelf, not a growing collection, so a single point read/
        // write per candidate is simpler than one document per pinned video. Partition key path
        // is /id since the document's own id IS the candidateId (see Features/Talks/TedTalks/
        // Endpoint.cs) — same "id = the partition value itself" pattern as a few other
        // single-document-per-user containers in this codebase.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("pinnedTalks", "/id"));

        // Recruiter-sent candidate interview preps. Partition key = /recruiterId so a
        // recruiter's own sent list is single-partition.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("interview-preps", "/recruiterId"));

        // Recruiter or candidate introducing a candidate's interview to an employer.
        // Partition key = /senderId so the sender's own sent list is single-partition;
        // the employer's received list and the public watch-by-id lookup are both
        // deliberately cross-partition (low volume, see Features/Introductions/Endpoint.cs).
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("introductions", "/senderId"));

        // Recruiter/employer talent alerts ("notify me when a candidate scores > 90% for
        // DevOps Lead") and the matches they've fired. Both partitioned by /ownerId so an
        // alert owner's own alerts and match history are single-partition; the matching
        // engine's "find every active alert" scan is the one deliberately cross-partition
        // query — see Features/Alerts/Endpoint.cs.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("alerts", "/ownerId"));
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("alertMatches", "/ownerId"));

        // Generic viewer reactions ("like") on any content type. Doc id is deterministic
        // {targetType}:{targetId}:{userId} so a toggle is a single idempotent upsert/delete —
        // no query-then-write race. Partition key = /targetId so all reactions on one
        // target (e.g. one profile) are single-partition, cheap to count.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("reactions", "/targetId"));

        // Comments left on a profile. Partition key = /profileUserId so a profile's own
        // comment thread is single-partition; the admin "reported across all profiles"
        // queue is the one deliberately cross-partition query — see Features/Comments/Admin/Endpoint.cs.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("profile-comments", "/profileUserId"));

        // One document per question asked in a live interview (every question, not just
        // "answer revealed" ones) — question text, the candidate's answer, score, and whether
        // they used "Tell Me The Answer" instead of answering. Flat and queryable by design,
        // unlike the "interviews" container above where the same data is buried inside one
        // opaque per-candidate sessionDataJson blob — this container exists specifically so
        // cross-candidate analysis (which questions get revealed most, score patterns, etc.)
        // doesn't need to deserialize every interview's JSON blob to answer a simple question.
        // Partition key = /candidateId, matching "interviews" above, for consistency — the
        // cross-candidate analysis queries this container exists for are deliberately
        // cross-partition; this is a low-volume analytics sink, not a hot read path.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("qaLog", "/candidateId"));

        // "In Demand Subjects" — one document per (job title, subject) pair, counters
        // incremented every time a candidate keeps that subject in the intake screen's
        // Special Focus field when actually starting an interview (never for a suggestion
        // they discarded, never just for viewing "What's Hot"). Partition key = /jobTitleKey
        // (normalised lowercase job title) so "every subject logged for this role" is a
        // single-partition read — the actual query this container exists to serve, for
        // reporting and for informing future interview-prompt design.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("inDemandSubjects", "/jobTitleKey"));

        // Admin-curated marketing stats ("80% of candidates feel unprepared for interviews —
        // LinkedIn, 2026") shown live across the marketing site and every portal, read from
        // one shared endpoint so updating a value once updates it everywhere instantly.
        // Small, hand-curated dataset (a handful of documents, ever) — single logical
        // partition is fine, same reasoning as platformSettings above.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("platformStats", "/pk"));

        // Candidates' own self-reported interview confidence, captured as a single optional
        // question on the intake screen (Francis, 2026-09-10) — the seed for turning the
        // marketing stats above into TheInterviewChair's own proprietary, continuously-growing
        // data instead of permanently quoting third-party research everyone else cites too.
        // Partition key = /countryCode: the stat this container exists to serve is "confidence
        // %, broken down by country", so a single country's responses landing in one partition
        // is the query this needs to be cheap, not an afterthought.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("confidenceSurvey", "/countryCode"));

        // Admin-manageable RSS feed sources for the real "Career Intelligence" panel
        // (Francis, 2026-09-10) — replaces a prior version that had an LLM invent headlines
        // and attribute them to real outlets. Small, hand-curated list — single logical
        // partition, same reasoning as platformStats above.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("newsFeedSources", "/pk"));

        // "My Career Coach" (Francis, 2026-09-11) — multiple named threads per candidate, each
        // a self-contained document with its own embedded messages array (same "opaque blob
        // per session" shape as the interviews container above, not a normalised messages
        // table) — a topic-scoped thread realistically never approaches Cosmos's 2MB document
        // limit, and this keeps "load one thread" a single-partition point read instead of a
        // paginated query. Partition key = /candidateId so "list my threads" is single-partition.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("careerCoachThreads", "/candidateId"));

        // Daily message-count backstop for the hard cap on My Career Coach (Francis: cost is
        // the real risk on an "unlimited" chat feature — every message is a fresh AI call, so
        // this is the one thing standing between normal use and unbounded spend). One tiny
        // document per candidate per day, id = "{candidateId}:{yyyy-MM-dd}", incremented
        // atomically per message — a separate counter rather than counting messages across a
        // candidate's threads on every send, which would mean re-reading every thread document
        // just to answer "how many did they send today". 2-day TTL: only today's (and
        // yesterday's, for safety around midnight boundaries) count ever matters.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("careerCoachUsage", "/candidateId") { DefaultTimeToLive = 172800 });

        // Dashboard "What People Are Studying" card (Francis, 2026-09-11) — one document per
        // studied topic (candidates type free-text course titles, so this is topic-keyed, not
        // role-keyed like inDemandSubjects above) with a running count, same single-partition
        // "cheap top-N read" shape as that container.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("learnTopics", "/pk"));

        // Dashboard "Your Profile Buzz" card — real view counters (likes already exist via the
        // reactions container above). Partition key = /candidateId: a candidate's own view count
        // is always a single-partition point read, and the increment-on-someone-else's-view
        // write only ever touches that one candidate's partition.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("profileViewCounters", "/candidateId"));

        // Dashboard "What Candidates Are Doing" card — real cross-candidate activity: which
        // roles people are actually interviewing for right now. One document per role with a
        // running count, same shape as inDemandSubjects/learnTopics above.
        await _database.CreateContainerIfNotExistsAsync(
            new ContainerProperties("roleActivity", "/pk"));

        await SeedPlatformStatsAsync();
        await SeedNewsFeedSourcesAsync();
    }

    // Only ever fires if the container is genuinely empty (a fresh environment, or the first
    // deploy after this shipped) — never overwrites an admin's own edits. Three deliberately
    // conservative choices, each with a real, checkable primary source, not the widest or most
    // dramatic number found during research (application/interview funnel figures vary 10x
    // across sources — see this feature's own PR description) — credibility matters more than
    // impact for numbers that are about to go on a public marketing page.
    private async Task SeedPlatformStatsAsync()
    {
        var container = _database.GetContainer("platformStats");
        var existing = container.GetItemQueryIterator<int>(
            new QueryDefinition("SELECT VALUE COUNT(1) FROM c"));
        var count = (await existing.ReadNextAsync()).FirstOrDefault();
        if (count > 0) return;

        var seed = new[]
        {
            new PlatformStatDoc(
                id: "unprepared-2026", pk: "stat",
                label: "of professionals feel unprepared to find a job",
                value: "80%",
                sourceLabel: "LinkedIn Global Research, 2026 — 19,000 professionals, 5 countries",
                sourceUrl: "https://blog.theinterviewguys.com/job-search-paradox/",
                breakdownLabel: null, breakdown: null,
                order: 1, active: true, updatedAt: DateTimeOffset.UtcNow),
            new PlatformStatDoc(
                id: "confidence-by-generation-2025", pk: "stat",
                label: "Interview confidence is a bigger struggle for some generations than others",
                value: "25.7%",
                sourceLabel: "iHire 2025 Multi-Generational Workforce Report",
                sourceUrl: "https://www.ihire.com/resourcecenter/employer/pages/inside-the-multi-generational-workforce-2025-report",
                breakdownLabel: "Said interview confidence was a real pain point, by generation",
                breakdown: new List<PlatformStatBreakdownItem>
                {
                    new("Millennials", "25.7%"),
                    new("Gen X", "23.7%"),
                    new("Gen Z", "20.8%"),
                    new("Baby Boomers", "18.8%"),
                },
                order: 2, active: true, updatedAt: DateTimeOffset.UtcNow),
            new PlatformStatDoc(
                id: "application-to-interview-rate", pk: "stat",
                label: "of job applications typically lead to an interview",
                value: "2–3%",
                sourceLabel: "Industry recruiting data (Ashby, Contentree) — varies by role and industry",
                sourceUrl: "https://standout-cv.com/stats/job-interview-statistics",
                breakdownLabel: null, breakdown: null,
                order: 3, active: true, updatedAt: DateTimeOffset.UtcNow),
        };

        foreach (var doc in seed)
            await container.UpsertItemAsync(doc, new PartitionKey("stat"));
    }

    // Per-item, not "only if the container is entirely empty" — new default feeds added here
    // in a later deploy (e.g. Sport, added same day on request) would otherwise silently never
    // seed for any environment that had already seeded the original set. Still never touches
    // an EXISTING id — an admin's own edit or a deliberate deactivation is never overwritten,
    // this only ever fills in ids that are missing entirely. Each is a publisher's own public
    // feed (verified reachable before writing this), not a third-party aggregator with usage
    // restrictions — see CareerNews/Endpoint.cs's own comment on why Google News RSS was
    // deliberately ruled out.
    private async Task SeedNewsFeedSourcesAsync()
    {
        var container = _database.GetContainer("newsFeedSources");
        var seed = new[]
        {
            new NewsFeedSourceDoc("bbc-news", "feed", "BBC News", "World", "http://feeds.bbci.co.uk/news/rss.xml", true, DateTimeOffset.UtcNow),
            new NewsFeedSourceDoc("sky-news", "feed", "Sky News", "World", "https://feeds.skynews.com/feeds/rss/home.xml", true, DateTimeOffset.UtcNow),
            new NewsFeedSourceDoc("indeed-hiring-lab", "feed", "Indeed Hiring Lab", "Careers", "https://www.hiringlab.org/feed/", true, DateTimeOffset.UtcNow),
            new NewsFeedSourceDoc("bbc-sport", "feed", "BBC Sport", "Sport", "http://feeds.bbci.co.uk/sport/rss.xml", true, DateTimeOffset.UtcNow),
            // Dashboard's "Startup & Business Pulse" card — same architecture, own section so it
            // never mixes into the Career Intelligence panel above. Every URL verified reachable
            // and returning real, recent <item> entries before being added here (2026-09-11).
            new NewsFeedSourceDoc("techcrunch-startups", "feed", "TechCrunch", "Startups", "https://techcrunch.com/category/startups/feed/", true, DateTimeOffset.UtcNow, section: "business"),
            new NewsFeedSourceDoc("crunchbase-news", "feed", "Crunchbase News", "Venture Capital", "https://news.crunchbase.com/feed/", true, DateTimeOffset.UtcNow, section: "business"),
            new NewsFeedSourceDoc("sifted", "feed", "Sifted", "European Tech", "https://sifted.eu/feed", true, DateTimeOffset.UtcNow, section: "business"),
            new NewsFeedSourceDoc("yc-blog", "feed", "Y Combinator", "Founders", "https://www.ycombinator.com/blog/rss", true, DateTimeOffset.UtcNow, section: "business"),
            new NewsFeedSourceDoc("fastcompany-startups", "feed", "Fast Company", "Business", "https://www.fastcompany.com/section/startups/rss", true, DateTimeOffset.UtcNow, section: "business"),
        };

        foreach (var doc in seed)
        {
            try
            {
                await container.ReadItemAsync<NewsFeedSourceDoc>(doc.id, new PartitionKey("feed"));
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                await container.CreateItemAsync(doc, new PartitionKey("feed"));
            }
        }
    }

    public Container GetContainer(string name) => _database.GetContainer(name);
}
