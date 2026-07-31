using MediatR;
using Explain.Api.Common;
using Explain.Api.Features.Lessons.Generate;

namespace Explain.Api.Features.Lessons.Export;

public record ExportLessonCommand(
    string RecipientEmail,
    string RecipientName,
    LessonDto Lesson
) : IRequest<Result<ExportResultDto>>;

public record ExportResultDto(string Message);
