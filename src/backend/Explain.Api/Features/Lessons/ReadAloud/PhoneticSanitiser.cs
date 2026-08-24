namespace Explain.Api.Features.Lessons.ReadAloud;

/// <summary>
/// Same substitution table as the frontend's ttsApi.ts sanitiseForTTS — kept as a separate
/// copy because this one runs server-side against ElevenLabs while the frontend's still
/// serves the (still client-side) interview/coaching voices. Update both if you change one.
/// </summary>
public static class PhoneticSanitiser
{
    private static readonly (string Pattern, string Replacement)[] Substitutions =
    [
        (@"\bASP\.NET\b", "A S P dot NET"),
        (@"\b\.NET\b", "dot NET"),
        (@"\bNode\.js\b", "Node JS"),
        (@"\bVue\.js\b", "Vue JS"),
        (@"\bNext\.js\b", "Next JS"),
        (@"\bNuxt\.js\b", "Nuxt JS"),
        (@"\bExpress\.js\b", "Express JS"),
        (@"\bReact\.js\b", "React JS"),
        (@"\bC#\b", "C Sharp"),
        (@"\bC\+\+\b", "C Plus Plus"),
        (@"\bjQuery\b", "Jay Query"),
        (@"\bSQL\b", "sequel"),
        (@"\bNoSQL\b", "No sequel"),
        (@"\bCSS\b", "C S S"),
        (@"\bHTML\b", "H T M L"),
        (@"\bHTTPS?\b", "H T T P S"),
        (@"\bAPI\b", "A P I"),
        (@"\bAPIs\b", "A P I s"),
        (@"\bUI\b", "U I"),
        (@"\bUX\b", "U X"),
        (@"\bCI/CD\b", "C I C D"),
        (@"\bCI\b", "C I"),
        (@"\bCD\b", "C D"),
        (@"\bAWS\b", "A W S"),
        (@"\bGCP\b", "G C P"),
        (@"\bk8s\b", "Kubernetes"),
        (@"\bkubectl\b", "kube control"),
        (@"\bnpm\b", "N P M"),
        (@"\bSDK\b", "S D K"),
        (@"\bSDKs\b", "S D K s"),
        (@"\bSaaS\b", "sass"),
        (@"\bPaaS\b", "pass"),
        (@"\bIaaS\b", "I as a service"),
        (@"\bORM\b", "O R M"),
        (@"\bREST\b", "rest"),
        (@"\bgRPC\b", "G R P C"),
        (@"\bWebRTC\b", "Web R T C"),
        (@"\bVSCode\b", "V S Code"),
        (@"\bGitHub\b", "Git Hub"),
        (@"\bGitLab\b", "Git Lab"),
        (@"\bDevOps\b", "Dev Ops"),
        (@"\bFinTech\b", "Fin Tech"),
        (@"\bLLM\b", "L L M"),
        (@"\bLLMs\b", "L L Ms"),
        (@"\bRAG\b", "R A G"),
        (@"\bMLOps\b", "M L Ops"),
        (@"&amp;", " and "),
        (@"&", " and "),
        (@"\+", " plus "),
        (@"\be\.g\.", "for example"),
        (@"\bi\.e\.", "that is"),
    ];

    private static readonly System.Text.RegularExpressions.Regex[] Compiled =
        Array.ConvertAll(Substitutions, s =>
            new System.Text.RegularExpressions.Regex(s.Pattern, System.Text.RegularExpressions.RegexOptions.IgnoreCase));

    public static string Sanitise(string text)
    {
        var result = text;
        for (var i = 0; i < Compiled.Length; i++)
            result = Compiled[i].Replace(result, Substitutions[i].Replacement);
        return result;
    }
}
