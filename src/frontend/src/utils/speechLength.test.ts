import { describe, it, expect } from 'vitest';
import { speechWords } from './speechLength';

describe('speechWords', () => {
  it('counts spaced words as before', () => {
    expect(speechWords('Tell me about yourself')).toBe(4);
    expect(speechWords('  one   two  ')).toBe(2);
    expect(speechWords('')).toBe(1);
  });

  it('counts a Chinese question by characters, not as one word', () => {
    const q = '如果你担任营销经理，想象中的典型一周会如何安排？你会怎样在战略、团队协作和临时问题之间分配时间？';
    expect(q.split(/\s+/).length).toBe(1);               // what the old count saw
    expect(speechWords(q)).toBeGreaterThan(25);           // a real spoken length
  });

  it('handles Japanese and Thai the same way', () => {
    expect(speechWords('あなたの強みは何ですか。チームでどのように働きますか。')).toBeGreaterThan(10);
    expect(speechWords('บอกฉันเกี่ยวกับตัวคุณหน่อย')).toBeGreaterThan(5);
  });

  it('adds spaced words and unspaced characters together in a mixed line', () => {
    const mixed = 'So your first question is: 你为什么想做这份工作？';
    expect(speechWords(mixed)).toBeGreaterThan(5 + 3);
  });
});
