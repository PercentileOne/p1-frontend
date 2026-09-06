using MediatR;

namespace Explain.Api.Features.Interviews.SpeakVoice;

public static class Endpoint
{
    // Anonymous — matches /api/ai-proxy and /api/ai/transcribe's existing precedent. speak() in
    // ttsApi.ts is called from a dozen-plus places across the app (interview room, MCQ overlays,
    // coaching feedback, career guide, profile video recording), so requiring a bearer token
    // here would mean threading auth through every one of them for a call this codebase already
    // treats as anonymous-but-proxied everywhere else it touches a third-party AI provider.
    public static void Map(WebApplication app) =>
        app.MapPost("/interviews/speak", async (Request req, IMediator mediator) =>
            (await mediator.Send(new SpeakVoiceCommand(req.Text, req.Role))).ToHttpResult())
           .WithName("InterviewSpeak").WithTags("Interviews")
           .AllowAnonymous();

    private record Request(string Text, string Role);
}
