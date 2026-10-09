using Explain.Api.Features.AccessCodes;
using Codes = Explain.Api.Features.AccessCodes.Endpoint;

namespace Explain.Api.Tests;

// Invite codes (2026-10-09): how a typed code is read, and when it may be used.
public class AccessCodesTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 9, 12, 0, 0, TimeSpan.Zero);

    private static AccessCode Code(Func<AccessCode, AccessCode>? change = null)
    {
        var c = new AccessCode("XYZ123", "codes", "Chinaza", true, 5, 0, null, 30, Now, "admin", []);
        return change is null ? c : change(c);
    }

    [Theory]
    [InlineData("xyz123", "XYZ123")]
    [InlineData(" xyz-123 ", "XYZ123")]
    [InlineData("XYZ 123", "XYZ123")]
    [InlineData("abc", null)]          // too short
    [InlineData("", null)]
    [InlineData(null, null)]
    [InlineData("12345678901234567890123456789", null)] // too long
    public void A_typed_code_is_read_the_same_whatever_the_case_or_spacing(string? typed, string? expected) => Assert.Equal(expected, Codes.Normalise(typed));

    [Fact] public void A_fresh_code_can_be_used() => Assert.Null(Codes.CheckUsable(Code(), Now));
    [Fact] public void A_switched_off_code_cannot() => Assert.NotNull(Codes.CheckUsable(Code(c => c with { active = false }), Now));
    [Fact] public void An_expired_code_cannot() => Assert.NotNull(Codes.CheckUsable(Code(c => c with { expiresAt = Now.AddMinutes(-1) }), Now));
    [Fact] public void A_code_that_has_not_yet_expired_can() => Assert.Null(Codes.CheckUsable(Code(c => c with { expiresAt = Now.AddDays(3) }), Now));
    [Fact] public void A_code_used_up_cannot() => Assert.NotNull(Codes.CheckUsable(Code(c => c with { uses = 5 }), Now));
    [Fact] public void A_code_with_no_limit_never_runs_out() => Assert.Null(Codes.CheckUsable(Code(c => c with { maxUses = null, uses = 9999 }), Now));

    [Fact]
    public void A_code_needs_a_name_and_sensible_limits()
    {
        Assert.NotNull(Codes.Validate(new Codes.SaveRequest(null, "", null, null, null, null)).Error);
        Assert.NotNull(Codes.Validate(new Codes.SaveRequest(null, "Chinaza", null, 0, null, null)).Error);
        Assert.NotNull(Codes.Validate(new Codes.SaveRequest(null, "Chinaza", null, null, null, 0)).Error);
        Assert.Null(Codes.Validate(new Codes.SaveRequest(null, "  Chinaza  ", null, 5, null, 30)).Error);
        Assert.Equal("Chinaza", Codes.Validate(new Codes.SaveRequest(null, "  Chinaza  ", null, 5, null, 30)).Value!.Label);
    }
}
