import { describe, expect, it } from 'vitest';
import { roomAvatarIds } from './warmFaces';
import type { PublicInterviewer } from '../api/interviewersApi';

const iv = (id: string, role: PublicInterviewer['role'], avatarId: string, defaultFor: PublicInterviewer['defaultFor'] = null): PublicInterviewer => ({
  id, displayName: id, role, avatarId, description: '', traits: { depth: 3, strictness: 3, warmth: 3, humour: 3, pace: 3 }, sortOrder: 0,
  backgroundUrl: null, portraitUrl: null, greetingUrl: null, defaultFor,
});

const roster = [
  iv('amina', 'hr', 'A', 'hr'), iv('priya', 'hr', 'P'),
  iv('wayne', 'technical', 'W', 'technical'), iv('luca', 'technical', 'L'),
  iv('michelle', 'briefing', 'M', 'briefing'),
];

describe('roomAvatarIds', () => {
  it('uses the defaults when the candidate has chosen nobody', () => {
    expect(roomAvatarIds(roster, {})).toEqual(['A', 'W', 'M']);
  });
  it('uses the chosen interviewers and still includes the briefing face', () => {
    expect(roomAvatarIds(roster, { hr: 'priya', technical: 'luca' })).toEqual(['P', 'L', 'M']);
  });
  it('ignores a stale choice that is no longer on the roster and never repeats a face', () => {
    expect(roomAvatarIds(roster, { hr: 'gone' })).toEqual(['A', 'W', 'M']);
    expect(roomAvatarIds([iv('a', 'hr', 'X', 'hr'), iv('b', 'technical', 'X', 'technical')], {})).toEqual(['X']);
  });
  it('is empty when the roster could not load', () => {
    expect(roomAvatarIds([], {})).toEqual([]);
  });
});
