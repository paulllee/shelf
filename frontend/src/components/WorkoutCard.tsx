import { useMemo } from "react";
import type { Workout } from "../types";

interface WorkoutCardProps {
  workout: Workout;
  onClick: () => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .toLowerCase();
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function WorkoutCard({ workout, onClick }: WorkoutCardProps) {
  const exercises = useMemo(
    () => workout.groups.flatMap((g) => g.exercises.map((e) => e.name)),
    [workout.groups],
  );
  const preview = useMemo(
    () =>
      exercises.slice(0, 3).join(", ") + (exercises.length > 3 ? ", ..." : ""),
    [exercises],
  );

  return (
    <div
      className="card bg-base-200 shadow-sm cursor-pointer hover:bg-base-300 hover:-translate-y-0.5 transition-[colors,translate] motion-reduce:transition-none"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      data-workout-date={workout.date}
    >
      <div className="card-body p-4">
        <div>
          <h3 className="font-semibold text-lg">{formatDate(workout.date)}</h3>
          <p className="text-sm text-base-content/60">
            {formatTime(workout.time)}
          </p>
        </div>
        <p className="text-sm text-base-content/70 mt-2">{preview}</p>
      </div>
    </div>
  );
}
