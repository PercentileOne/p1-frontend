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
}
