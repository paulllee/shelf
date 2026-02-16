import { forwardRef } from "react";
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

const WorkoutCard = forwardRef<HTMLDivElement, WorkoutCardProps>(
  ({ workout, onClick }, ref) => {
    const exercises = workout.groups.flatMap((g) =>
      g.exercises.map((e) => e.name),
    );
    const preview =
      exercises.slice(0, 3).join(", ") + (exercises.length > 3 ? ", ..." : "");

    return (
      <div
        ref={ref}
        className="card bg-base-200 shadow-sm cursor-pointer hover:bg-base-300 transition-colors"
        onClick={onClick}
        data-workout-date={workout.date}
      >
        <div className="card-body p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg">
                {formatDate(workout.date)}
              </h3>
              <p className="text-sm text-base-content/60">
                {formatTime(workout.time)}
              </p>
            </div>
            <span className="badge badge-neutral">
              {workout.groups.length} group
              {workout.groups.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-sm text-base-content/70 mt-2">{preview}</p>
        </div>
      </div>
    );
  },
);

WorkoutCard.displayName = "WorkoutCard";

export default WorkoutCard;
