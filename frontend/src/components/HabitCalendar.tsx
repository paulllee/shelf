import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import type { Activity, Habit } from "../types";
import { formatDateStr } from "../utils/date";
import { getHabitsForDay } from "../utils/habits";

const DAY_HEADERS = ["su", "mo", "tu", "we", "th", "fr", "sa"] as const;

interface HabitCalendarProps {
  currentDate: Date;
  habits: Habit[];
  activities: Activity[];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (date: Date) => void;
  onJumpToToday: () => void;
}

interface DayData {
  date: Date;
  percentage: number;
  colors: string[];
  hasHabits: boolean;
  activityCount: number;
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

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const days = useMemo<(number | null)[]>(() => {
    const result: (number | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      result.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      result.push(i);
    }
    return result;
  }, [startingDayOfWeek, daysInMonth]);

  // Pre-compute all day data in a single pass instead of per-day
  const dayDataMap = useMemo(() => {
    // Build activity lookup by date string
    const activityByDate = new Map<string, number>();
    for (const a of activities) {
      activityByDate.set(a.date, (activityByDate.get(a.date) ?? 0) + 1);
    }

    const map = new Map<number, DayData>();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const dateStr = formatDateStr(date);

      const habitsForDay = getHabitsForDay(habits, date);
      const scheduledIds = new Set(habitsForDay.map((h) => h.id));

      const completedColors: string[] = [];
      let completedCount = 0;
      let completedUnscheduledCount = 0;

      for (const h of habits) {
        if (h.completions.includes(dateStr)) {
          completedColors.push(h.color);
          completedCount++;
          if (!scheduledIds.has(h.id)) completedUnscheduledCount++;
        }
      }

      const totalExpected = habitsForDay.length + completedUnscheduledCount;
      const percentage =
        totalExpected > 0 ? (completedCount / totalExpected) * 100 : 0;

      map.set(day, {
        date,
        percentage,
        colors: completedColors,
        hasHabits: habitsForDay.length > 0,
        activityCount: activityByDate.get(dateStr) ?? 0,
      });
    }
    return map;
  }, [habits, activities, year, month, daysInMonth]);

  const renderDay = (day: number | null, index: number) => {
    if (day === null) {
      return <div key={`empty-${index}`} className="aspect-square" />;
    }

    const data = dayDataMap.get(day)!;
    const { date, percentage, colors, hasHabits, activityCount } = data;
    const isToday = date.getTime() === today.getTime();

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
        className="aspect-square flex items-center justify-center relative group cursor-pointer rounded-lg transition-colors motion-reduce:transition-none hover:bg-primary/10"
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
                className="stroke-primary/15"
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
              <div className="min-w-[16px] h-[16px] bg-primary rounded-full grid place-items-center px-[3px]">
                <span className="text-[9px] font-bold text-primary-content leading-[1] tabular-nums">
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
    <div className="bg-base-200 rounded-lg p-2 sm:p-3">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={onPreviousMonth}
          className="text-base-content hover:text-primary transition-colors motion-reduce:transition-none p-1"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-base-content text-sm font-semibold">
            {new Date(year, month).toLocaleDateString("default", {
              month: "short",
            })}{" "}
            {year}
          </div>
          <button
            onClick={onJumpToToday}
            className="text-primary hover:text-primary/70 transition-colors motion-reduce:transition-none p-1"
            aria-label="Jump to today"
            title="Jump to today"
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onNextMonth}
          className="text-base-content hover:text-primary transition-colors motion-reduce:transition-none p-1"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
        {DAY_HEADERS.map((day) => (
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
