import {
  businessClock,
  formatAvailabilityDays,
  formatAvailabilityHours,
  groupAvailability,
  isWithinWeeklyAvailability,
} from '@/modules/public-worker/public-worker-model';
import { weekdayLabels } from '@/modules/worker/types';

const weekdays = [1, 2, 3, 4, 5, 6].map((day) => ({ day_of_week: day, start_time: '08:00', end_time: '18:00' }));

describe('MOD-05 public availability presentation', () => {
  test('groups identical ranges and keeps distinct ranges separate', () => {
    const groups = groupAvailability([
      ...weekdays,
      { day_of_week: 0, start_time: '09:00', end_time: '12:00' },
      { day_of_week: 1, start_time: '19:00', end_time: '21:00' },
    ]);
    expect(groups).toEqual([
      { days: [1, 2, 3, 4, 5, 6], start_time: '08:00', end_time: '18:00' },
      { days: [1], start_time: '19:00', end_time: '21:00' },
      { days: [0], start_time: '09:00', end_time: '12:00' },
    ]);
  });

  test('formats Monday-first day runs and hours', () => {
    expect(formatAvailabilityDays([1, 2, 3, 4, 5, 6], weekdayLabels)).toBe('Lunes - Sábado');
    expect(formatAvailabilityDays([3, 1], weekdayLabels)).toBe('Lunes, Miércoles');
    expect(formatAvailabilityDays([0, 1, 2, 3, 4, 5], weekdayLabels)).toBe('Lunes - Viernes, Domingo');
    expect(formatAvailabilityHours('08:00', '18:00')).toBe('8:00 a 18:00');
  });

  test('reads the clock in America/La_Paz', () => {
    // 2026-11-16 is a Monday; 14:30 UTC is 10:30 in La Paz (UTC-4).
    expect(businessClock(new Date('2026-11-16T14:30:00Z'))).toEqual({ day: 1, minutes: 630 });
    // 02:00 UTC on Tuesday is still Monday 22:00 in La Paz.
    expect(businessClock(new Date('2026-11-17T02:00:00Z'))).toEqual({ day: 1, minutes: 1320 });
  });

  test('is available only inside a published range for the current weekday', () => {
    expect(isWithinWeeklyAvailability(weekdays, { day: 1, minutes: 8 * 60 })).toBe(true);
    expect(isWithinWeeklyAvailability(weekdays, { day: 1, minutes: 18 * 60 })).toBe(false);
    expect(isWithinWeeklyAvailability(weekdays, { day: 0, minutes: 10 * 60 })).toBe(false);
    expect(isWithinWeeklyAvailability(weekdays, null)).toBe(false);
    expect(isWithinWeeklyAvailability([], { day: 1, minutes: 600 })).toBe(false);
  });
});
