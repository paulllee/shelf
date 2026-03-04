import {
  Check,
  Trash2,
  Edit2,
  MoreVertical,
  CalendarClock,
  Ban,
  X,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Habit } from "../types";
import { formatDateStr } from "../utils/date";
import { getShiftForDay } from "../utils/habits";
import confetti from "canvas-confetti";

interface HabitListProps {
  habits: Habit[];
  date: Date;
  onToggle: (habitId: string, dateStr: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
  onShift?: (habitId: string, fromDate: string, toDate: string | null) => void;
  onCancelShift?: (habitId: string, fromDate: string) => void;
}

const DAY_NAMES = ["su", "mo", "tu", "we", "th", "fr", "sa"];
const DAY_FULL_NAMES = [
  "sunday", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday",
];

function getDaysText(days: number[]): string {
  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  if (days.length === 7) return "every day";
  if (days.length === 5 && !days.includes(0) && !days.includes(6))
    return "weekdays";
  if (days.length === 2 && days.includes(0) && days.includes(6))
    return "weekends";
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => dayNames[d])
    .join(", ");
}

export default function HabitList({
  habits,
  date,
  onToggle,
  onEdit,
  onDelete,
  onShift,
  onCancelShift,
}: HabitListProps) {
  const dateStr = formatDateStr(date);

  // Compute the correct "from" date for a habit's shift operation.
  // - If scheduled today normally: use today
  // - If shifted TO today from another day: use that original day
  // - Otherwise (other habits): use their next upcoming scheduled day this week
  function getFromDateStr(habit: Habit): string {
    if (habit.days.includes(date.getDay())) return dateStr;
    const shiftedHere = habit.shifts.find((s) => s.to === dateStr);
    if (shiftedHere) return shiftedHere.from;
    const todayDow = date.getDay();
    const upcomingDow =
      habit.days.find((d) => d > todayDow) ?? habit.days[0];
    return upcomingDow !== undefined ? getDateForWeekday(upcomingDow) : dateStr;
  }
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [shiftPickerHabitId, setShiftPickerHabitId] = useState<string | null>(
    null,
  );
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuId) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  function getDateForWeekday(weekday: number): string {
    const d = new Date(date);
    const currentDay = d.getDay();
    d.setDate(d.getDate() - currentDay + weekday);
    d.setHours(0, 0, 0, 0);
    return formatDateStr(d);
  }

  if (habits.length === 0) {
    return (
      <div className="bg-base-200 rounded-lg p-6 text-center">
        <p className="text-base-content/50 text-sm">
          no habits scheduled for today
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {habits.map((habit) => {
        const completed = habit.completions.includes(dateStr);
        const isMenuOpen = openMenuId === habit.id;
        const habitFromDate = getFromDateStr(habit);
        const fromWeekday = new Date(habitFromDate + "T12:00:00").getDay();
        const isShiftedHere = habit.shifts.some((s) => s.to === dateStr);
        return (
          <div key={habit.id}>
            <div className="bg-base-200 rounded-lg p-3 sm:p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    if (!completed) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      confetti({
                        origin: {
                          x: (rect.left + rect.width / 2) / window.innerWidth,
                          y: (rect.top + rect.height / 2) / window.innerHeight,
                        },
                        spread: 70,
                        startVelocity: 25,
                        particleCount: 60,
                        scalar: 0.8,
                        colors: [habit.color, "#ffffff", habit.color + "99"],
                      });
                    }
                    onToggle(habit.id, dateStr);
                  }}
                  className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 transition-colors motion-reduce:transition-none flex items-center justify-center"
                  style={{
                    borderColor: completed ? habit.color : `${habit.color}50`,
                    backgroundColor: completed ? habit.color : "transparent",
                  }}
                >
                  {completed && (
                    <Check
                      className="w-7 h-7 sm:w-8 sm:h-8 text-white"
                      strokeWidth={3}
                    />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-sm sm:text-base font-semibold transition-colors motion-reduce:transition-none ${
                      completed
                        ? "text-base-content/50 line-through"
                        : "text-base-content"
                    }`}
                  >
                    {habit.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: habit.color }}
                    />
                    <span className="text-base-content/50 text-xs">
                      {getDaysText(habit.days)}
                    </span>
                  </div>
                </div>

                <div className="relative" ref={isMenuOpen ? menuRef : null}>
                  <button
                    onClick={() => setOpenMenuId(isMenuOpen ? null : habit.id)}
                    className="p-2 rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-300 transition-colors"
                    aria-label="More options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-10 bg-base-100 border border-base-300 rounded-lg shadow-lg overflow-hidden min-w-[120px]">
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          onEdit(habit);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left hover:bg-base-200 transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-base-content/50" />
                        Edit
                      </button>
                      {onShift &&
                        (() => {
                          if (habit.days.length === 7) {
                            return (
                              <div className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-base-content/25 cursor-not-allowed select-none">
                                <span className="relative inline-block">
                                  <CalendarClock className="w-4 h-4" />
                                  <X className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 stroke-[3]" />
                                </span>
                                Move
                              </div>
                            );
                          }
                        })()}
                      {onShift && habit.days.length < 7 &&
                        (() => {
                          const existingShift = getShiftForDay(habit, habitFromDate);
                          if (existingShift && !isShiftedHere) {
                            return (
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onCancelShift?.(habit.id, habitFromDate);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left hover:bg-base-200 transition-colors"
                              >
                                <Ban className="w-4 h-4 text-base-content/50" />
                                cancel shift
                              </button>
                            );
                          }
                          return (
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                setShiftPickerHabitId(habit.id);
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left hover:bg-base-200 transition-colors"
                            >
                              <CalendarClock className="w-4 h-4 text-base-content/50" />
                              Move
                            </button>
                          );
                        })()}
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          if (window.confirm(`Delete habit "${habit.name}"?`)) {
                            onDelete(habit.id);
                          }
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-error hover:bg-base-200 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {shiftPickerHabitId === habit.id && (
              <div className="mt-2 p-3 bg-base-100 border border-base-300 rounded-lg">
                <p className="text-xs text-base-content/50 mb-2">
                  move {DAY_FULL_NAMES[fromWeekday]}&apos;s occurrence to:
                </p>
                <div className="flex gap-1 flex-wrap">
                  {DAY_NAMES.map((dayName, weekday) => {
                    if (
                      isShiftedHere
                        ? (habit.days.includes(weekday) && weekday !== fromWeekday) || weekday === date.getDay()
                        : habit.days.includes(weekday) || weekday === fromWeekday
                    ) return null;
                    return (
                      <button
                        key={weekday}
                        onClick={() => {
                          onShift?.(
                            habit.id,
                            habitFromDate,
                            getDateForWeekday(weekday),
                          );
                          setShiftPickerHabitId(null);
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg bg-base-200 hover:bg-primary hover:text-primary-content transition-colors font-medium"
                      >
                        {dayName}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setShiftPickerHabitId(null)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-base-200 text-base-content/50 hover:text-base-content transition-colors"
                  >
                    cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
