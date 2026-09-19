import { describe, it, expect } from 'vitest';
import { computeScaledScore, type ExamQuestion } from './certExamApi';
import type { ExamCatalogEntry } from './examCatalogApi';

// Builds `total` answered questions of which the first `correct` are right.
function answers(correct: number, total: number) {
  return Array.from({ length: total }, (_, i) => ({
    question: { questionText: `q${i}`, options: ['a', 'b', 'c', 'd'], correctIndex: 0, explanation: '', domain: 'D' } as ExamQuestion,
    selectedIndex: i < correct ? 0 : 1,
  }));
}

function cert(over: Partial<ExamCatalogEntry>): ExamCatalogEntry {
  return {
    id: 'x', category: 'certification', name: 'X', vendor: '', examCode: '', aliases: [], domains: [{ name: 'D', weightPct: 100 }],
    passScore: 0, maxScore: 0, source: 'test', createdAt: '', ...over,
  };
}

describe('computeScaledScore', () => {
  it('keeps the original Microsoft-style behaviour (1000 scale, floor, pass 700)', () => {
    const pass = computeScaledScore(cert({ maxScore: 1000, passScore: 700 }), answers(27, 30)); // 90%
    expect(pass.maxScore).toBe(1000);
    expect(pass.passed).toBe(true);
    expect(pass.gradeLabel).toBeUndefined();
    const fail = computeScaledScore(cert({ maxScore: 1000, passScore: 700 }), answers(15, 30)); // 50%
    expect(fail.passed).toBe(false);
    // a genuine attempt never shows a bare 0
    expect(computeScaledScore(cert({ maxScore: 1000, passScore: 700 }), answers(0, 30)).scaledScore).toBeGreaterThan(0);
  });

  it('maps onto a real minimum for admissions tests (SAT 400-1600)', () => {
    const none = computeScaledScore(cert({ category: 'admissions', minScore: 400, maxScore: 1600 }), answers(0, 30));
    const all = computeScaledScore(cert({ category: 'admissions', minScore: 400, maxScore: 1600 }), answers(30, 30));
    expect(none.scaledScore).toBe(400);
    expect(all.scaledScore).toBe(1600);
  });

  it('scores small raw-score tests out of the question count (driving theory 43/50)', () => {
    const c = cert({ category: 'official-tests', maxScore: 50, passScore: 43 });
    expect(computeScaledScore(c, answers(43, 50)).scaledScore).toBe(43);
    expect(computeScaledScore(c, answers(43, 50)).passed).toBe(true);
    expect(computeScaledScore(c, answers(42, 50)).passed).toBe(false);
    // and still 43/50 = 86% when only 30 questions are asked
    expect(computeScaledScore(c, answers(26, 30)).scaledScore).toBe(43);
  });

  it('gives an indicative GCSE 9-1 grade, passing at 4', () => {
    const c = cert({ category: 'gcse', scoringModel: 'grade-9-1' });
    const top = computeScaledScore(c, answers(28, 30)); // 93%
    expect(top.gradeLabel).toBe('Grade 9');
    expect(top.maxScore).toBe(100);
    expect(computeScaledScore(c, answers(18, 30)).gradeLabel).toBe('Grade 6'); // 60%
    expect(computeScaledScore(c, answers(12, 30)).passed).toBe(true);          // 40% -> 4
    expect(computeScaledScore(c, answers(9, 30)).passed).toBe(false);          // 30% -> 3
    expect(computeScaledScore(c, answers(1, 30)).gradeLabel).toBe('Ungraded (U)');
  });

  it('gives an indicative A-level grade, passing at E', () => {
    const c = cert({ category: 'a-level', scoringModel: 'grade-a-star-e' });
    expect(computeScaledScore(c, answers(27, 30)).gradeLabel).toBe('Grade A*'); // 90%
    expect(computeScaledScore(c, answers(20, 30)).gradeLabel).toBe('Grade B');  // 67%
    expect(computeScaledScore(c, answers(11, 30)).passed).toBe(true);           // 37% -> E
    expect(computeScaledScore(c, answers(9, 30)).passed).toBe(false);
  });

  it('gives an AP 1-5 score, passing at 3', () => {
    const c = cert({ category: 'ap', scoringModel: 'ap-1-5' });
    const five = computeScaledScore(c, answers(26, 30)); // 87%
    expect(five.scaledScore).toBe(5);
    expect(five.maxScore).toBe(5);
    expect(computeScaledScore(c, answers(15, 30)).passed).toBe(true);  // 50% -> 3
    expect(computeScaledScore(c, answers(9, 30)).passed).toBe(false);
    expect(computeScaledScore(c, answers(0, 30)).scaledScore).toBe(1);
  });

  it('falls back to a percentage when an exam has no score scale at all', () => {
    const r = computeScaledScore(cert({}), answers(24, 30)); // 80%
    expect(r.scaledScore).toBe(80);
    expect(r.maxScore).toBe(100);
    expect(r.passed).toBe(true);
  });

  it('reports per-domain accuracy', () => {
    const r = computeScaledScore(cert({ maxScore: 100 }), answers(3, 4));
    expect(r.domainAccuracy).toEqual([{ domain: 'D', correct: 3, total: 4 }]);
  });
});
