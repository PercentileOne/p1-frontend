using System.Net;
using System.Text.Json;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;
using VideoFeed = Explain.Api.Features.FeedVideos.Endpoint;

namespace Explain.Api.Features.FeedBooks;

/// <summary>
/// The feed's books strip (Francis, 2026-10-19; docs/specs/agent-driven-feed.md). A short list of real books, shown as a row of tall cover cards like the video strip. Nothing is copied or re-hosted:
/// a card shows the book's cover from Open Library's free cover service and links to the book's own Open Library page, where it can often be borrowed free. No shop links and no affiliate tag, so there
/// is nothing to disclose.
/// The verifier step is Open Library's own answer, asked when an admin adds a book by ISBN: the book must exist, have a title and have a cover picture. Title and cover come from Open Library;
/// an admin may write the author line and a short "why it is here" line (the reason is ours and the card says so). One Cosmos document per book (id = the ISBN-13), one partition.
/// A person's private "Want to read" list is kept in one small document in their own partition of the "planning" container.
/// </summary>
public static class Endpoint
{
    public const string ContainerName = "feedBooks";
    public const string Partition = "book";
    public const int MaxPublished = 200;
    public const int MaxMarks = 500;
    public const int MaxWhy = 200;
    public const int MaxAuthors = 160;
    private const string StateDocId = "feedbook-state";

    public static void Map(WebApplication app)
    {
        app.MapGet("/api/feed/books", async (CosmosService cosmos, CancellationToken ct) =>
        {
            var all = await ListAsync(cosmos, ct);
            return Results.Ok(all.Where(b => b.status == "published").OrderByDescending(b => b.addedAt).Take(MaxPublished).Select(ToReply));
        }).RequireAuthorization(Permissions.PracticeInterview).WithTags("FeedBooks");

        // A person's own "Want to read" list. Private to them.
        app.MapGet("/api/feed/books/me", async (HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            return Results.Ok(Marks(await LoadStateAsync(cosmos, userId, ct)));
        }).RequireAuthorization(Permissions.PracticeInterview).WithTags("FeedBooks");

        app.MapPut("/api/feed/books/{isbn}/saved", async (string isbn, MarkRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (!IsIsbn13(isbn)) return Results.NotFound();
            // Adding needs a book that is still showing; taking it off the list always works, so nobody is stuck holding a book that was pulled.
            if (req.On)
            {
                var book = await GetAsync(cosmos, isbn, ct);
                if (book is null || book.status != "published") return Results.NotFound();
            }
            var state = await LoadStateAsync(cosmos, userId, ct);
            var now = DateTimeOffset.UtcNow.ToString("o");
            var next = state with { saved = VideoFeed.SetMark(state.saved, isbn, req.On, now, MaxMarks), updatedAt = now };
            await cosmos.GetContainer("planning").UpsertItemAsync(next, new PartitionKey(userId), cancellationToken: ct);
            return Results.Ok(Marks(next));
        }).RequireAuthorization(Permissions.PracticeInterview).WithTags("FeedBooks");

        var admin = app.MapGroup("/api/admin/feed-books").RequireAuthorization(Permissions.ViewSystemSettings).WithTags("FeedBooks");

        admin.MapGet("", async (CosmosService cosmos, CancellationToken ct) =>
            Results.Ok((await ListAsync(cosmos, ct)).OrderByDescending(b => b.addedAt).Select(ToReply)));

        admin.MapPost("", async (AddRequest req, HttpContext ctx, CosmosService cosmos, IHttpClientFactory factory, CancellationToken ct) =>
        {
            var isbn = NormaliseIsbn(req.Isbn);
            if (isbn is null) return Results.BadRequest(new { error = "That is not a valid ISBN. Use the 10 or 13 digit number from the back of the book." });
            var theme = VideoFeed.CleanTheme(req.Theme);
            if (theme is null) return Results.BadRequest(new { error = "Choose a theme for the book." });
            if (await GetAsync(cosmos, isbn, ct) is not null) return Results.Conflict(new { error = "That book is already in the list." });

            var check = await VerifyAsync(factory.CreateClient(), isbn, ct);
            if (check.Error is not null) return Results.BadRequest(new { error = check.Error });

            var doc = new Book(isbn, Partition, check.Title!, CleanText(req.Authors, MaxAuthors) ?? check.Authors ?? "", check.CoverUrl!, check.PageUrl!, theme,
                CleanText(req.Why, MaxWhy) ?? "", "published", DateTimeOffset.UtcNow.ToString("o"), ctx.User.FindFirst("sub")?.Value ?? "unknown");
            await cosmos.GetContainer(ContainerName).UpsertItemAsync(doc, new PartitionKey(Partition), cancellationToken: ct);
            return Results.Ok(ToReply(doc));
        });

        admin.MapPatch("/{isbn}", async (string isbn, PatchRequest req, CosmosService cosmos, CancellationToken ct) =>
        {
            var doc = IsIsbn13(isbn) ? await GetAsync(cosmos, isbn, ct) : null;
            if (doc is null) return Results.NotFound();
            var next = doc with
            {
                status = req.Status is "published" or "hidden" ? req.Status : doc.status,
                theme = req.Theme is null ? doc.theme : VideoFeed.CleanTheme(req.Theme) ?? doc.theme,
                why = req.Why is null ? doc.why : CleanText(req.Why, MaxWhy) ?? "",
                authors = req.Authors is null ? doc.authors : CleanText(req.Authors, MaxAuthors) ?? doc.authors,
            };
            await cosmos.GetContainer(ContainerName).UpsertItemAsync(next, new PartitionKey(Partition), cancellationToken: ct);
            return Results.Ok(ToReply(next));
        });

        admin.MapDelete("/{isbn}", async (string isbn, CosmosService cosmos, CancellationToken ct) =>
        {
            if (!IsIsbn13(isbn)) return Results.NotFound();
            try { await cosmos.GetContainer(ContainerName).DeleteItemAsync<Book>(isbn, new PartitionKey(Partition), cancellationToken: ct); }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { /* already gone */ }
            return Results.NoContent();
        });
    }

