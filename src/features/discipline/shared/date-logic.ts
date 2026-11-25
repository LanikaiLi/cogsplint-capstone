// Pure date helper shared by Today and Jar.

// The user's date on their phone, as YYYY-MM-DD. Not UTC, so "today" matches the user's own day.
export function localDateString(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseDate(text: string): Date {
  const [year, month, day] = text.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// "2026-11-30" plus 1 day is "2026-12-01". Works on plain dates, so summer time changes do not matter.
export function addDays(date: string, days: number): string {
  const result = parseDate(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

// How many days from `from` to `to` (0 if they are the same day, negative if `to` is earlier).
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86400000);
}
