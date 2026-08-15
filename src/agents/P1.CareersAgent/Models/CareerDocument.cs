using System.Text.Json.Serialization;

namespace P1.CareersAgent.Models;

public class CareerDocument
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("subcategory")]
    public string Subcategory { get; set; } = string.Empty;

    [JsonPropertyName("aliases")]
    public List<string> Aliases { get; set; } = [];

    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = [];

    [JsonPropertyName("soc_uk")]
    public string? SocUk { get; set; }

    [JsonPropertyName("onet_us")]
    public string? OnetUs { get; set; }

    [JsonPropertyName("salary")]
    public SalaryData? Salary { get; set; }

    [JsonPropertyName("workforce")]
    public WorkforceData? Workforce { get; set; }

    [JsonPropertyName("demand")]
    public DemandData? Demand { get; set; }

    [JsonPropertyName("lifestyle")]
    public LifestyleData? Lifestyle { get; set; }

    [JsonPropertyName("identity")]
    public IdentityData? Identity { get; set; }

    [JsonPropertyName("pathway")]
    public PathwayData? Pathway { get; set; }

    [JsonPropertyName("salaryLastUpdated")]
    public string SalaryLastUpdated { get; set; } = string.Empty;

    [JsonPropertyName("lastUpdated")]
    public string LastUpdated { get; set; } = string.Empty;

    [JsonPropertyName("source")]
    public string Source { get; set; } = "agent-v1";

    [JsonPropertyName("confidence")]
    public double Confidence { get; set; } = 0.85;
}

public class SalaryData
{
    [JsonPropertyName("uk")]
    public SalaryRegion? Uk { get; set; }

    [JsonPropertyName("us")]
    public SalaryRegion? Us { get; set; }
}

public class SalaryRegion
{
    [JsonPropertyName("starting")]
    public int Starting { get; set; }

    [JsonPropertyName("mid")]
    public int Mid { get; set; }

    [JsonPropertyName("senior")]
    public int Senior { get; set; }

    [JsonPropertyName("expert")]
    public int Expert { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = string.Empty;
}

public class WorkforceData
{
    [JsonPropertyName("uk")]
    public WorkforceRegion? Uk { get; set; }

    [JsonPropertyName("us")]
    public WorkforceRegion? Us { get; set; }
}

public class WorkforceRegion
{
    [JsonPropertyName("employed")]
    public int Employed { get; set; }

    [JsonPropertyName("studying")]
    public int Studying { get; set; }

    [JsonPropertyName("growthPct5yr")]
    public double GrowthPct5yr { get; set; }

    [JsonPropertyName("growthTrend")]
    public string GrowthTrend { get; set; } = string.Empty;

    [JsonPropertyName("vacancies")]
    public int Vacancies { get; set; }
}

public class DemandData
{
    [JsonPropertyName("uk")]
    public int Uk { get; set; }

    [JsonPropertyName("us")]
    public int Us { get; set; }

    [JsonPropertyName("automationRisk")]
    public int AutomationRisk { get; set; }

    [JsonPropertyName("futureScore")]
    public int FutureScore { get; set; }

    [JsonPropertyName("trend")]
    public string Trend { get; set; } = string.Empty;
}

public class LifestyleData
{
    [JsonPropertyName("environment")]
    public string Environment { get; set; } = string.Empty;

    [JsonPropertyName("stress")]
    public int Stress { get; set; }

    [JsonPropertyName("energy")]
    public int Energy { get; set; }

    [JsonPropertyName("collaboration")]
    public int Collaboration { get; set; }

    [JsonPropertyName("remoteScore")]
    public int RemoteScore { get; set; }

    [JsonPropertyName("typicalHours")]
    public string TypicalHours { get; set; } = string.Empty;
}

public class IdentityData
{
    [JsonPropertyName("summary")]
    public string Summary { get; set; } = string.Empty;

    [JsonPropertyName("traits")]
    public List<string> Traits { get; set; } = [];

    [JsonPropertyName("strengths")]
    public List<string> Strengths { get; set; } = [];

    [JsonPropertyName("weaknesses")]
    public List<string> Weaknesses { get; set; } = [];
}

public class PathwayData
{
    [JsonPropertyName("entryRequirements")]
    public List<string> EntryRequirements { get; set; } = [];

    [JsonPropertyName("qualifications")]
    public List<string> Qualifications { get; set; } = [];

    [JsonPropertyName("skills")]
    public List<string> Skills { get; set; } = [];

    [JsonPropertyName("timeToJunior")]
    public string TimeToJunior { get; set; } = string.Empty;

    [JsonPropertyName("timeToMid")]
    public string TimeToMid { get; set; } = string.Empty;

    [JsonPropertyName("timeToSenior")]
    public string TimeToSenior { get; set; } = string.Empty;

    [JsonPropertyName("timeToExpert")]
    public string TimeToExpert { get; set; } = string.Empty;

    [JsonPropertyName("learningPath")]
    public List<string> LearningPath { get; set; } = [];
}
