import {
  countDone,
  currentTimeBlock,
  groupByTimeBlock,
  isPastBlock,
} from '@/features/discipline/today/today-logic';

describe('currentTimeBlock', () => {
  it('switches at 12:00 and 17:00', () => {
    expect(currentTimeBlock(new Date(2026, 10, 14, 0, 0))).toBe('morning');
    expect(currentTimeBlock(new Date(2026, 10, 14, 11, 59))).toBe('morning');
    expect(currentTimeBlock(new Date(2026, 10, 14, 12, 0))).toBe('afternoon');
    expect(currentTimeBlock(new Date(2026, 10, 14, 16, 59))).toBe('afternoon');
    expect(currentTimeBlock(new Date(2026, 10, 14, 17, 0))).toBe('evening');
    expect(currentTimeBlock(new Date(2026, 10, 14, 23, 59))).toBe('evening');
  });
});

describe('isPastBlock', () => {
  it('is true only for blocks earlier in the day', () => {
    expect(isPastBlock('morning', 'afternoon')).toBe(true);
    expect(isPastBlock('morning', 'evening')).toBe(true);
    expect(isPastBlock('afternoon', 'evening')).toBe(true);
    expect(isPastBlock('afternoon', 'afternoon')).toBe(false);
    expect(isPastBlock('evening', 'morning')).toBe(false);
  });

  it('never treats Anytime as past', () => {
    expect(isPastBlock('anytime', 'evening')).toBe(false);
  });
});

describe('groupByTimeBlock', () => {
  const tasks = [
    { id: '1', time_block: 'evening' as const },
    { id: '2', time_block: 'morning' as const },
    { id: '3', time_block: 'anytime' as const },
    { id: '4', time_block: 'morning' as const },
  ];

  it('orders groups Morning, Afternoon, Evening, Anytime and hides empty ones', () => {
    const groups = groupByTimeBlock(tasks);
    expect(groups.map((group) => group.value)).toEqual(['morning', 'evening', 'anytime']);
    expect(groups[0].tasks.map((task) => task.id)).toEqual(['2', '4']);
  });

  it('returns no groups when there are no tasks', () => {
    expect(groupByTimeBlock([])).toEqual([]);
  });
});

describe('countDone', () => {
  it('counts only tasks that have a check-in', () => {
    const tasks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(countDone(tasks, [{ discipline_id: 'a' }, { discipline_id: 'c' }])).toBe(2);
  });

  it('ignores check-ins for tasks that are no longer in the list', () => {
    expect(countDone([{ id: 'a' }], [{ discipline_id: 'deleted-task' }])).toBe(0);
  });

  it('is 0 when nothing is checked in', () => {
    expect(countDone([{ id: 'a' }], [])).toBe(0);
  });
});
