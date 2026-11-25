// Pure calculations for the Jar tab: no Supabase, no screens. Easy to test.

// Points balance = points earned from check-ins - points spent on rewards.
export function calculateBalance(
  earned: { points_earned: number }[],
  spent: { points_spent: number }[],
): number {
  const totalEarned = earned.reduce((sum, row) => sum + row.points_earned, 0);
  const totalSpent = spent.reduce((sum, row) => sum + row.points_spent, 0);
  return totalEarned - totalSpent;
}

// Money equivalent of a points balance. The exchange rate is "points per 1 dollar".
export function moneyEquivalent(points: number, pointsPerDollar: number): number {
  if (pointsPerDollar <= 0) {
    return 0;
  }
  return Math.round((points / pointsPerDollar) * 100) / 100;
}

export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// Turn what the user typed for the exchange rate into a number. Null when it is not a positive number.
export function parseExchangeRate(text: string): number | null {
  const value = Number(text.trim());
  return Number.isFinite(value) && value > 0 ? value : null;
}

// Turn what the user typed as a cost in dollars into a number. Null when it is not a positive number.
export function parseDollars(text: string): number | null {
  const value = Number(text.trim());
  return Number.isFinite(value) && value > 0 ? value : null;
}

// Dollars to points, using the exchange rate (points per dollar). Points are whole numbers.
export function dollarsToPoints(dollars: number, pointsPerDollar: number): number {
  return Math.round(dollars * pointsPerDollar);
}

// Check a new reward before saving. The user typed a cost in dollars.
// Returns a readable message, or null when it is fine.
export function validateReward(input: {
  description: string;
  dollars: number | null;
  rate: number;
  balance: number;
}): string | null {
  if (!input.description.trim()) {
    return 'Please describe your reward.';
  }
  if (input.dollars === null) {
    return 'Please enter how much it costs.';
  }
  const points = dollarsToPoints(input.dollars, input.rate);
  if (points < 1) {
    return 'That is too small an amount. Please enter a bit more.';
  }
  if (points > input.balance) {
    return `Your balance is ${formatMoney(moneyEquivalent(input.balance, input.rate))}, so this reward costs too much for now.`;
  }
  return null;
}

// A check-in can be undone only if the balance stays at 0 or more. Otherwise those points
// have already been spent on a reward.
export function canUndoCheckIn(balance: number, pointsEarned: number): boolean {
  return balance - pointsEarned >= 0;
}

// Where a reward photo is stored in the private bucket: <user id>/<unique file name>.jpg.
// The first folder must be the user's id, because the storage rules only let users touch their own folder.
export function buildPhotoPath(userId: string, nowMs: number, random: string): string {
  return `${userId}/${nowMs}-${random}.jpg`;
}

export type MonthlyTotal = { key: string; label: string; total: number };

// Points earned in each month, from the first check-in (or at most `maxMonths` months back) up to the current month.
// A month without check-ins counts as 0.
export function earnedByMonth(
  logs: { completed_date: string; points_earned: number }[],
  currentMonth: string,
  maxMonths = 6,
): MonthlyTotal[] {
  if (logs.length === 0) {
    return [];
  }
  const perMonth = new Map<string, number>();
  for (const log of logs) {
    const key = log.completed_date.slice(0, 7);
    perMonth.set(key, (perMonth.get(key) ?? 0) + log.points_earned);
  }
  const firstMonth = [...perMonth.keys()].sort()[0];

  const [currentYear, currentMonthNumber] = currentMonth.split('-').map(Number);
  // Index of a month counted from year 0, so we can step back and forth easily.
  const currentIndex = currentYear * 12 + (currentMonthNumber - 1);
  const [firstYear, firstMonthNumber] = firstMonth.split('-').map(Number);
  const firstIndex = firstYear * 12 + (firstMonthNumber - 1);
  const startIndex = Math.max(firstIndex, currentIndex - (maxMonths - 1));

  const result: MonthlyTotal[] = [];
  for (let index = startIndex; index <= currentIndex; index++) {
    const key = monthKey(Math.floor(index / 12), index % 12);
    result.push({ key, label: monthLabel(key), total: perMonth.get(key) ?? 0 });
  }
  return result;
}

// ---- Reward history by month ----

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// A month as text: "2026-03". Easy to compare and sort.
export function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

// The `count` months right before the given month, newest first. ("2026-11", 2) -> ["2026-10", "2026-09"]
export function previousMonths(key: string, count: number): string[] {
  const [year, month] = key.split('-').map(Number);
  const index = year * 12 + (month - 1);
  const result: string[] = [];
  for (let step = 1; step <= count; step++) {
    result.push(monthKey(Math.floor((index - step) / 12), (index - step) % 12));
  }
  return result;
}

// The month (on the user's phone) of a timestamp like "2026-10-05T18:00:00Z".
export function monthKeyOf(isoDate: string): string {
  const date = new Date(isoDate);
  return monthKey(date.getFullYear(), date.getMonth());
}

// "2026-03" -> "March 2026"
export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export type MonthGroup<T> = { key: string; label: string; rewards: T[]; pointsSpent: number };

// Groups rewards by the month they were created, newest month first.
// Within a month the original order is kept (the list is already newest first).
export function groupRewardsByMonth<T extends { created_at: string; points_spent: number }>(
  rewards: T[],
): MonthGroup<T>[] {
  const groups = new Map<string, MonthGroup<T>>();
  for (const reward of rewards) {
    const key = monthKeyOf(reward.created_at);
    const group = groups.get(key) ?? { key, label: monthLabel(key), rewards: [], pointsSpent: 0 };
    group.rewards.push(reward);
    group.pointsSpent += reward.points_spent;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}

export type MonthCheck = 'ok' | 'before-signup' | 'empty';

// What happens when the user picks a month: show it, or explain why there is nothing to show.
export function checkMonth(key: string, monthsWithRewards: string[], registrationMonth: string): MonthCheck {
  if (key < registrationMonth) {
    return 'before-signup';
  }
  return monthsWithRewards.includes(key) ? 'ok' : 'empty';
}

// The popup text for a month that cannot be shown.
export function monthMessage(check: 'before-signup' | 'empty', key: string, registrationMonth: string) {
  if (check === 'before-signup') {
    return {
      title: 'Before your first month',
      body: `You hadn't started using Cogsplint in ${monthLabel(key)}. Your first month was ${monthLabel(registrationMonth)}.`,
    };
  }
  return {
    title: 'No rewards here',
    body: `You don't have any rewards in ${monthLabel(key)}.`,
  };
}
