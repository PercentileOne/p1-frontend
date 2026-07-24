using MediatR;
using TalkToLearn.Api.Common;
using TalkToLearn.Api.Features.Lessons.Generate;

namespace TalkToLearn.Api.Features.Lessons.GoDeeper;

public record GoDeeperCommand(
    string Subject,
    string Category,
    List<string> ExistingConceptTitles
) : IRequest<Result<GoDeeperDto>>;

public record GoDeeperDto(
    List<KeyConceptDto> NewConcepts,
    List<GlossaryItemDto> NewGlossaryTerms,
    List<string> NewExamQuestions
);