    // ---- pure rules (tested) ----

    public static bool IsIsbn13(string? s) => s is { Length: 13 } && s.All(char.IsAsciiDigit) && Isbn13CheckDigit(s[..12]) == s[12] - '0';

    private static int Isbn13CheckDigit(string first12)
    {
        var sum = 0;
        for (var i = 0; i < 12; i++) sum += (first12[i] - '0') * (i % 2 == 0 ? 1 : 3);
        return (10 - sum % 10) % 10;
    }

    /// <summary>The ISBN-13 for a typed ISBN (10 or 13 digits, with or without hyphens or spaces), after checking its check digit. Anything else gives null.</summary>
    public static string? NormaliseIsbn(string? input)
    {
        var s = new string((input ?? "").Where(c => c is not ('-' or ' ')).ToArray()).ToUpperInvariant();
        if (s.Length == 13) return IsIsbn13(s) ? s : null;
        if (s.Length != 10 || !s[..9].All(char.IsAsciiDigit) || !(char.IsAsciiDigit(s[9]) || s[9] == 'X')) return null;
        var total = 0;
        for (var i = 0; i < 10; i++) total += (10 - i) * (s[i] == 'X' ? 10 : s[i] - '0');
        if (total % 11 != 0) return null;
        var twelve = "978" + s[..9];
        return twelve + Isbn13CheckDigit(twelve);
    }

    /// <summary>Trims, collapses spaces, and cuts to a limit. Null when nothing is left.</summary>
    public static string? CleanText(string? s, int max)
    {
        var t = System.Text.RegularExpressions.Regex.Replace((s ?? "").Trim(), @"\s+", " ");
        if (t.Length == 0) return null;
        return t.Length > max ? t[..max].TrimEnd() : t;
    }

    private static bool OpenLibraryHost(string? url, bool allowArchive, out Uri? uri)
    {
        uri = null;
        if (!Uri.TryCreate(url, UriKind.Absolute, out var u)) return false;
        if (u.Scheme is not ("http" or "https")) return false;
        var h = u.Host.ToLowerInvariant();
        if (h != "openlibrary.org" && !h.EndsWith(".openlibrary.org") && !(allowArchive && (h == "archive.org" || h.EndsWith(".archive.org")))) return false;
        uri = u;
        return true;
    }

    /// <summary>
    /// Turns Open Library's answer for one ISBN into the book, or a plain reason it cannot be used. The title and a cover picture are required (the strip is made of covers). Cover and page links must
    /// be on Open Library's own hosts and are made https, and authors are listed once each.
    /// </summary>
    public static (string? Title, string? Authors, string? CoverUrl, string? PageUrl, string? Error) ReadOpenLibrary(HttpStatusCode status, string body, string isbn)
    {
        if (status != HttpStatusCode.OK) return (null, null, null, null, "Open Library did not answer just now. Try again in a minute.");
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("ISBN:" + isbn, out var b) || b.ValueKind != JsonValueKind.Object)
                return (null, null, null, null, "Open Library does not know that ISBN.");
            var title = b.TryGetProperty("title", out var t) ? t.GetString() : null;
            if (string.IsNullOrWhiteSpace(title)) return (null, null, null, null, "Open Library has no title for that ISBN.");

