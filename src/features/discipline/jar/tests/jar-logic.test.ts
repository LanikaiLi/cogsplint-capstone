import {
  buildPhotoPath,
  calculateBalance,
  canUndoCheckIn,
  checkMonth,
  earnedByMonth,
  dollarsToPoints,
  formatMoney,
  groupRewardsByMonth,
  monthKey,
  monthLabel,
  monthMessage,
  previousMonths,
  moneyEquivalent,
  parseDollars,
  parseExchangeRate,
  validateReward,
} from '@/features/discipline/jar/jar-logic';

describe('calculateBalance', () => {
  it('is points earned minus points spent', () => {
    const earned = [{ points_earned: 8 }, { points_earned: 5 }, { points_earned: 15 }];
    const spent = [{ points_spent: 20 }];
    expect(calculateBalance(earned, spent)).toBe(8);
  });

  it('is 0 with no records', () => {
    expect(calculateBalance([], [])).toBe(0);
  });

  it('goes down when a check-in is undone (its row is gone)', () => {
    const before = calculateBalance([{ points_earned: 10 }, { points_earned: 5 }], []);
    const after = calculateBalance([{ points_earned: 10 }], []);
    expect(before - after).toBe(5);
  });
});

describe('moneyEquivalent and formatMoney', () => {
  it('divides points by the exchange rate', () => {
    expect(moneyEquivalent(186, 10)).toBe(18.6);
    expect(moneyEquivalent(186, 100)).toBe(1.86);
  });

  it('rounds to cents', () => {
    expect(moneyEquivalent(10, 3)).toBe(3.33);
  });

  it('is 0 for a bad rate instead of dividing by zero', () => {
    expect(moneyEquivalent(50, 0)).toBe(0);
  });

  it('shows two decimals with a dollar sign', () => {
    expect(formatMoney(18.6)).toBe('$18.60');
    expect(formatMoney(0)).toBe('$0.00');
  });
});

describe('parseExchangeRate', () => {
  it('accepts positive numbers, including decimals', () => {
    expect(parseExchangeRate('10')).toBe(10);
    expect(parseExchangeRate(' 12.5 ')).toBe(12.5);
  });

  it('rejects empty, zero, negative and non-numbers', () => {
    expect(parseExchangeRate('')).toBeNull();
    expect(parseExchangeRate('0')).toBeNull();
    expect(parseExchangeRate('-5')).toBeNull();
    expect(parseExchangeRate('abc')).toBeNull();
  });
});

describe('parseDollars and dollarsToPoints', () => {
  it('reads a positive amount', () => {
    expect(parseDollars('3.5')).toBe(3.5);
    expect(parseDollars('')).toBeNull();
    expect(parseDollars('0')).toBeNull();
    expect(parseDollars('abc')).toBeNull();
  });

  it('converts dollars to whole points with the exchange rate', () => {
    expect(dollarsToPoints(3, 10)).toBe(30);
    expect(dollarsToPoints(2.5, 10)).toBe(25);
    expect(dollarsToPoints(1.99, 10)).toBe(20);
  });
});

describe('validateReward', () => {
  const base = { description: 'Coffee', dollars: 2 as number | null, rate: 10, balance: 186 };

  it('accepts a reward the user can afford', () => {
    expect(validateReward(base)).toBeNull();
    expect(validateReward({ ...base, dollars: 18.6 })).toBeNull();
  });

  it('needs a description', () => {
    expect(validateReward({ ...base, description: '   ' })).not.toBeNull();
  });

  it('needs an amount', () => {
    expect(validateReward({ ...base, dollars: null })).not.toBeNull();
  });

  it('rejects an amount that rounds to less than 1 point', () => {
    expect(validateReward({ ...base, dollars: 0.01 })).not.toBeNull();
  });

  it('cannot cost more than the jar holds, and says so in dollars', () => {
    const message = validateReward({ ...base, dollars: 18.7 });
    expect(message).toContain('$18.60');
  });
});

describe('canUndoCheckIn', () => {
  it('allows undo when the balance stays at 0 or more', () => {
    expect(canUndoCheckIn(30, 10)).toBe(true);
    expect(canUndoCheckIn(10, 10)).toBe(true);
  });

  it('blocks undo when the points were already spent on a reward', () => {
    expect(canUndoCheckIn(5, 10)).toBe(false);
    expect(canUndoCheckIn(0, 1)).toBe(false);
  });
});

