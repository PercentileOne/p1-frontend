import { describe, it, expect } from 'vitest';
import { buildDemoQuestions } from './demoQuestions';
import type { Company } from '../../data/companyBank';

// Regression test for a real bug this session: the interview room's demo-fallback question
// set (used whenever the real AI generation hasn't resolved or fails) was a hardcoded 10-item
// array that ignored whatever questionCount the candidate had actually selected — "select 5,
// still get 10". See InterviewRoomPage.tsx's `questions` derivation and this session's commit
// "fix: demo-fallback question set ignored the selected question count".

const mockCompany: Company = {
  id: 'test-co',
  name: 'Test Co',
  sector: 'Testing',
  hq: 'Testville',
  size: '1-10',
  keyFacts: [],
  mikeLines: '',
  companyKnowledgeKeywords: [],
};

describe('buildDemoQuestions', () => {
  it('returns exactly 5 questions when questionCount=5', () => {
    expect(buildDemoQuestions(mockCompany, 5)).toHaveLength(5);
  });

  it('returns exactly 10 (the full bank) when questionCount=10', () => {
    expect(buildDemoQuestions(mockCompany, 10)).toHaveLength(10);
  });

  it('falls back to the full 10-question bank when questionCount=15 (bank has no more to give)', () => {
    expect(buildDemoQuestions(mockCompany, 15)).toHaveLength(10);
  });

  it('falls back to the full 10-question bank when questionCount=20 (bank has no more to give)', () => {
    expect(buildDemoQuestions(mockCompany, 20)).toHaveLength(10);
  });

  it('defaults to 10 when questionCount is undefined', () => {
    expect(buildDemoQuestions(mockCompany, undefined)).toHaveLength(10);
  });

  it('ignores an invalid questionCount not in the allowed [5,10,15,20] set', () => {
    expect(buildDemoQuestions(mockCompany, 7)).toHaveLength(10);
  });

  it('always keeps the company-knowledge question last, regardless of count', () => {
    for (const count of [5, 10] as const) {
      const qs = buildDemoQuestions(mockCompany, count);
      expect(qs[qs.length - 1].competencyTags).toContain('company knowledge');
    }
  });

  it('the company-knowledge question mentions the actual company name passed in', () => {
    const qs = buildDemoQuestions(mockCompany, 5);
    expect(qs[qs.length - 1].questionText).toContain('Test Co');
  });

  it('maintains roughly a 4:1 role-to-HR ratio at questionCount=5 (matches sessionPrepareClient)', () => {
    const qs = buildDemoQuestions(mockCompany, 5);
    const roleCount = qs.filter(q => q.source === 'Role').length;
    const hrCount = qs.filter(q => q.source === 'HR').length;
    expect(roleCount).toBe(4);
    expect(hrCount).toBe(1);
  });
});
