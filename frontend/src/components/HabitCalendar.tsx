import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import type { Activity, Habit } from "../types";
import { formatDateStr } from "../utils/date";

interface HabitCalendarProps {
  currentDate: Date;
  habits: Habit[];
  activities: Activity[];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (date: Date) => void;
  onJumpToToday: () => void;
}


function getHabitsForDay(habits: Habit[], date: Date): Habit[] {
  return habits.filter((h) => h.days.includes(date.getDay()));
}

function getActivitiesForDay(activities: Activity[], date: Date): Activity[] {
  const dateStr = formatDateStr(date);
  return activities.filter((a) => a.date === dateStr);
}

function getCompletionPercentage(habits: Habit[], date: Date): number {
  const habitsForDay = getHabitsForDay(habits, date);
  const dateStr = formatDateStr(date);

  const completedHabitIds = habits
    .filter((h) => h.completions.includes(dateStr))
    .map((h) => h.id);

  const scheduledHabitIds = new Set(habitsForDay.map((h) => h.id));
  const completedUnscheduledCount = completedHabitIds.filter(
    (id) => !scheduledHabitIds.has(id),
  ).length;

  const totalExpected = habitsForDay.length + completedUnscheduledCount;
  if (totalExpected === 0) return 0;

  return (completedHabitIds.length / totalExpected) * 100;
}

function getCompletionColors(habits: Habit[], date: Date): string[] {
  const dateStr = formatDateStr(date);
  return habits
    .filter((h) => h.completions.includes(dateStr))
    .map((h) => h.color);
}

export default function HabitCalendar({
  currentDate,
  habits,
  activities,
  onPreviousMonth,
  onNextMonth,
  onDayClick,
  onJumpToToday,
}: HabitCalendarProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: (number | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const renderDay = (day: number | null, index: number) => {
    if (day === null) {
      return <div key={`empty-${index}`} className="aspect-square" />;
    }

    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    const isToday = date.getTime() === today.getTime();
    const percentage = getCompletionPercentage(habits, date);
    const colors = getCompletionColors(habits, date);
    const habitsForDay = getHabitsForDay(habits, date);
    const activitiesForDay = getActivitiesForDay(activities, date);
    const hasHabits = habitsForDay.length > 0;
    const activityCount = activitiesForDay.length;

    const dateLabel = date.toLocaleDateString("default", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return (
      <button
        key={day}
        onClick={() => onDayClick(date)}
        aria-label={dateLabel}
        className="aspect-square flex items-center justify-center relative group cursor-pointer rounded-lg transition-colors hover:bg-primary/10"
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {hasHabits && (
            <svg
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 36 36"
            >
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="rgba(96, 93, 255, 0.15)"
                strokeWidth="2.5"
              />
              {percentage > 0 && colors.length > 0 && (
                <>
                  <defs>
                    <linearGradient
                      id={`gradient-${day}`}
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      {colors.length === 1 ? (
                        <>
                          <stop offset="0%" stopColor={colors[0]} />
                          <stop offset="100%" stopColor={colors[0]} />
                        </>
                      ) : (
                        colors.map((color, idx) => (
                          <stop
                            key={idx}
                            offset={`${(idx / (colors.length - 1)) * 100}%`}
                            stopColor={color}
                          />
                        ))
                      )}
                    </linearGradient>
                  </defs>
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke={`url(#gradient-${day})`}
                    strokeWidth="2.5"
                    strokeDasharray={`${(percentage / 100) * 87.96} 87.96`}
                    strokeLinecap="round"
                  />
                </>
              )}
            </svg>
          )}
          <span
            className={`relative z-10 text-xs leading-none ${
              isToday
                ? "text-primary font-bold"
                : "text-base-content font-normal"
            }`}
          >
            {day}
          </span>
          {activityCount > 0 && (
            <div className="absolute top-[2px] right-[2px]">
              <div className="min-w-[16px] h-[16px] bg-warning rounded-full flex items-center justify-center px-[3px]">
                <span className="text-[9px] font-bold text-white leading-none">
                  {activityCount}
                </span>
              </div>
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="bg-base-200 rounded-lg p-2 sm:p-3 shadow-sm">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={onPreviousMonth}
          className="text-base-content hover:text-primary transition-colors p-1"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-base-content text-sm font-semibold">
            {new Date(year, month).toLocaleDateString("default", { month: "short" })} {year}
          </div>
          <button
            onClick={onJumpToToday}
            className="text-primary hover:text-primary/70 transition-colors p-1"
            aria-label="Jump to today"
            title="Jump to today"
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onNextMonth}
          className="text-base-content hover:text-primary transition-colors p-1"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
        {["su", "mo", "tu", "we", "th", "fr", "sa"].map((day) => (
          <div
            key={day}
            className="text-center text-base-content/50 text-[10px] font-normal uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {days.map((day, index) => renderDay(day, index))}
      </div>
    </div>
  );
}
