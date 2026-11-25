import {
  averageCompletion,
  currentStreak,
  dayDetail,
  dayStats,
  heatLevel,
  perfectDays,
  taskStats,
  type LogRecord,
  type TaskRecord,
} from '@/features/discipline/analysis/analysis-logic';

// Noon timestamps, so the local date is the same in every time zone.
const task = (id: string, created: string, archived: string | null = null): TaskRecord => ({
  id,
  title: `Task ${id}`,
  is_active: archived === null,
  created_at: `${created}T12:00:00`,
  archived_at: archived ? `${archived}T12:00:00` : null,
});
const log = (discipline_id: string, completed_date: string): LogRecord => ({ discipline_id, completed_date });

describe('dayStats', () => {
  it('counts done tasks out of the tasks that existed that day', () => {
    const tasks = [task('a', '2026-11-01'), task('b', '2026-11-01')];
    const logs = [log('a', '2026-11-02'), log('b', '2026-11-02'), log('a', '2026-11-03')];
    const days = dayStats(tasks, logs, '2026-11-03', 3);
    expect(days.map((day) => [day.date, day.done, day.total])).toEqual([
      ['2026-11-01', 0, 2],
      ['2026-11-02', 2, 2],
      ['2026-11-03', 1, 2],
    ]);
  });

  it('does not count a task before it was created', () => {
    const tasks = [task('a', '2026-11-01'), task('b', '2026-11-03')];
    const days = dayStats(tasks, [], '2026-11-03', 3);
    expect(days.map((day) => day.total)).toEqual([1, 1, 2]);
  });

  it('stops counting a deleted task after the day it was deleted, but keeps days it was done', () => {
    const tasks = [task('a', '2026-11-01', '2026-11-03')];
    const days = dayStats(tasks, [log('a', '2026-11-03')], '2026-11-04', 4);
    expect(days.map((day) => day.total)).toEqual([1, 1, 1, 0]);
  });
});

describe('heatLevel', () => {
  it('is the lightest for no tasks or nothing done', () => {
    expect(heatLevel({ done: 0, total: 0 })).toBe(0);
    expect(heatLevel({ done: 0, total: 4 })).toBe(0);
  });

  it('gets darker as more of the list is done', () => {
    expect(heatLevel({ done: 1, total: 4 })).toBe(1);
    expect(heatLevel({ done: 2, total: 4 })).toBe(2);
    expect(heatLevel({ done: 3, total: 4 })).toBe(3);
    expect(heatLevel({ done: 4, total: 4 })).toBe(4);
  });
});

describe('currentStreak', () => {
  it('counts days in a row up to today', () => {
    const logs = [log('a', '2026-11-12'), log('a', '2026-11-13'), log('a', '2026-11-14'), log('a', '2026-11-10')];
    expect(currentStreak(logs, '2026-11-14')).toBe(3);
  });

  it('does not break when today has no check-in yet', () => {
    const logs = [log('a', '2026-11-12'), log('a', '2026-11-13')];
    expect(currentStreak(logs, '2026-11-14')).toBe(2);
  });

  it('is 0 after a missed day', () => {
    expect(currentStreak([log('a', '2026-11-11')], '2026-11-14')).toBe(0);
    expect(currentStreak([], '2026-11-14')).toBe(0);
  });

  it('counts a day once even with several tasks done', () => {
    const logs = [log('a', '2026-11-14'), log('b', '2026-11-14')];
    expect(currentStreak(logs, '2026-11-14')).toBe(1);
  });
});

describe('averageCompletion and perfectDays', () => {
  const days = [
    { date: '1', done: 2, total: 2 },
    { date: '2', done: 1, total: 2 },
    { date: '3', done: 0, total: 0 },
  ];

  it('averages the days that had tasks, skipping days with none', () => {
    expect(averageCompletion(days)).toBe(75);
  });

  it('is null with nothing to average', () => {
    expect(averageCompletion([{ date: '1', done: 0, total: 0 }])).toBeNull();
    expect(averageCompletion([])).toBeNull();
  });

  it('counts days where everything was done', () => {
    expect(perfectDays(days)).toBe(1);
  });
});

describe('taskStats', () => {
  it('counts the days done in the last 30 days, as a count and a percent', () => {
    const tasks = [task('a', '2026-01-01')];
    const logs = [log('a', '2026-11-12'), log('a', '2026-11-13'), log('a', '2026-11-14')];
    expect(taskStats(tasks, logs, '2026-11-14', 30)[0]).toMatchObject({ done: 3, rate: 10 });
  });

  it('ignores check-ins older than 30 days', () => {
    const logs = [log('a', '2026-10-15'), log('a', '2026-10-16')];
    // The window is Oct 16 to Nov 14, so Oct 15 is outside it.
    expect(taskStats([task('a', '2026-01-01')], logs, '2026-11-14', 30)[0].done).toBe(1);
  });

  it('measures a new task over the same 30 days, and skips deleted tasks', () => {
    const tasks = [task('a', '2026-11-13'), task('b', '2026-11-01', '2026-11-10')];
    const stats = taskStats(tasks, [log('a', '2026-11-14')], '2026-11-14', 30);
    expect(stats).toHaveLength(1);
    expect(stats[0]).toMatchObject({ done: 1, rate: 3 });
  });
});

describe('dayDetail', () => {
  it('lists the tasks of that day and which were done', () => {
    const tasks = [task('a', '2026-11-01'), task('b', '2026-11-01'), task('c', '2026-11-13')];
    const detail = dayDetail(tasks, [log('a', '2026-11-12')], '2026-11-12');
    expect(detail.tasks.map((t) => [t.id, t.done])).toEqual([
      ['a', true],
      ['b', false],
    ]);
    expect(detail).toMatchObject({ done: 1, total: 2 });
  });

  it('includes a task deleted later, but not one deleted before', () => {
    const tasks = [task('a', '2026-11-01', '2026-11-13'), task('b', '2026-11-01', '2026-11-10')];
    expect(dayDetail(tasks, [], '2026-11-12').tasks.map((t) => t.id)).toEqual(['a']);
  });

  it('is empty on a day without tasks', () => {
    expect(dayDetail([task('a', '2026-11-05')], [], '2026-11-01')).toMatchObject({ done: 0, total: 0, tasks: [] });
  });
});
