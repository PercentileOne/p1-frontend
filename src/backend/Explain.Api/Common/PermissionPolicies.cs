using Microsoft.AspNetCore.Authorization;

namespace Explain.Api.Common;

/// <summary>
/// Registers one named authorization policy per permission code.
/// Each policy checks that the JWT contains a "perm" claim with the matching value.
///
/// Usage in an endpoint:
///   .RequireAuthorization(Permissions.StartInterview)
///
/// Adding a new permission: add a constant here — the policy is auto-registered
/// in AddPermissionPolicies() via reflection over the constants.
/// </summary>
public static class Permissions
{
    // Public / Careers
    public const string ViewCareers           = "CAN_VIEW_CAREERS";

    // Candidate
    public const string StartInterview        = "CAN_START_INTERVIEW";
    public const string PracticeInterview     = "CAN_PRACTICE_INTERVIEW";
    public const string ViewInterviewResults  = "CAN_VIEW_INTERVIEW_RESULTS";

    // Recruiter / Management
    public const string ManageInterviews      = "CAN_MANAGE_INTERVIEWS";
    public const string ViewCandidateProfile  = "CAN_VIEW_CANDIDATE_PROFILE";
    public const string ViewRecruiterPortal   = "CAN_VIEW_RECRUITER_PORTAL";
    public const string ViewAnalytics         = "CAN_VIEW_ANALYTICS";

    // Employer
    public const string ViewEmployerPortal    = "CAN_VIEW_EMPLOYER_PORTAL";

    // Admin
    public const string ViewAdminPortal       = "CAN_VIEW_ADMIN_PORTAL";
    public const string EditRoles             = "CAN_EDIT_ROLES";
    public const string ManageOrganisations   = "CAN_MANAGE_ORGANISATIONS";
    public const string ManageCareers         = "CAN_MANAGE_CAREERS";
    public const string ManageUsers           = "CAN_MANAGE_USERS";

    // Super Admin only
    public const string EditPermissions       = "CAN_EDIT_PERMISSIONS";
    public const string ViewSystemSettings    = "CAN_VIEW_SYSTEM_SETTINGS";
}

public static class AuthorizationExtensions
{
    /// <summary>
    /// Registers one policy per constant in <see cref="Permissions"/>.
    /// Each policy requires a JWT claim of type "perm" with the permission code as its value.
    /// </summary>
    public static IServiceCollection AddPermissionPolicies(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            // Enumerate every public string constant on Permissions and register a policy
            var codes = typeof(Permissions)
                .GetFields(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static)
                .Where(f => f.IsLiteral && f.FieldType == typeof(string))
                .Select(f => (string)f.GetRawConstantValue()!);

            foreach (var code in codes)
            {
                options.AddPolicy(code, policy =>
                    policy.RequireAuthenticatedUser()
                          .RequireClaim("perm", code));
            }
        });

        return services;
    }
}