            string? cover = null;
            if (b.TryGetProperty("cover", out var c) && c.ValueKind == JsonValueKind.Object)
                foreach (var size in new[] { "large", "medium" })
                    if (cover is null && c.TryGetProperty(size, out var u) && OpenLibraryHost(u.GetString(), allowArchive: true, out var cu)) cover = new UriBuilder(cu!) { Scheme = "https", Port = -1 }.Uri.ToString();
            if (cover is null) return (null, null, null, null, "Open Library has no cover picture for that edition, so it cannot be shown. Try another edition's ISBN.");

            string? page = null;
            if (b.TryGetProperty("url", out var p) && OpenLibraryHost(p.GetString(), allowArchive: false, out var pu)) page = new UriBuilder(pu!) { Scheme = "https", Port = -1 }.Uri.ToString();
            page ??= $"https://openlibrary.org/isbn/{isbn}";

            var names = new List<string>();
            if (b.TryGetProperty("authors", out var a) && a.ValueKind == JsonValueKind.Array)
                foreach (var author in a.EnumerateArray())
                    if (author.TryGetProperty("name", out var n) && n.GetString() is { } name && name.Trim().Length > 0 && !names.Contains(name.Trim(), StringComparer.OrdinalIgnoreCase)) names.Add(name.Trim());
            return (title.Trim(), string.Join(", ", names), cover, page, null);
        }
        catch (JsonException) { return (null, null, null, null, "Open Library's answer could not be read."); }
    }

    // ---- storage and shaping ----

    private static async Task<(string? Title, string? Authors, string? CoverUrl, string? PageUrl, string? Error)> VerifyAsync(HttpClient http, string isbn, CancellationToken ct)
    {
        try
        {
            http.Timeout = TimeSpan.FromSeconds(12);
            http.DefaultRequestHeaders.UserAgent.ParseAdd("TheInterviewChair-feed/1.0 (francis@percentile.one)");   // Open Library asks callers to say who they are
            using var res = await http.GetAsync($"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data", ct);
            return ReadOpenLibrary(res.StatusCode, await res.Content.ReadAsStringAsync(ct), isbn);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return (null, null, null, null, "Open Library did not answer just now. Try again in a minute.");
        }
    }

    private static string? UserId(HttpContext ctx) => ctx.User.FindFirst("sub")?.Value is { Length: > 0 } s ? s : null;

    private static async Task<BookState> LoadStateAsync(CosmosService cosmos, string userId, CancellationToken ct)
    {
        try { return (await cosmos.GetContainer("planning").ReadItemAsync<BookState>(StateDocId, new PartitionKey(userId), cancellationToken: ct)).Resource; }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { return new BookState(StateDocId, userId, StateDocId, [], DateTimeOffset.UtcNow.ToString("o")); }
    }

    private static async Task<Book?> GetAsync(CosmosService cosmos, string isbn, CancellationToken ct)
    {
        try { return (await cosmos.GetContainer(ContainerName).ReadItemAsync<Book>(isbn, new PartitionKey(Partition), cancellationToken: ct)).Resource; }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { return null; }
    }

    private static async Task<List<Book>> ListAsync(CosmosService cosmos, CancellationToken ct)
    {
        var list = new List<Book>();
        using var feed = cosmos.GetContainer(ContainerName).GetItemQueryIterator<Book>(new QueryDefinition("SELECT * FROM c"),
            requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(Partition) });
        while (feed.HasMoreResults) list.AddRange(await feed.ReadNextAsync(ct));
        return list;
    }

    private static BooksMarks Marks(BookState s) => new(s.saved.Select(m => m.id).ToList());
    public static BookReply ToReply(Book b) => new(b.id, b.title, b.authors, b.coverUrl, b.url, b.theme, b.why, b.status, b.addedAt);

    public record Book(string id, string pk, string title, string authors, string coverUrl, string url, string theme, string why, string status, string addedAt, string addedBy);
    public record BookReply(string id, string title, string authors, string coverUrl, string url, string theme, string why, string status, string addedAt);
    public record BookState(string id, string userId, string type, List<VideoFeed.Mark> saved, string updatedAt);
    public record BooksMarks(List<string> saved);
    public record MarkRequest(bool On);
    public record AddRequest(string Isbn, string Theme, string? Why = null, string? Authors = null);
    public record PatchRequest(string? Status, string? Theme, string? Why, string? Authors);
}
