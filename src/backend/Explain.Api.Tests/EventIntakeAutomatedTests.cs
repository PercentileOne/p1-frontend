using Events = Explain.Api.Features.Events.Endpoint;

namespace Explain.Api.Tests;

// The event intake leaves robots out of the sign-in portals' log (2026-10-21): only the recruiter, employer and admin portals, and only visitors who are not signed in.
public class EventIntakeAutomatedTests
{
    private const string Chrome = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

    [Theory]
    [InlineData("recruiter")]
    [InlineData("employer")]
    [InlineData("admin")]
    [InlineData("Employer")]
    [InlineData(" ADMIN ")]
    public void The_three_sign_in_portals_are_recognised_in_any_capitalisation(string portal) => Assert.True(Events.IsSignInPortal(portal));

    [Theory]
    [InlineData("candidate")]
    [InlineData("marketing")]
    [InlineData("")]
    [InlineData(null)]
    public void Other_portals_are_not_sign_in_portals(string? portal) => Assert.False(Events.IsSignInPortal(portal));

    [Fact]
    public void An_anonymous_visit_from_a_cloud_network_is_dropped_even_with_an_ordinary_browser_name()
        => Assert.True(Events.IsAutomatedPortalVisit("employer", signedIn: false, Chrome, isMachineNetwork: true));   // the Amazon scanners posing as Mac Chrome, Android Chrome and iPhone Safari

    [Theory]
    [InlineData("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")]
    [InlineData("python-requests/2.31")]
    [InlineData("HeadlessChrome/120.0")]
    public void An_anonymous_visit_that_names_itself_a_robot_is_dropped_whatever_its_network(string agent)
        => Assert.True(Events.IsAutomatedPortalVisit("admin", signedIn: false, agent, isMachineNetwork: false));

    [Fact]
    public void An_anonymous_person_on_an_ordinary_connection_is_kept()
        => Assert.False(Events.IsAutomatedPortalVisit("recruiter", signedIn: false, Chrome, isMachineNetwork: false));

    [Fact]
    public void A_signed_in_visit_is_never_dropped_even_from_a_cloud_network_or_a_robot_name()
    {
        Assert.False(Events.IsAutomatedPortalVisit("admin", signedIn: true, Chrome, isMachineNetwork: true));
        Assert.False(Events.IsAutomatedPortalVisit("admin", signedIn: true, "python-requests/2.31", isMachineNetwork: true));
    }

    [Theory]
    [InlineData("candidate")]
    [InlineData("marketing")]
    [InlineData(null)]
    public void Robots_on_the_marketing_site_and_candidate_portal_are_still_logged_because_the_funnel_reports_on_them(string? portal)
        => Assert.False(Events.IsAutomatedPortalVisit(portal, signedIn: false, "Googlebot/2.1", isMachineNetwork: true));
}