describe('buildPhotoPath', () => {
  it('puts the photo in the user own folder', () => {
    const path = buildPhotoPath('user-123', 1700000000000, 'abc');
    expect(path).toBe('user-123/1700000000000-abc.jpg');
    expect(path.startsWith('user-123/')).toBe(true);
  });
});

describe('earnedByMonth', () => {
  it('is empty when there are no check-ins', () => {
    expect(earnedByMonth([], '2026-11')).toEqual([]);
  });

  it('adds up points per month and counts quiet months as 0', () => {
    const logs = [
      { completed_date: '2026-09-10', points_earned: 8 },
      { completed_date: '2026-09-11', points_earned: 5 },
      { completed_date: '2026-11-02', points_earned: 10 },
    ];
    expect(earnedByMonth(logs, '2026-11').map((month) => [month.key, month.total])).toEqual([
      ['2026-09', 13],
      ['2026-10', 0],
      ['2026-11', 10],
    ]);
  });

  it('shows only the last 6 months', () => {
    const logs = [
      { completed_date: '2026-01-05', points_earned: 4 },
      { completed_date: '2026-11-05', points_earned: 6 },
    ];
    const months = earnedByMonth(logs, '2026-11');
    expect(months).toHaveLength(6);
    expect(months[0].key).toBe('2026-06');
    expect(months[5].total).toBe(6);
  });

  it('crosses a year end', () => {
    const logs = [{ completed_date: '2026-11-20', points_earned: 3 }];
    expect(earnedByMonth(logs, '2027-01').map((month) => month.key)).toEqual(['2026-11', '2026-12', '2027-01']);
  });

  it('is a single point when the first check-in is this month', () => {
    const months = earnedByMonth([{ completed_date: '2026-11-14', points_earned: 4 }], '2026-11');
    expect(months).toEqual([{ key: '2026-11', label: 'November 2026', total: 4 }]);
  });
});

describe('monthKey and monthLabel', () => {
  it('builds a sortable key and a readable label', () => {
    expect(monthKey(2026, 2)).toBe('2026-03');
    expect(monthLabel('2026-03')).toBe('March 2026');
    expect(monthLabel('2026-12')).toBe('December 2026');
  });
});

describe('groupRewardsByMonth', () => {
  // Noon on the 15th, so the month is the same in every time zone.
  const reward = (created_at: string, points_spent: number) => ({ created_at, points_spent });

  it('groups by month, newest month first, and adds up the points', () => {
    const groups = groupRewardsByMonth([
      reward('2026-11-15T12:00:00', 20),
      reward('2026-10-15T12:00:00', 50),
      reward('2026-11-14T12:00:00', 45),
      reward('2026-10-14T12:00:00', 35),
    ]);
    expect(groups.map((group) => group.key)).toEqual(['2026-11', '2026-10']);
    expect(groups[0].rewards).toHaveLength(2);
    expect(groups[0].pointsSpent).toBe(65);
    expect(groups[1].label).toBe('October 2026');
    expect(groups[1].pointsSpent).toBe(85);
  });

  it('returns nothing when there are no rewards', () => {
    expect(groupRewardsByMonth([])).toEqual([]);
  });
});

describe('checkMonth', () => {
  const withRewards = ['2026-11', '2026-10'];

  it('allows a month that has rewards', () => {
    expect(checkMonth('2026-10', withRewards, '2026-09')).toBe('ok');
  });

  it('says empty for a month after sign-up without rewards', () => {
    expect(checkMonth('2026-09', withRewards, '2026-09')).toBe('empty');
  });

  it('says before-signup for a month before the first month', () => {
    expect(checkMonth('2026-03', withRewards, '2026-09')).toBe('before-signup');
  });
});

describe('monthMessage', () => {
  it('explains an empty month', () => {
    expect(monthMessage('empty', '2026-03', '2026-01').body).toBe("You don't have any rewards in March 2026.");
  });

  it('explains a month before sign-up', () => {
    expect(monthMessage('before-signup', '2026-03', '2026-09').body).toBe(
      "You hadn't started using Cogsplint in March 2026. Your first month was September 2026.",
    );
  });
});

describe('previousMonths', () => {
  it('lists the months before, newest first', () => {
    expect(previousMonths('2026-11', 2)).toEqual(['2026-10', '2026-09']);
  });

  it('crosses a year start', () => {
    expect(previousMonths('2027-01', 2)).toEqual(['2026-12', '2026-11']);
  });
});
