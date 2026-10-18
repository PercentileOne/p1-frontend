// Calendar dates as yyyy-MM-dd strings, in the person's own time zone.
const p = (n: number) => String(n).padStart(2, '0');
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}
/** Every date from `from` to `to`, both included. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 800; d = addDays(d, 1)) out.push(d);
  return out;
}
/** The yyyy-MM months a stretch of dates touches. */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split('-').map(Number);
  const [ye, me] = to.split('-').map(Number);
  while (y < ye || (y === ye && m <= me)) { out.push(`${y}-${p(m)}`); m++; if (m > 12) { m = 1; y++; } }
  return out;
}
