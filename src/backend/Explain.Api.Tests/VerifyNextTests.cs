using Explain.Api.Features.Auth.Verify;

namespace Explain.Api.Tests;

// The "where were you going" page carried through the verification email (so subscribing works when you verify on another device).
// It must never become an open redirect: only the one known internal page is honoured.
public class VerifyNextTests
{
    [Fact] public void The_subscribe_page_is_honoured() => Assert.Equal("/subscription", Endpoint.SafeNext("/subscription"));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("/dashboard")]
    [InlineData("//evil.example")]
    [InlineData("https://evil.example/subscription")]
    [InlineData("/subscription?x=1")]
    [InlineData("/subscription/../admin")]
    public void Anything_else_is_ignored(string? next) => Assert.Null(Endpoint.SafeNext(next));
}
