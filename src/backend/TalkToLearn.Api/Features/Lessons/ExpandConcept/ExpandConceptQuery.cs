using MediatR;
using TalkToLearn.Api.Common;

namespace TalkToLearn.Api.Features.Lessons.ExpandConcept;

public record ExpandConceptQuery(string Subject, string ConceptTitle, string ConceptBody)
    : IRequest<Result<ExpansionDto>>;

public record ExpansionDto(
    string Headline,
    string Explanation,
    string Analogy,
    string AdvancedInsight,
    string? CodeSnippet,
    List<string> PracticalSteps,
    List<CommonQuestionDto> CommonQuestions
);

public record CommonQuestionDto(string Q, string A);
