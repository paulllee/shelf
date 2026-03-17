import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { deleteWorkout } from "../api/workouts";
import type { Workout } from "../types";
import ExpandCollapse from "./ExpandCollapse";

interface WorkoutCardProps {
  workout: Workout;
  onEdit: (workout: Workout) => void;
  onRepeat: (workout: Workout) => void;
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

export default function WorkoutCard({
  workout,
  onEdit,
  onRepeat,
}: WorkoutCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const queryClient = useQueryClient();

  const exercises = useMemo(
    () => workout.groups.flatMap((g) => g.exercises.map((e) => e.name)),
    [workout.groups],
  );
  const preview = useMemo(
    () =>
      exercises.slice(0, 3).join(", ") + (exercises.length > 3 ? ", ..." : ""),
    [exercises],
  );

  const deleteMutation = useMutation({
    mutationFn: () => deleteWorkout(workout.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });

  return (
    <div className="bg-base-200 rounded-lg">
      {/* Collapsed header — always visible */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-base-300 transition-colors motion-reduce:transition-none rounded-lg"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="font-semibold text-lg">
              {formatDate(workout.date)}
            </h3>
            <span className="text-sm text-base-content/50">
              {formatTime(workout.time)}
            </span>
          </div>
          {!expanded && (
            <p className="text-sm text-base-content/60 mt-1 truncate">
              {preview}
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-base-content/40 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-base-content/40 shrink-0" />
        )}
      </button>

      {/* Expanded details */}
      <ExpandCollapse expanded={expanded}>
          <div className="px-4 pb-4 space-y-3">
            {workout.groups.map((group, gi) => (
              <div key={gi}>
                <div className="flex items-baseline gap-2 mb-1.5">
                  <h4 className="text-sm font-semibold">{group.name}</h4>
                  <span className="text-xs text-base-content/40">
                    {group.rest_seconds}s rest
                  </span>
                </div>
                <div className="space-y-1.5 ml-3">
                  {group.exercises.map((exercise, ei) => (
                    <div key={ei}>
                      <p className="text-sm font-medium">{exercise.name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {exercise.sets.map((set, si) => (
                          <span
                            key={si}
                            className="text-xs text-base-content/60 bg-base-300 px-2 py-0.5 rounded"
                          >
                            {set.reps != null ? `${set.reps} reps` : "—"}
                            {set.weight != null ? ` @ ${set.weight}` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {workout.content && (
              <div className="border-t border-base-content/5 pt-3">
                <p className="text-xs text-base-content/50 font-medium mb-1">
                  notes
                </p>
                <p className="text-sm text-base-content/70">
                  {workout.content}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 border-t border-base-content/5 pt-3">
              {confirmingDelete ? (
                <div className="flex items-center gap-2 animate-fade-in">
                  <span className="text-xs text-base-content/50">delete?</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate();
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-error text-xs font-semibold transition-colors motion-reduce:transition-none"
                  >
                    yes
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmingDelete(false);
                    }}
                    className="text-base-content/50 hover:text-base-content text-xs font-semibold transition-colors motion-reduce:transition-none"
                  >
                    cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmingDelete(true);
                  }}
                  disabled={deleteMutation.isPending}
                  className="text-error/60 hover:text-error text-xs font-semibold transition-colors motion-reduce:transition-none"
                >
                  delete
                </button>
              )}
              <div className="flex-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRepeat(workout);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-base-content/60 hover:text-base-content bg-base-300 rounded-lg transition-colors motion-reduce:transition-none"
              >
                repeat
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(workout);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-base-content/60 hover:text-base-content bg-base-300 rounded-lg transition-colors motion-reduce:transition-none"
              >
                edit
              </button>
            </div>
          </div>
      </ExpandCollapse>
    </div>
  );
}
