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
    }

    public Container GetContainer(string name) => _database.GetContainer(name);
}
