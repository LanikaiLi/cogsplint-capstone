import { addDays, daysBetween, localDateString } from '@/features/discipline/shared/date-logic';

describe('localDateString', () => {
  it('uses the local date with zero padding', () => {
    expect(localDateString(new Date(2026, 0, 5, 9, 30))).toBe('2026-01-05');
    expect(localDateString(new Date(2026, 10, 14, 15, 0))).toBe('2026-11-14');
  });

  it('is a different string on the next day, so every task shows as not done again', () => {
    const today = localDateString(new Date(2026, 10, 14, 23, 59));
    const tomorrow = localDateString(new Date(2026, 10, 15, 0, 0));
    expect(tomorrow).not.toBe(today);
    expect(tomorrow).toBe('2026-11-15');
  });

  it('rolls over month and year ends', () => {
    expect(localDateString(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
    expect(localDateString(new Date(2027, 0, 1, 0, 0))).toBe('2027-01-01');
  });
});

describe('addDays and daysBetween', () => {
  it('moves across month and year ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-11-14', 0)).toBe('2026-11-14');
  });

  it('counts days between two dates', () => {
    expect(daysBetween('2026-11-01', '2026-11-30')).toBe(29);
    expect(daysBetween('2026-11-14', '2026-11-14')).toBe(0);
    expect(daysBetween('2026-11-14', '2026-11-10')).toBe(-4);
  });
});
