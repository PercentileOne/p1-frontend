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
}
