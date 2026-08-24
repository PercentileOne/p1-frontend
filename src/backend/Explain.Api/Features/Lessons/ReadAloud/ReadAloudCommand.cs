using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Lessons.ReadAloud;

public record ReadAloudCommand(string Text, string Gender) : IRequest<Result<ReadAloudDto>>;

public record ReadAloudChunkDto(string Text, string AudioUrl);

public record ReadAloudDto(List<ReadAloudChunkDto> Chunks);
