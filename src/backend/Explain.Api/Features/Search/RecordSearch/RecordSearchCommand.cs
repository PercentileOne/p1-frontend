using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Search.RecordSearch;

public record RecordSearchCommand(string UserId, string Subject, string? Category)
    : IRequest<Result<bool>>;
