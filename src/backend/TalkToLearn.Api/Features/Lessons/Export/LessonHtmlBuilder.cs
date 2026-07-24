using TalkToLearn.Api.Features.Lessons.Generate;

namespace TalkToLearn.Api.Features.Lessons.Export;

public static class LessonHtmlBuilder
{
    public static string Build(LessonDto lesson, string recipientName)
    {
        var concepts = string.Join("", lesson.KeyConcepts.Select((c, i) => $@"
        <div class='concept'>
          <div class='concept-header'>
            <span class='concept-icon'>{c.Icon}</span>
            <h3>{c.Title}</h3>
          </div>
          <p>{c.Body}</p>
          {(string.IsNullOrEmpty(c.DeepDive) ? "" : $"<div class='deep-dive'><span class='label'>📖 Deep Dive</span><p>{c.DeepDive}</p></div>")}
          {(string.IsNullOrEmpty(c.Example)  ? "" : $"<div class='example'><span class='label'>💡 Real-World Example</span><p>{c.Example}</p></div>")}
          {(string.IsNullOrEmpty(c.CodeSnippet) ? "" : $"<div class='code-block'><span class='label'>💻 Code Example</span><pre>{EscapeHtml(c.CodeSnippet)}</pre></div>")}
          {(string.IsNullOrEmpty(c.MemoryHook) ? "" : $"<div class='memory-hook'><span class='label'>🧠 Memory Hook</span><p>{c.MemoryHook}</p></div>")}
          {(string.IsNullOrEmpty(c.ExamTrap)   ? "" : $"<div class='exam-trap'><span class='label'>⚠️ Exam Trap</span><p>{c.ExamTrap}</p></div>")}
        </div>"));

        var glossary = string.Join("", lesson.Glossary.Select(g => $@"
        <tr><td class='term'>{g.Term}</td><td>{g.Def}</td></tr>"));

        var misconceptions = string.Join("", lesson.Misconceptions.Select(m => $@"
        <div class='misconception'>
          <p class='wrong'>✕ {m.Wrong}</p>
          <p class='right'>✓ {m.Right}</p>
        </div>"));

        var spokenQuestions = string.Join("", (lesson.ExamQuestions ?? []).Select((q, i) => $@"
        <div class='question'>
          <span class='q-num'>Q{i + 1}</span>
          <div>
            <p>{EscapeHtml(q)}</p>
            <p class='speak-reminder'>🎙 Say your answer out loud before reading the model answer at the bottom.</p>
          </div>
        </div>"));

        var mcQuestionsHtml = string.Join("", (lesson.McQuestions ?? []).Select((q, i) => $@"
        <div class='question'>
          <span class='q-num mc-num'>MC{i + 1}</span>
          <div>
            <p>{EscapeHtml(q.Q)}</p>
            <div class='mc-options'>
              {string.Join("", q.Options.Select((opt, oi) => $"<span class='mc-opt'>{(char)('A' + oi)}) {EscapeHtml(opt)}</span>"))}
            </div>
          </div>
        </div>"));

        var answerKey = string.Join("", (lesson.ExamAnswers ?? []).Select((a, i) => $@"
        <div class='answer-row'>
          <span class='a-num'>A{i + 1}</span>
          <p>{EscapeHtml(a)}</p>
        </div>"));

        var mcAnswerKey = string.Join("&nbsp;&nbsp;", (lesson.McQuestions ?? []).Select((q, i) =>
            $"<span class='mc-key-item'><strong>MC{i + 1}:</strong> {(char)('A' + q.Answer)}</span>"));

        return $@"<!DOCTYPE html>
<html lang='en'>
<head>
<meta charset='UTF-8'>
<meta name='viewport' content='width=device-width, initial-scale=1.0'>
<title>{EscapeHtml(lesson.Title)} — TalkToLearn</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.6; }}
  .wrapper {{ max-width: 720px; margin: 0 auto; padding: 40px 24px; }}

  .header {{ background: #0f172a; border-radius: 16px; padding: 40px; margin-bottom: 32px; text-align: center; }}
  .ttl-logo {{ font-size: 13px; font-weight: 800; letter-spacing: 3px; color: #6366f1; text-transform: uppercase; margin-bottom: 16px; }}
  .category-badge {{ display: inline-block; background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.4); color: #a5b4fc; font-size: 12px; font-weight: 700; padding: 4px 14px; border-radius: 20px; margin-bottom: 16px; }}
  .title {{ font-size: 32px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; margin-bottom: 16px; }}
  .hook {{ font-size: 16px; font-style: italic; color: rgba(255,255,255,0.65); border-left: 3px solid #6366f1; padding-left: 16px; text-align: left; }}

  .greeting {{ background: #ffffff; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; border: 1px solid #e2e8f0; font-size: 15px; color: #475569; }}
  .greeting strong {{ color: #1e293b; }}

  h2 {{ font-size: 13px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #94a3b8; margin: 32px 0 16px; }}

  .concept {{ background: #ffffff; border-radius: 12px; padding: 24px; margin-bottom: 12px; border: 1px solid #e2e8f0; }}
  .concept-header {{ display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }}
  .concept-icon {{ font-size: 24px; }}
  .concept h3 {{ font-size: 18px; font-weight: 800; color: #1e293b; }}
  .concept p {{ font-size: 15px; color: #475569; line-height: 1.65; }}

  .label {{ display: block; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px; margin-top: 16px; }}
  .deep-dive {{ border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: 12px; }}
  .deep-dive .label {{ color: #6366f1; }}
  .example {{ background: #f8fafc; border-radius: 8px; padding: 12px 14px; margin-top: 12px; }}
  .example .label {{ color: #0891b2; }}
  .code-block {{ background: #0f172a; border-radius: 8px; padding: 16px; margin-top: 12px; overflow-x: auto; }}
  .code-block .label {{ color: #94a3b8; }}
  .code-block pre {{ font-family: 'Courier New', monospace; font-size: 13px; color: #a8d8a8; line-height: 1.6; white-space: pre-wrap; }}
  .memory-hook {{ background: rgba(99,102,241,0.06); border-radius: 8px; padding: 12px 14px; margin-top: 12px; border: 1px solid rgba(99,102,241,0.15); }}
  .memory-hook .label {{ color: #6366f1; }}
  .memory-hook p {{ font-weight: 700; color: #4f46e5; font-size: 14px; }}
  .exam-trap {{ background: rgba(239,68,68,0.05); border-radius: 8px; padding: 12px 14px; margin-top: 12px; border: 1px solid rgba(239,68,68,0.15); }}
  .exam-trap .label {{ color: #dc2626; }}

  .glossary-table {{ width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }}
  .glossary-table tr {{ border-bottom: 1px solid #f1f5f9; }}
  .glossary-table tr:last-child {{ border-bottom: none; }}
  .glossary-table td {{ padding: 12px 16px; font-size: 14px; }}
  .term {{ font-weight: 800; color: #3b82f6; width: 160px; }}

  .misconception {{ background: #ffffff; border-radius: 12px; padding: 18px 20px; margin-bottom: 10px; border: 1px solid #e2e8f0; }}
  .wrong {{ font-size: 14px; color: #ef4444; text-decoration: underline; text-decoration-color: #ef4444; text-underline-offset: 3px; margin-bottom: 8px; }}
  .right {{ font-size: 14px; color: #10b981; font-weight: 600; }}

  .speak-banner {{ background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; display: flex; align-items: flex-start; gap: 12px; }}
  .speak-banner p {{ font-size: 14px; color: #92400e; line-height: 1.6; margin: 0; }}
  .speak-banner strong {{ display: block; font-size: 15px; color: #78350f; margin-bottom: 4px; }}

  .question {{ background: #ffffff; border-radius: 12px; padding: 16px 20px; margin-bottom: 10px; border: 1px solid #e2e8f0; display: flex; gap: 14px; align-items: flex-start; }}
  .q-num {{ background: rgba(124,58,237,0.12); color: #7c3aed; font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 8px; flex-shrink: 0; margin-top: 2px; white-space: nowrap; }}
  .mc-num {{ background: rgba(217,119,6,0.12); color: #d97706; }}
  .question p {{ font-size: 14px; color: #334155; line-height: 1.55; margin: 0 0 8px; }}
  .speak-reminder {{ font-size: 12px !important; color: #6366f1 !important; font-style: italic; margin-top: 6px !important; }}
  .mc-options {{ display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }}
  .mc-opt {{ font-size: 13px; color: #64748b; padding: 3px 0; }}
  .mc-correct {{ color: #059669; font-weight: 700; }}

  .answers-section {{ margin-top: 48px; padding-top: 32px; border-top: 2px dashed #e2e8f0; }}
  .answers-warning {{ background: #f1f5f9; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; text-align: center; }}
  .answers-warning p {{ font-size: 13px; color: #94a3b8; line-height: 1.6; }}
  .answers-warning strong {{ display: block; font-size: 14px; color: #64748b; margin-bottom: 4px; }}
  .answer-row {{ display: flex; gap: 14px; align-items: flex-start; padding: 14px 0; border-bottom: 1px solid #f1f5f9; }}
  .a-num {{ background: rgba(16,185,129,0.12); color: #059669; font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 8px; flex-shrink: 0; margin-top: 2px; white-space: nowrap; }}
  .answer-row p {{ font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0; }}
  .mc-key-grid {{ background: #f1f5f9; border-radius: 10px; padding: 16px 20px; display: flex; flex-wrap: wrap; gap: 10px 20px; }}
  .mc-key-item {{ font-size: 13px; color: #94a3b8; }}
  .mc-key-item strong {{ color: #64748b; }}

  .footer {{ text-align: center; margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; }}
  .footer p {{ font-size: 13px; color: #94a3b8; margin-bottom: 6px; }}
  .footer a {{ color: #6366f1; text-decoration: none; font-weight: 700; }}
  .footer .tagline {{ font-size: 15px; font-weight: 800; color: #1e293b; margin-bottom: 8px; }}
</style>
</head>
<body>
<div class='wrapper'>

  <div class='header'>
    <div class='ttl-logo'>TalkToLearn</div>
    <div class='category-badge'>{EscapeHtml(lesson.Category)}</div>
    <h1 class='title'>{EscapeHtml(lesson.Title)}</h1>
    <p class='hook'>&ldquo;{EscapeHtml(lesson.Hook)}&rdquo;</p>
  </div>

  <div class='greeting'>
    Hi <strong>{EscapeHtml(recipientName)}</strong> 👋<br><br>
    Here is your lesson on <strong>{EscapeHtml(lesson.Title)}</strong>, generated just for you.<br>
    Study it, talk about it, and use the exam questions at the end to test yourself.
  </div>

  <h2>Key Concepts ({lesson.KeyConcepts.Count})</h2>
  {concepts}

  <h2>Key Terms</h2>
  <table class='glossary-table'>
    <tbody>{glossary}</tbody>
  </table>

  <h2>Common Misconceptions</h2>
  {misconceptions}

  <h2>Spoken Questions — {(lesson.ExamQuestions ?? []).Count} Questions · Say Answers Out Loud</h2>

  <div class='speak-banner'>
    <span style='font-size: 28px;'>🎙</span>
    <p>
      <strong>The TalkToLearn Method: speak before you peek.</strong>
      For each question below, say your answer out loud — in full sentences, as if explaining to someone else.
      Only scroll to the model answers at the bottom after you've spoken yours.
      Talking about it is how you actually learn it.
    </p>
  </div>

  {spokenQuestions}

  <h2 style='margin-top: 36px;'>Multiple Choice — {(lesson.McQuestions ?? []).Count} Questions</h2>
  <p style='font-size: 13px; color: #94a3b8; margin-bottom: 16px;'>Circle or highlight your answer. Answer key is at the very bottom — no peeking!</p>
  {mcQuestionsHtml}

  <div class='answers-section'>
    <h2>Model Answers — Spoken Question Answers</h2>
    <div class='answers-warning'>
      <strong>⚠️ Only read these after you've answered out loud.</strong>
      <p>These are model answers — not scripts. Your spoken answer doesn't have to be word-for-word,
      but it should cover the same key points. If you missed something, say the answer out loud again now.</p>
    </div>
    {answerKey}

    <h2 style='margin-top: 32px;'>Multiple Choice — Answer Key</h2>
    <div class='answers-warning'>
      <strong>⚠️ Only check these after you've circled your answers.</strong>
      <p>Cover this with your hand while you work through the questions above.</p>
    </div>
    <div class='mc-key-grid'>{mcAnswerKey}</div>
  </div>

  <div class='footer'>
    <p class='tagline'>Talk About It. To Understand It.</p>
    <p>Generated by <a href='https://www.talktolearn.app'>TalkToLearn</a></p>
    <p style='margin-top: 16px; font-size: 12px;'>Open the app to talk through this lesson and get scored by AI.</p>
  </div>

</div>
</body>
</html>";
    }

    private static string EscapeHtml(string? s) =>
        (s ?? "").Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;");
}
