using MediatR;
using TalkToLearn.Api.Common;
using TalkToLearn.Api.Features.Lessons.Generate;

namespace TalkToLearn.Api.Features.Lessons.Export;

public record ExportLessonCommand(
    string RecipientEmail,
    string RecipientName,
    LessonDto Lesson
) : IRequest<Result<ExportResultDto>>;

public record ExportResultDto(string Message);
