using System.Linq;
using Newtonsoft.Json;

namespace Explain.Api.Domain.Profile;

public class UserProfile
{
    [JsonProperty("id")]
    public string Id { get; init; } = Guid.NewGuid().ToString();

    // Partition key = userId so all profile reads are single-partition lookups
    [JsonProperty("userId")]
    public string UserId { get; init; } = string.Empty;

    [JsonProperty("firstName")]
    public string FirstName { get; set; } = string.Empty;

    [JsonProperty("lastName")]
    public string LastName { get; set; } = string.Empty;

    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;

    [JsonProperty("username")]
    public string Username { get; set; } = string.Empty;

    [JsonProperty("bio")]
    public string Bio { get; set; } = string.Empty;

    [JsonProperty("jobRole")]
    public string? JobRole { get; set; }

    [JsonProperty("jobTitle")]
    public string? JobTitle { get; set; }

    [JsonProperty("company")]
    public string? Company { get; set; }

    [JsonProperty("interests")]
    public List<string> Interests { get; set; } = [];

    [JsonProperty("avatar")]
    public string? Avatar { get; set; }

    [JsonProperty("banner")]
    public string? Banner { get; set; }

    [JsonProperty("location")]
    public string? Location { get; set; }

    [JsonProperty("favouriteFilms")]
    public List<string> FavouriteFilms { get; set; } = [];

    [JsonProperty("projects")]
    public List<ProfileProject> Projects { get; set; } = [];

    [JsonProperty("commentsEnabled")]
    public bool CommentsEnabled { get; set; } = false;

    [JsonProperty("blockedUsers")]
    public List<BlockedUserRef> BlockedUsers { get; set; } = [];

    // Opt-in, off by default — gates ONLY discovery via candidate search
    // (Features/CandidateSearch). It does not gate GET /profile/{userId} itself —
    // a direct link (from an Alert match, an Introduction, etc.) still works
    // regardless, same as most "opt into search" features elsewhere.
    [JsonProperty("searchableByRecruiters")]
    public bool SearchableByRecruiters { get; set; } = false;

    [JsonProperty("phone")]
    public string? Phone { get; set; }

    // ── Candidate Search Phase 2 ────────────────────────────────────────────
    // "permanent" | "contract" | "either" | null (unset)
    [JsonProperty("employmentTypePreference")]
    public string? EmploymentTypePreference { get; set; }

    // "remote" | "hybrid" | "onsite" | "any" | null (unset)
    [JsonProperty("remotePreference")]
    public string? RemotePreference { get; set; }

    // Denormalized best-ever overallScore across all this candidate's interviews.
    // Null = never interviewed. Updated best-effort, ratchets upward only — see
    // Features/Interviews/Endpoint.cs's upload handler.
    [JsonProperty("bestScore")]
    public int? BestScore { get; set; }

    // Geocoded from Location server-side (Azure Maps) whenever it changes. Null until
    // the first successful geocode — candidates without it just fall back to plain-text
    // location search, never excluded from search entirely.
    [JsonProperty("locationGeo")]
    public GeoPoint? LocationGeo { get; set; }

    // Extracted from the same geocode response as LocationGeo — a cheap exact-match
    // filter that doesn't need a radius calculation.
    [JsonProperty("country")]
    public string? Country { get; set; }

    // The exact Location string LocationGeo/Country were last geocoded from, so
    // re-saving a profile without touching Location doesn't burn another Azure Maps call.
    [JsonProperty("locationGeocodedFrom")]
    public string? LocationGeocodedFrom { get; set; }

    // ── Journey / Self Architecture ───────────────────────────────────────────
    [JsonProperty("lifeStage")]
    public string? LifeStage { get; set; }

    [JsonProperty("dreamRoleTitle")]
    public string? DreamRoleTitle { get; set; }

    [JsonProperty("dreamRoleIndustry")]
    public string? DreamRoleIndustry { get; set; }

    [JsonProperty("dreamRoleSalary")]
    public string? DreamRoleSalary { get; set; }

    [JsonProperty("dreamRoleTimeline")]
    public string? DreamRoleTimeline { get; set; }

    [JsonProperty("updatedAt")]
    public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("O");

    [JsonProperty("createdAt")]
    public string CreatedAt { get; init; } = DateTime.UtcNow.ToString("O");

    public static UserProfile Create(string userId, string firstName, string lastName, string? jobRole = null) => new()
    {
        // Id must equal UserId — GetProfileHandler always reads by id=userId, and
        // without this the default `Id = Guid.NewGuid()` orphans the document:
        // every registration silently created a profile no GET could ever find.
        Id        = userId,
        UserId    = userId,
        FirstName = firstName,
        LastName  = lastName,
        Name      = $"{firstName} {lastName}".Trim(),
        Username  = $"{firstName}{lastName}".ToLower().Replace(" ", ""),
        JobRole   = jobRole,
    };
}

