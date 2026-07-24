using MediatR;
using TalkToLearn.Api.Common;

namespace TalkToLearn.Api.Features.Search.RecordSearch;

public record RecordSearchCommand(string UserId, string Subject, string? Category)
    : IRequest<Result<bool>>;
