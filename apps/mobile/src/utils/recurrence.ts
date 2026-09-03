/**
 * Pure recurrence helpers (US-008).
 * Anchored monthly/yearly logic with end-of-month clamp, no SQLite/React deps.
 */

export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly' | 'every_n_days';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function formatIso(year: number, month1: number, day: number): string {
  return `${year}-${pad2(month1)}-${pad2(day)}`;
}

function parseIso(iso: string): { year: number; month1: number; day: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month1: m, day: d };
}

function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

function addDaysIso(iso: string, days: number): string {
  const { year, month1, day } = parseIso(iso);
  const date = new Date(year, month1 - 1, day);
  date.setDate(date.getDate() + days);
  return formatIso(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function addMonthsClamped(iso: string, monthsToAdd: number): string {
  const { year, month1, day } = parseIso(iso);
  let totalMonths = year * 12 + (month1 - 1) + monthsToAdd;
  // Handle negative gracefully (not needed for forward-only, but keep correct)
  const newYear = Math.floor(totalMonths / 12);
  let newMonth1 = (totalMonths % 12) + 1;
  if (newMonth1 <= 0) {
    newMonth1 += 12;
  }
  const dim = daysInMonth(newYear, newMonth1);
  const newDay = Math.min(day, dim);
  return formatIso(newYear, newMonth1, newDay);
}

function addYearsClamped(iso: string, yearsToAdd: number): string {
  return addMonthsClamped(iso, yearsToAdd * 12);
}

export function nextOccurrence(
  fromIso: string,
  frequency: RecurrenceFrequency,
  intervalDays?: number | null,
): string {
  switch (frequency) {
    case 'weekly':
      return addDaysIso(fromIso, 7);
    case 'every_n_days': {
      const n = intervalDays ?? 0;
      if (!Number.isFinite(n) || n < 1) {
        throw new Error('interval_days must be >= 1 for every_n_days frequency.');
      }
      return addDaysIso(fromIso, n);
    }
    case 'monthly':
      return addMonthsClamped(fromIso, 1);
    case 'yearly':
      return addYearsClamped(fromIso, 1);
    default:
      throw new Error(`Unknown frequency: ${frequency as string}`);
  }
}

export function computeCatchUpDates(
  nextExecutionIso: string,
  asOfIso: string,
  frequency: RecurrenceFrequency,
  intervalDays?: number | null,
): string[] {
  if (nextExecutionIso > asOfIso) {
    return [];
  }
  const dates: string[] = [];
  let current = nextExecutionIso;
  // Safety cap: avoid infinite loops on bad data (e.g. every_n_days with 0)
  const MAX_ITERATIONS = 1000;
  let iterations = 0;
  while (current <= asOfIso && iterations < MAX_ITERATIONS) {
    dates.push(current);
    iterations += 1;
    const next = nextOccurrence(current, frequency, intervalDays);
    // Guard against non-advancing next (should not happen with valid inputs)
    if (next <= current) {
      break;
    }
    current = next;
  }
  return dates;
}
