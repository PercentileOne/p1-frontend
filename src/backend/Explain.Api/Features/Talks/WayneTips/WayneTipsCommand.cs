using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Talks.WayneTips;

public record WayneTipsCommand(string Subject, bool IsPersonalStory) : IRequest<Result<WayneTipsDto>>;

public record WayneTipsDto(List<string> Tips);
