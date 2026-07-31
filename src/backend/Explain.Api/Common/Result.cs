namespace Explain.Api.Common;

public class Result<T>
{
    public T?     Value     { get; }
    public string? Error    { get; }
    public int    StatusCode { get; }
    public bool   IsSuccess  => Error is null;

    private Result(T value)                    { Value = value; StatusCode = 200; }
    private Result(string error, int status)   { Error = error; StatusCode = status; }

    public static Result<T> Success(T value)                       => new(value);
    public static Result<T> Failure(string error, int status = 400) => new(error, status);

    // Convenience — map result to an IResult for minimal API endpoints
    public IResult ToHttpResult() => IsSuccess
        ? Results.Ok(Value)
        : StatusCode switch
        {
            401 => Results.Unauthorized(),
            404 => Results.NotFound(new { error = Error }),
            409 => Results.Conflict(new { error = Error }),
            500 => Results.Problem(Error),
            _   => Results.BadRequest(new { error = Error }),
        };
}
