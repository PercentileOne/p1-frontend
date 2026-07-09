using MediatR;
using TalkToLearn.Api.Common;

namespace TalkToLearn.Api.Features.Lessons.Generate;

public record GenerateLessonCommand(string Subject, string UserId) : IRequest<Result<LessonDto>>;

public record LessonDto(
    string Title,
    string Subject,
    string Category,
    string Emoji,
    string Hook,
    List<KeyConceptDto> KeyConcepts,
    List<MisconceptionDto> Misconceptions,
    List<GlossaryItemDto> Glossary,
    List<string> ExamQuestions,
    List<MCQuestionDto> McQuestions
);

public record KeyConceptDto(
    string Icon,
    string Title,
    string Body,
    string DeepDive,
    string Example,
    string? CodeSnippet,
    string MemoryHook,
    string ExamTrap
);

public record MisconceptionDto(string Wrong, string Right);
public record GlossaryItemDto(string Term, string Def);
public record MCQuestionDto(string Q, List<string> Options, int Answer);
