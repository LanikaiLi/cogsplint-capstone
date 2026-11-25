import { addDays, localDateString } from '@/features/discipline/shared/date-logic';

// Pure calculations for the Analysis tab. No Supabase here, so they are easy to test.

export type TaskRecord = {
  id: string;
  title: string;
  is_active: boolean;
  created_at: string;
  archived_at: string | null;
};
export type LogRecord = { discipline_id: string; completed_date: string };
// One day: how many tasks the user had, and how many they did.
export type DayStat = { date: string; done: number; total: number };

function localDateOf(timestamp: string): string {
  return localDateString(new Date(timestamp));
}

// One entry per day for the last `days` days, ending on `endDate`.
// A task counts for a day if it existed on that day (created on or before it, not yet deleted),
// or if it was done that day. So adding a task later never changes the past.
export function dayStats(tasks: TaskRecord[], logs: LogRecord[], endDate: string, days: number): DayStat[] {
  const doneKeys = new Set(logs.map((log) => `${log.discipline_id}|${log.completed_date}`));
  const created = new Map(tasks.map((task) => [task.id, localDateOf(task.created_at)]));
  const deleted = new Map(tasks.map((task) => [task.id, task.archived_at ? localDateOf(task.archived_at) : null]));

  const result: DayStat[] = [];
  for (let back = days - 1; back >= 0; back--) {
    const date = addDays(endDate, -back);
    let total = 0;
    let done = 0;
    for (const task of tasks) {
      const wasDone = doneKeys.has(`${task.id}|${date}`);
      const deletedOn = deleted.get(task.id) ?? null;
      const existed = (created.get(task.id) as string) <= date && (deletedOn === null || date < deletedOn);
      if (existed || wasDone) {
        total += 1;
        if (wasDone) {
          done += 1;
        }
      }
    }
    result.push({ date, done, total });
  }
  return result;
}

// Shade of a heatmap cell, 0 (lightest) to 4 (darkest), by how much of that day's list was done.
// A day with no tasks, or with nothing done, is the lightest. It is never shown as a failure.
export function heatLevel(day: { done: number; total: number }): 0 | 1 | 2 | 3 | 4 {
  if (day.total === 0 || day.done === 0) {
    return 0;
  }
  const ratio = day.done / day.total;
  if (ratio >= 1) {
    return 4;
  }
  if (ratio <= 1 / 3) {
    return 1;
  }
  return ratio <= 2 / 3 ? 2 : 3;
}

// Days in a row with at least one task done. If today has nothing yet, we count from yesterday,
// because today is not over.
export function currentStreak(logs: LogRecord[], today: string): number {
  const doneDates = new Set(logs.map((log) => log.completed_date));
  let cursor = doneDates.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (doneDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// Average of the daily completion rates, as a whole percent. Days without tasks are skipped.
// Returns null when there is nothing to average.
export function averageCompletion(days: DayStat[]): number | null {
  const withTasks = days.filter((day) => day.total > 0);
  if (withTasks.length === 0) {
    return null;
  }
  const sum = withTasks.reduce((total, day) => total + day.done / day.total, 0);
  return Math.round((sum / withTasks.length) * 100);
}

// Days where every task was done.
export function perfectDays(days: DayStat[]): number {
  return days.filter((day) => day.total > 0 && day.done === day.total).length;
}

export type TaskStat = { id: string; title: string; done: number; rate: number };

// For each current task: on how many of the last `windowDays` days it was done, and that as a percent.
// Every task is measured over the same window, whether it is new or old.
export function taskStats(tasks: TaskRecord[], logs: LogRecord[], today: string, windowDays = 30): TaskStat[] {
  const windowStart = addDays(today, -(windowDays - 1));
  return tasks
    .filter((task) => task.is_active)
    .map((task) => {
      const done = logs.filter(
        (log) => log.discipline_id === task.id && log.completed_date >= windowStart && log.completed_date <= today,
      ).length;
      return { id: task.id, title: task.title, done, rate: Math.round((done / windowDays) * 100) };
    });
}

export type DayDetail = {
  date: string;
  done: number;
  total: number;
  tasks: { id: string; title: string; done: boolean }[];
};

// What the user did on one day: each task they had that day, and whether it was done.
// Uses the same rule as dayStats, so the numbers always match the heatmap.
export function dayDetail(tasks: TaskRecord[], logs: LogRecord[], date: string): DayDetail {
  const doneIds = new Set(logs.filter((log) => log.completed_date === date).map((log) => log.discipline_id));
  const list = tasks
    .filter((task) => {
      const createdOn = localDateOf(task.created_at);
      const deletedOn = task.archived_at ? localDateOf(task.archived_at) : null;
      return (createdOn <= date && (deletedOn === null || date < deletedOn)) || doneIds.has(task.id);
    })
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
    .map((task) => ({ id: task.id, title: task.title, done: doneIds.has(task.id) }));
  return { date, done: list.filter((task) => task.done).length, total: list.length, tasks: list };
}