public class ProfileProject
{
    [JsonProperty("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [JsonProperty("title")]
    public string Title { get; set; } = string.Empty;

    // "current" | "past" | "future"
    [JsonProperty("status")]
    public string Status { get; set; } = "current";

    [JsonProperty("description")]
    public string Description { get; set; } = string.Empty;
}

// GeoJSON Point — this exact shape is what Cosmos's ST_DISTANCE() function expects.
public class GeoPoint
{
    [JsonProperty("type")]
    public string Type { get; set; } = "Point";

    // [longitude, latitude] — GeoJSON coordinate order, NOT lat/lng.
    [JsonProperty("coordinates")]
    public double[] Coordinates { get; set; } = [];
}

public class BlockedUserRef
{
    [JsonProperty("userId")]
    public string UserId { get; set; } = string.Empty;

    // Denormalized at block-time so the "blocked users" list never needs a lookup.
    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;

    [JsonProperty("blockedAt")]
    public string BlockedAt { get; set; } = DateTime.UtcNow.ToString("O");
}

// Trimmed projection returned by GET /profile/{userId} when viewing someone else's
// profile — never exposes Phone or the DreamRole* fields.
public class PublicProfile
{
    [JsonProperty("userId")]
    public string UserId { get; set; } = string.Empty;

    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;

    [JsonProperty("username")]
    public string Username { get; set; } = string.Empty;

    [JsonProperty("bio")]
    public string Bio { get; set; } = string.Empty;

    [JsonProperty("jobRole")]
    public string? JobRole { get; set; }

    [JsonProperty("jobTitle")]
    public string? JobTitle { get; set; }

    [JsonProperty("company")]
    public string? Company { get; set; }

    [JsonProperty("interests")]
    public List<string> Interests { get; set; } = [];

    [JsonProperty("avatar")]
    public string? Avatar { get; set; }

    [JsonProperty("banner")]
    public string? Banner { get; set; }

    [JsonProperty("location")]
    public string? Location { get; set; }

    [JsonProperty("commentsEnabled")]
    public bool CommentsEnabled { get; set; }

    [JsonProperty("employmentTypePreference")]
    public string? EmploymentTypePreference { get; set; }

    [JsonProperty("remotePreference")]
    public string? RemotePreference { get; set; }

    [JsonProperty("bestScore")]
    public int? BestScore { get; set; }

    [JsonProperty("country")]
    public string? Country { get; set; }

    public static PublicProfile From(UserProfile p) => new()
    {
        UserId = p.UserId,
        Name = p.Name,
        Username = p.Username,
        Bio = p.Bio,
        JobRole = p.JobRole,
        JobTitle = p.JobTitle,
        Company = p.Company,
        Interests = p.Interests,
        Avatar = p.Avatar,
        Banner = p.Banner,
        Location = p.Location,
        CommentsEnabled = p.CommentsEnabled,
        EmploymentTypePreference = p.EmploymentTypePreference,
        RemotePreference = p.RemotePreference,
        BestScore = p.BestScore,
        Country = p.Country,
    };
}

// Candidate Search result row — a STRICT SUBSET of PublicProfile's own field set,
// deliberately excluding DreamRole*/LifeStage even though PublicProfile already
// excludes them too (belt and braces: this projection must never widen beyond
// PublicProfile's existing boundary, so a future field added to one doesn't
// silently leak through the other).
public class CandidateSearchResult
{
    [JsonProperty("userId")]
    public string UserId { get; set; } = string.Empty;

    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;

    [JsonProperty("avatar")]
    public string? Avatar { get; set; }

    [JsonProperty("jobRole")]
    public string? JobRole { get; set; }

    [JsonProperty("jobTitle")]
    public string? JobTitle { get; set; }

    [JsonProperty("company")]
    public string? Company { get; set; }

    [JsonProperty("location")]
    public string? Location { get; set; }

    [JsonProperty("interests")]
    public List<string> Interests { get; set; } = [];

    [JsonProperty("projectsSummary")]
    public List<string> ProjectsSummary { get; set; } = [];

    [JsonProperty("employmentTypePreference")]
    public string? EmploymentTypePreference { get; set; }

    [JsonProperty("remotePreference")]
    public string? RemotePreference { get; set; }

    [JsonProperty("bestScore")]
    public int? BestScore { get; set; }

    [JsonProperty("country")]
    public string? Country { get; set; }

    public static CandidateSearchResult From(UserProfile p) => new()
    {
        UserId = p.UserId,
        Name = p.Name,
        Avatar = p.Avatar,
        JobRole = p.JobRole,
        JobTitle = p.JobTitle,
        Company = p.Company,
        Location = p.Location,
        Interests = p.Interests,
        ProjectsSummary = p.Projects.Select(pr => pr.Title).Where(t => !string.IsNullOrWhiteSpace(t)).ToList(),
        EmploymentTypePreference = p.EmploymentTypePreference,
        RemotePreference = p.RemotePreference,
        BestScore = p.BestScore,
        Country = p.Country,
    };
}
