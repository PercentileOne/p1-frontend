using System.Net;
using Books = Explain.Api.Features.FeedBooks.Endpoint;

namespace Explain.Api.Tests;

// The feed's books strip (2026-10-19): reading an ISBN, what Open Library's answer must contain, and what a card is allowed to link to.
public class FeedBooksTests
{
    [Theory]
    [InlineData("9781449373320", "9781449373320")]
    [InlineData("978-1-4493-7332-0", "9781449373320")]
    [InlineData(" 978 1449373320 ", "9781449373320")]
    [InlineData("1449373321", "9781449373320")]          // the 10-digit form of the same book
    [InlineData("1-4493-7332-1", "9781449373320")]
    [InlineData("080442957X", "9780804429573")]           // ends in X
    [InlineData("080442957x", "9780804429573")]
    public void A_typed_ISBN_becomes_the_13_digit_one(string typed, string expected) => Assert.Equal(expected, Books.NormaliseIsbn(typed));

    [Theory]
    [InlineData("9781449373321")]    // wrong check digit
    [InlineData("1449373322")]       // wrong check digit
    [InlineData("12345")]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("97814493733AB")]
    [InlineData("978144937332000")]
    public void Anything_that_is_not_a_real_ISBN_is_refused(string? typed) => Assert.Null(Books.NormaliseIsbn(typed));

    [Fact]
    public void IsIsbn13_checks_length_digits_and_the_check_digit()
    {
        Assert.True(Books.IsIsbn13("9781449373320"));
        Assert.False(Books.IsIsbn13("9781449373321"));
        Assert.False(Books.IsIsbn13("978144937332"));
        Assert.False(Books.IsIsbn13(null));
    }

    private const string Good = """
        {"ISBN:9781449373320": {"url": "http://openlibrary.org/books/OL26780701M/Designing_Data-Intensive_Applications", "title": " Designing Data-Intensive Applications ",
         "authors": [{"name": "Martin Kleppmann"}, {"name": "martin kleppmann"}, {"name": "Someone Else"}],
         "cover": {"small": "https://covers.openlibrary.org/b/id/1-S.jpg", "medium": "https://covers.openlibrary.org/b/id/1-M.jpg", "large": "http://covers.openlibrary.org/b/id/1-L.jpg"}}}
        """;

    [Fact]
    public void A_good_answer_gives_the_title_authors_once_each_an_https_large_cover_and_the_book_page()
    {
        var r = Books.ReadOpenLibrary(HttpStatusCode.OK, Good, "9781449373320");
        Assert.Null(r.Error);
        Assert.Equal("Designing Data-Intensive Applications", r.Title);
        Assert.Equal("Martin Kleppmann, Someone Else", r.Authors);
        Assert.Equal("https://covers.openlibrary.org/b/id/1-L.jpg", r.CoverUrl);   // large preferred, and made https
        Assert.Equal("https://openlibrary.org/books/OL26780701M/Designing_Data-Intensive_Applications", r.PageUrl);
    }

    [Fact]
    public void An_ISBN_Open_Library_does_not_know_is_refused()
    {
        Assert.Contains("does not know", Books.ReadOpenLibrary(HttpStatusCode.OK, "{}", "9781449373320").Error);
    }

    [Fact]
    public void A_book_with_no_cover_is_refused_because_the_strip_is_made_of_covers()
    {
        var r = Books.ReadOpenLibrary(HttpStatusCode.OK, """{"ISBN:9781449373320": {"title": "A Book", "authors": [{"name": "A"}]}}""", "9781449373320");
        Assert.Contains("no cover", r.Error);
    }

    [Fact]
    public void A_book_with_no_title_is_refused()
    {
        var r = Books.ReadOpenLibrary(HttpStatusCode.OK, """{"ISBN:9781449373320": {"title": " ", "cover": {"medium": "https://covers.openlibrary.org/b/id/1-M.jpg"}}}""", "9781449373320");
        Assert.Contains("no title", r.Error);
    }

    [Fact]
    public void A_cover_or_page_on_another_host_is_never_used()
    {
        var body = """{"ISBN:9781449373320": {"title": "A Book", "url": "https://evil.example/books/1", "cover": {"large": "https://evil.example/x.jpg", "medium": "https://covers.openlibrary.org/b/id/1-M.jpg"}}}""";
        var r = Books.ReadOpenLibrary(HttpStatusCode.OK, body, "9781449373320");
        Assert.Null(r.Error);
        Assert.Equal("https://covers.openlibrary.org/b/id/1-M.jpg", r.CoverUrl);                 // the foreign large cover is skipped
        Assert.Equal("https://openlibrary.org/isbn/9781449373320", r.PageUrl);                   // the foreign page falls back to Open Library's own ISBN page
        var onlyForeign = Books.ReadOpenLibrary(HttpStatusCode.OK, """{"ISBN:9781449373320": {"title": "A", "cover": {"large": "https://evil.example/x.jpg"}}}""", "9781449373320");
        Assert.Contains("no cover", onlyForeign.Error);
    }

    [Fact]
    public void Cover_pictures_may_come_from_archive_org_which_hosts_Open_Library_covers()
    {
        var r = Books.ReadOpenLibrary(HttpStatusCode.OK, """{"ISBN:9781449373320": {"title": "A", "cover": {"large": "https://archive.org/download/x.jpg"}}}""", "9781449373320");
        Assert.Null(r.Error);
    }

    [Fact]
    public void A_failed_or_unreadable_answer_is_refused_in_plain_words()
    {
        Assert.Contains("did not answer", Books.ReadOpenLibrary(HttpStatusCode.InternalServerError, "", "9781449373320").Error);
        Assert.Contains("could not be read", Books.ReadOpenLibrary(HttpStatusCode.OK, "not json", "9781449373320").Error);
    }

    [Fact]
    public void Text_is_trimmed_collapsed_and_cut_to_its_limit()
    {
        Assert.Equal("a b c", Books.CleanText("  a   b\n c ", 50));
        Assert.Null(Books.CleanText("   ", 50));
        Assert.Null(Books.CleanText(null, 50));
        Assert.Equal("abcde", Books.CleanText("abcdefgh", 5));
    }

    private const string Search = """
        {"docs": [
          {"key": "/works/OL17930368W", "title": "Atomic Habits", "author_name": ["James Clear", "james clear", "A", "B", "C"], "cover_i": 12539702, "isbn": ["1847941834", "9781847941831", "9780735211292"]},
          {"key": "/works/OL1W", "title": "No cover", "isbn": ["9781449373320"]},
          {"key": "/works/OL2W", "title": "No usable isbn", "cover_i": 5, "isbn": ["1449373321", "9781449373321"]},
          {"key": "/works/OL3W", "title": "Only 979", "cover_i": 6, "isbn": ["9798664653403"]},
          {"key": "/books/evil", "title": "Bad key", "cover_i": 7, "isbn": ["9781449373320"]},
          {"key": "/works/OL4W", "title": "Atomic Habits again", "cover_i": 8, "isbn": ["9781847941831"]}
        ]}
        """;

    [Fact]
    public void Search_keeps_only_books_with_a_title_cover_and_valid_978_ISBN_listed_once()
    {
        var hits = Books.ReadSearch(Search);
        var hit = Assert.Single(hits);
        Assert.Equal("9781847941831", hit.id);
        Assert.Equal("Atomic Habits", hit.title);
        Assert.Equal("James Clear, A, B", hit.authors);                                             // once each, at most three
        Assert.Equal("https://covers.openlibrary.org/b/id/12539702-L.jpg", hit.coverUrl);          // built from the cover id
        Assert.Equal("https://openlibrary.org/works/OL17930368W", hit.url);
    }

    [Fact]
    public void Search_gives_no_results_for_an_unreadable_or_empty_answer()
    {
        Assert.Empty(Books.ReadSearch("not json"));
        Assert.Empty(Books.ReadSearch("{}"));
        Assert.Empty(Books.ReadSearch("""{"docs": "x"}"""));
    }

    [Fact]
    public void Search_returns_at_most_twelve_books()
    {
        var docs = string.Join(",", Enumerable.Range(0, 30).Select(i =>
        {
            var first12 = "978" + (100000000 + i).ToString();
            var sum = 0; for (var j = 0; j < 12; j++) sum += (first12[j] - '0') * (j % 2 == 0 ? 1 : 3);
            return $"{{\"key\":\"/works/OL{i}W\",\"title\":\"T{i}\",\"cover_i\":{i + 1},\"isbn\":[\"{first12}{(10 - sum % 10) % 10}\"]}}";
        }));
        Assert.Equal(Books.MaxSearchHits, Books.ReadSearch("{\"docs\":[" + docs + "]}").Count);
    }
}
