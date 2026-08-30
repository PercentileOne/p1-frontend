using Microsoft.Azure.Cosmos;

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
    }

    public Container GetContainer(string name) => _database.GetContainer(name);
}
