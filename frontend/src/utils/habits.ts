import type { Habit, HabitShift } from "../types";
import { formatDateStr } from "./date";

const DAY_NAMES_SHORT = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function getDaysText(days: number[]): string {
  if (days.length === 7) return "every day";
  if (days.length === 5 && !days.includes(0) && !days.includes(6))
    return "weekdays";
  if (days.length === 2 && days.includes(0) && days.includes(6))
    return "weekends";
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_NAMES_SHORT[d])
    .join(", ");
}

/**
 * Returns the habits that are active on a given date, accounting for shifts and skips.
 *
 * Rules (evaluated in order):
 *  1. If the habit has a shift with `to` == dateStr → include it (shifted here)
 *  2. If the habit has a shift with `from` == dateStr → exclude it (shifted away or skipped)
 *  3. Otherwise active if `days` includes date.getDay()
 */
export function getHabitsForDay(habits: Habit[], date: Date): Habit[] {
  const dateStr = formatDateStr(date);
  const dayOfWeek = date.getDay();

  return habits.filter((h) => {
    const shiftFrom = h.shifts.find((s) => s.from === dateStr);
    const shiftTo = h.shifts.find((s) => s.to === dateStr);

    if (shiftTo) return true; // shifted to this day
    if (shiftFrom) return false; // shifted away or skipped
    return h.days.includes(dayOfWeek); // normal recurring schedule
  });
}

/**
 * Returns the date string (YYYY-MM-DD) for a given weekday (0=Sun…6=Sat)
 * within the same week as `date`.
 */
export function getDateForWeekday(date: Date, weekday: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + weekday);
  d.setHours(0, 0, 0, 0);
  return formatDateStr(d);
}

/**
 * Returns the shift entry for a habit on a given date (keyed by `from`), or null.
 * Used by the UI to show "cancel shift/skip" vs "shift / skip day".
 */
export function getShiftForDay(
  habit: Habit,
  dateStr: string,
): HabitShift | null {
  return habit.shifts.find((s) => s.from === dateStr) ?? null;
}
