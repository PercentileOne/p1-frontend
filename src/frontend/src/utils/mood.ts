// The mood scale shared by reviews and the daily mood tap: 1 (Rough) to 5 (Great), drawn as traffic lights.
export const MOOD_LABELS = ['Rough', 'Hard', 'Okay', 'Good', 'Great'];
export const MOOD_RED = '#F87171';
export const MOOD_AMBER = '#F5B942';
export const MOOD_GREEN = '#34D399';
/** Red for Rough and Hard, amber for Okay, green for Good and Great. Index with rating - 1. */
export const MOOD_COLOURS = [MOOD_RED, MOOD_RED, MOOD_AMBER, MOOD_GREEN, MOOD_GREEN];
/** The colour for an average that sits between the steps. */
export function moodColourForAverage(avg: number): string {
  return avg >= 3.5 ? MOOD_GREEN : avg >= 2.5 ? MOOD_AMBER : MOOD_RED;
}
