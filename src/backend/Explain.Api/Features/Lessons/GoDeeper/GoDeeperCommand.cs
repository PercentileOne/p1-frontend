using MediatR;
using Explain.Api.Common;
using Explain.Api.Features.Lessons.Generate;

namespace Explain.Api.Features.Lessons.GoDeeper;

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
