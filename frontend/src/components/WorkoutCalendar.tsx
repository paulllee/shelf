import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCalendar } from "../api/workouts";

const DAY_HEADERS = ["su", "mo", "tu", "we", "th", "fr", "sa"] as const;

interface WorkoutCalendarProps {
  onDateClick: (dateStr: string) => void;
}

export default function WorkoutCalendar({ onDateClick }: WorkoutCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const { data: cal } = useQuery({
    queryKey: ["calendar", year, month],
    queryFn: () => fetchCalendar(year, month),
  });

  if (!cal) {
    return (
      <div className="bg-base-200 rounded-lg p-3 sm:p-4">
        <span className="loading loading-spinner loading-sm" />
      </div>
    );
  }

  const workoutDateSet = useMemo(() => new Set(cal.workout_dates), [cal]);

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
  };

  const goPrev = () => {
    setYear(cal.prev_year);
    setMonth(cal.prev_month);
  };

  const goNext = () => {
    setYear(cal.next_year);
    setMonth(cal.next_month);
  };

  const days = Array.from({ length: cal.days_in_month }, (_, i) => i + 1);
  const blanks = Array.from({ length: cal.first_weekday }, (_, i) => i);

  return (
    <div className="bg-base-200 rounded-lg p-3 sm:p-4">
      <div className="flex justify-between items-center mb-4">
        <button
          className="btn btn-ghost btn-sm btn-square min-w-[44px] min-h-[44px]"
          onClick={goPrev}
        >
          &larr;
        </button>
        <div className="flex items-center gap-1">
          <span className="font-semibold whitespace-nowrap text-sm">
            {cal.month_name} {cal.year}
          </span>
          <button
            className="btn btn-ghost btn-sm btn-circle min-w-[44px] min-h-[44px]"
            onClick={goToday}
            title="go to today"
          >
            &#9675;
          </button>
        </div>
        <button
          className="btn btn-ghost btn-sm btn-square min-w-[44px] min-h-[44px]"
          onClick={goNext}
        >
          &rarr;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center text-xs mb-2">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-base-content/50">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center text-xs sm:text-sm">
        {blanks.map((i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const dateStr = `${cal.year}-${String(cal.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasWorkout = workoutDateSet.has(dateStr);
          const isToday = dateStr === cal.today;

          return (
            <div
              key={day}
              className={`relative py-2 sm:py-1 rounded min-h-[36px] flex items-center justify-center ${isToday ? "bg-primary/20" : ""} ${hasWorkout ? "cursor-pointer hover:bg-base-300 active:bg-base-300" : ""}`}
              onClick={hasWorkout ? () => onDateClick(dateStr) : undefined}
            >
              {day}
              {hasWorkout && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
