import { describe, it, expect } from 'vitest';
import { localScore } from './localScoring';
import type { InterviewQuestion } from '../../api/explainApi';

const mockQuestion: InterviewQuestion = {
  questionId: 'q1',
  questionText: 'Tell me about a time you led a difficult project.',
  modelAnswer: 'Cover context, actions, and outcome.',
  questionType: 'Competency',
  difficulty: 'Medium',
  source: 'Role',
  competencyTags: ['leadership', 'delivery'],
};

describe('localScore', () => {
  it('returns a valid ScoreResponse shape', () => {
    const result = localScore(mockQuestion, 'I led a team of five engineers and delivered the project two weeks early.');
    expect(result).toHaveProperty('clarity');
    expect(result).toHaveProperty('relevance');
    expect(result).toHaveProperty('depth');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('overallScore');
    expect(Array.isArray(result.feedback)).toBe(true);
    expect(Array.isArray(result.suggestions)).toBe(true);
  });

  it('overallScore stays within [0, 1]', () => {
    const result = localScore(mockQuestion, 'I led the team and we delivered results on time, saving 20% of the budget.');
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(1);
  });

  it('flags a short answer as low clarity severity', () => {
    const result = localScore(mockQuestion, 'I did it.');
    const clarityFeedback = result.feedback.find(f => f.dimension === 'clarity');
    expect(clarityFeedback?.severity).toBe('high');
    expect(result.suggestions).toContain('Use the STAR format to structure your answer.');
  });

  it('scores a longer, structured answer as better clarity than a one-liner', () => {
    const shortResult = localScore(mockQuestion, 'I did it.');
    const longResult = localScore(
      mockQuestion,
      'I led a cross-functional team of five engineers through a critical infrastructure migration. We faced significant technical debt and a tight deadline, but by breaking the work into weekly milestones and pairing junior engineers with seniors, we delivered the migration two weeks ahead of schedule with zero downtime.',
    );
    expect(longResult.clarity).toBeGreaterThan(shortResult.clarity);
  });

  it('applies a company-knowledge bonus only when the tag is present and keywords match', () => {
    const companyQuestion: InterviewQuestion = { ...mockQuestion, competencyTags: ['company knowledge'] };
    const withKeywords = localScore(companyQuestion, 'I know your company focuses on sustainability and innovation.', ['sustainability', 'innovation']);
    const withoutKeywords = localScore(companyQuestion, 'I know your company focuses on sustainability and innovation.', []);
    expect(withKeywords.overallScore).toBeGreaterThan(withoutKeywords.overallScore);
  });
});
