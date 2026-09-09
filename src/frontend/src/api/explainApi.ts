export interface InterviewQuestion {
  questionId: string;
  questionText: string;
  modelAnswer: string;
  questionType: string;
  difficulty: string;
  source: string;
  competencyTags: string[];
}

export interface ScoreResponse {
  clarity: number;
  relevance: number;
  depth: number;
  confidence: number;
  overallScore: number;
  feedback: { dimension: string; message: string; severity: 'high' | 'medium' | 'low' }[];
  suggestions: string[];
  // Go Deeper — set by scoreWithAI when the answer sounds vague, generic, or unverifiable
  // and a genuine probing follow-up would test whether the depth is real.
  needsFollowUp?: boolean;
  followUpQuestion?: string | null;
  // Set only when scoring one of the two guaranteed-every-interview questions injected by
  // sessionPrepareClient (see MANDATORY_MEASURE_QUESTIONS) — deliberately not scored on every
  // answer, per Francis: "every question is too much". ownership/execution come from the
  // "what are you proud of" question, proactiveness from the "5 years" question.
  ownership?: number;
  execution?: number;
  proactiveness?: number;
}
