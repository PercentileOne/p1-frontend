import type { InterviewQuestion, ScoreResponse } from '../../api/explainApi';
import type { TranscriptMeta } from '../../components/VoiceInput';

// Shared across InterviewRoomPage and the hooks it's being split into — kept here rather than
// re-declared per-file so extraction doesn't drift the shape of these over time.

// Mike-only phase, then full interview
export type RoomPhase =
  | 'intro'
  | 'mike'
  | 'interviewer-intro'
  | 'asking'
  | 'answering'
  | 'scoring'
  | 'coaching'
  | 'done';

export interface SessionAnswer {
  question: InterviewQuestion;
  answerText: string;
  meta?: TranscriptMeta;
  score: ScoreResponse;
  answeredByVoice: boolean;
  thinkTimeMs?: number;
}

export interface ChapterMarker {
  questionIndex: number;
  questionText: string;
  competency: string;
  offsetSeconds: number;
  isMcq?: boolean;
  mcqOrdinal?: number;
}

export interface McqResult {
  correct: boolean;
  selectedIndex: number;
  questionIndex: number;
}
