// Ordering helpers for My Routines (Francis, 2026-10-15): move an item to the top, up, down or bottom of its category, or drag it to a new place.
// Kept free of React so the rules can be tested on their own. The server applies the same slot rule (Endpoint.ReorderSection), so what is shown is what is saved.

export type MoveTo = 'top' | 'up' | 'down' | 'bottom';

/** Where an item ends up after a move within its category's list of ids. An unknown id leaves the list as it was. */
export function moveId(ids: string[], id: string, to: MoveTo): string[] {
  const i = ids.indexOf(id);
  if (i < 0) return ids;
  const rest = ids.filter(x => x !== id);
  const at = to === 'top' ? 0 : to === 'bottom' ? rest.length : to === 'up' ? Math.max(0, i - 1) : Math.min(rest.length, i + 1);
  return [...rest.slice(0, at), id, ...rest.slice(at)];
}

/** Can this item go that way? (Used to switch menu entries off at the ends of the list.) */
export function canMove(index: number, count: number, to: MoveTo): boolean {
  return to === 'top' || to === 'up' ? index > 0 : index < count - 1;
}

/**
 * Puts one category's items into the given order and leaves every other item exactly where it was: the category's items trade places among the positions it
 * already held. Ids that are not in the category are ignored; items the list forgot keep their relative order at the end.
 */
export function reorderWithin<T extends { id: string; section: string }>(items: T[], section: string, orderedIds: string[]): T[] {
  const slots: number[] = [];
  items.forEach((it, i) => { if (it.section === section) slots.push(i); });
  const inSection = slots.map(i => items[i]);
  const byId = new Map<string, T>();
  inSection.forEach(it => { if (!byId.has(it.id)) byId.set(it.id, it); });
  const ordered: T[] = [];
  const used = new Set<string>();
  orderedIds.forEach(id => { const it = byId.get(id); if (it && !used.has(id)) { ordered.push(it); used.add(id); } });
  inSection.forEach(it => { if (!used.has(it.id)) { ordered.push(it); used.add(it.id); } });
  const out = items.slice();
  slots.forEach((slot, k) => { if (k < ordered.length) out[slot] = ordered[k]; });
  return out;
}

/**
 * The order while an item is being dragged. `midpoints` are each item's vertical centre when the drag began (not updated as items shuffle, so the list does not
 * flicker); the dragged item lands after every other item whose centre is above the pointer.
 */
export function orderByDrop(ids: string[], dragId: string, pointerY: number, midpoints: Record<string, number>): string[] {
  if (!ids.includes(dragId)) return ids;
  const others = ids.filter(id => id !== dragId);
  let at = 0;
  others.forEach((id, i) => { if ((midpoints[id] ?? Infinity) < pointerY) at = i + 1; });
  return [...others.slice(0, at), dragId, ...others.slice(at)];
}

/**
 * The category order after moving one category. `all` is every category in order (including any with nothing on this day); `visible` are the ones actually showing.
 * Up and down step over categories that are hidden, so one press always moves it past something you can see.
 */
export function moveSection(all: string[], visible: string[], name: string, to: MoveTo): string[] {
  if (!all.includes(name)) return all;
  const rest = all.filter(s => s !== name);
  if (to === 'top') return [name, ...rest];
  if (to === 'bottom') return [...rest, name];
  const vi = visible.indexOf(name);
  if (vi < 0) return all;
  const neighbour = to === 'up' ? visible[vi - 1] : visible[vi + 1];
  if (!neighbour) return all;
  const at = rest.indexOf(neighbour);
  return to === 'up' ? [...rest.slice(0, at), name, ...rest.slice(at)] : [...rest.slice(0, at + 1), name, ...rest.slice(at + 1)];
}
