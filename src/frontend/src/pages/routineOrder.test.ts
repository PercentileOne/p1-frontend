import { describe, it, expect } from 'vitest';
import { canMove, moveId, moveSection, orderByDrop, reorderWithin } from './routineOrder';

describe('moveId', () => {
  const ids = ['a', 'b', 'c', 'd'];
  it('moves to the top and the bottom', () => {
    expect(moveId(ids, 'c', 'top')).toEqual(['c', 'a', 'b', 'd']);
    expect(moveId(ids, 'b', 'bottom')).toEqual(['a', 'c', 'd', 'b']);
  });
  it('moves one place up or down, and stops at the ends', () => {
    expect(moveId(ids, 'c', 'up')).toEqual(['a', 'c', 'b', 'd']);
    expect(moveId(ids, 'b', 'down')).toEqual(['a', 'c', 'b', 'd']);
    expect(moveId(ids, 'a', 'up')).toEqual(ids);
    expect(moveId(ids, 'd', 'down')).toEqual(ids);
  });
  it('ignores an id that is not there', () => {
    expect(moveId(ids, 'zzz', 'top')).toEqual(ids);
  });
});

describe('canMove', () => {
  it('switches the impossible moves off', () => {
    expect(canMove(0, 4, 'top')).toBe(false);
    expect(canMove(0, 4, 'up')).toBe(false);
    expect(canMove(0, 4, 'down')).toBe(true);
    expect(canMove(3, 4, 'bottom')).toBe(false);
    expect(canMove(3, 4, 'down')).toBe(false);
    expect(canMove(3, 4, 'top')).toBe(true);
  });
});

describe('reorderWithin', () => {
  const items = [
    { id: 'm1', section: 'Morning' }, { id: 'e1', section: 'Evening' }, { id: 'm2', section: 'Morning' }, { id: 'm3', section: 'Morning' }, { id: 'e2', section: 'Evening' },
  ];
  it('trades places only inside the category', () => {
    const r = reorderWithin(items, 'Morning', ['m3', 'm1', 'm2']);
    expect(r.map(i => i.id)).toEqual(['m3', 'e1', 'm1', 'm2', 'e2']);
  });
  it('keeps forgotten items at the end and ignores unknown ids', () => {
    expect(reorderWithin(items, 'Morning', ['m3', 'nope']).map(i => i.id)).toEqual(['m3', 'e1', 'm1', 'm2', 'e2']);
  });
});

describe('orderByDrop', () => {
  const ids = ['a', 'b', 'c'];
  const mids = { a: 100, b: 200, c: 300 };
  it('drops above the first item', () => expect(orderByDrop(ids, 'c', 50, mids)).toEqual(['c', 'a', 'b']));
  it('drops between two items', () => expect(orderByDrop(ids, 'a', 250, mids)).toEqual(['b', 'a', 'c']));
  it('drops below the last item', () => expect(orderByDrop(ids, 'a', 900, mids)).toEqual(['b', 'c', 'a']));
  it('leaves the order alone when dropped where it was', () => expect(orderByDrop(ids, 'b', 200, mids)).toEqual(['a', 'b', 'c']));
});

describe('moveSection', () => {
  const all = ['Morning', 'Empty', 'Plan', 'Evening'];
  const visible = ['Morning', 'Plan', 'Evening'];
  it('moves to the top and the bottom', () => {
    expect(moveSection(all, visible, 'Evening', 'top')).toEqual(['Evening', 'Morning', 'Empty', 'Plan']);
    expect(moveSection(all, visible, 'Morning', 'bottom')).toEqual(['Empty', 'Plan', 'Evening', 'Morning']);
  });
  it('steps over a hidden category, so one press always passes something you can see', () => {
    expect(moveSection(all, visible, 'Plan', 'up')).toEqual(['Plan', 'Morning', 'Empty', 'Evening']);
    expect(moveSection(all, visible, 'Morning', 'down')).toEqual(['Empty', 'Plan', 'Morning', 'Evening']);
  });
  it('does nothing at the ends or for an unknown name', () => {
    expect(moveSection(all, visible, 'Morning', 'up')).toEqual(all);
    expect(moveSection(all, visible, 'Evening', 'down')).toEqual(all);
    expect(moveSection(all, visible, 'Nope', 'top')).toEqual(all);
  });
});
