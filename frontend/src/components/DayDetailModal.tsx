import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Trash2, Plus, ChevronDown, ChevronUp, X } from "lucide-react";
import {
  toggleCompletion,
  createActivity,
  deleteActivity,
} from "../api/habits";
import type { Activity, Habit } from "../types";

interface DayDetailModalProps {
  date: Date;
  habits: Habit[];
  activities: Activity[];
  presets: string[];
  onClose: () => void;
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateLabel(date: Date): string {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export default function DayDetailModal({
  date,
  habits,
  activities,
  presets,
  onClose,
}: DayDetailModalProps) {
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActivityName, setNewActivityName] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const [isOtherHabitsExpanded, setIsOtherHabitsExpanded] = useState(false);

  const dateStr = formatDateStr(date);
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: ({ habitId }: { habitId: string }) =>
      toggleCompletion(habitId, dateStr),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });

  const addActivityMutation = useMutation({
    mutationFn: (name: string) => createActivity({ name, date: dateStr }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setNewActivityName("");
      setIsAddingActivity(false);
      setShowPresets(false);
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: deleteActivity,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["activities"] }),
  });

  const habitsForDay = habits.filter((h) => h.days.includes(date.getDay()));
  const activitiesForDay = activities.filter((a) => a.date === dateStr);
  const scheduledHabitIds = new Set(habitsForDay.map((h) => h.id));

  const completedHabits = habitsForDay.filter((h) =>
    h.completions.includes(dateStr),
  );
  const incompletedHabits = habitsForDay.filter(
    (h) => !h.completions.includes(dateStr),
  );
  const completedUnscheduledHabits = habits.filter(
    (h) => h.completions.includes(dateStr) && !scheduledHabitIds.has(h.id),
  );
  const unscheduledNotCompleted = habits.filter(
    (h) => !h.completions.includes(dateStr) && !scheduledHabitIds.has(h.id),
  );

  const totalExpected = habitsForDay.length + completedUnscheduledHabits.length;
  const totalCompleted =
    completedHabits.length + completedUnscheduledHabits.length;
  const hasItems =
    habitsForDay.length > 0 ||
    activitiesForDay.length > 0 ||
    completedUnscheduledHabits.length > 0;

  const handleAddActivity = (name: string) => {
    if (name.trim()) addActivityMutation.mutate(name.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-base-300 rounded-xl max-w-md w-full p-4 sm:p-6 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.3)] max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-base-content text-lg sm:text-xl font-bold">
              {formatDateLabel(date)}
            </h2>
            <p className="text-base-content/50 text-xs mt-1">
              {totalCompleted} of {totalExpected} habits completed
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-base-content/50 hover:text-base-content transition-colors p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {completedHabits.length > 0 && (
            <div>
              <h3 className="text-success text-sm font-semibold mb-2 flex items-center gap-2">
                <Check className="w-4 h-4" />
                completed (scheduled)
              </h3>
              <div className="space-y-2">
                {completedHabits.map((habit) => (
                  <button
                    key={habit.id}
                    onClick={() => toggleMutation.mutate({ habitId: habit.id })}
                    className="w-full flex items-center gap-3 p-3 bg-base-200 rounded-lg hover:bg-base-100 transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: habit.color }}
                    />
                    <span className="text-base-content text-sm flex-1 text-left">
                      {habit.name}
                    </span>
                    <Check className="w-4 h-4 text-success" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {completedUnscheduledHabits.length > 0 && (
            <div>
              <h3 className="text-success text-sm font-semibold mb-2 flex items-center gap-2">
                <Check className="w-4 h-4" />
                completed (bonus)
              </h3>
              <div className="space-y-2">
                {completedUnscheduledHabits.map((habit) => (
                  <button
                    key={habit.id}
                    onClick={() => toggleMutation.mutate({ habitId: habit.id })}
                    className="w-full flex items-center gap-3 p-3 bg-base-200 rounded-lg hover:bg-base-100 transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: habit.color }}
                    />
                    <span className="text-base-content text-sm flex-1 text-left">
                      {habit.name}
                    </span>
                    <Check className="w-4 h-4 text-success" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {incompletedHabits.length > 0 && (
            <div>
              <h3 className="text-base-content/50 text-sm font-semibold mb-2">
                not completed
              </h3>
              <div className="space-y-2">
                {incompletedHabits.map((habit) => (
                  <button
                    key={habit.id}
                    onClick={() => toggleMutation.mutate({ habitId: habit.id })}
                    className="w-full flex items-center gap-3 p-3 bg-base-200 rounded-lg opacity-60 hover:opacity-100 hover:bg-base-100 transition-all"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: habit.color }}
                    />
                    <span className="text-base-content text-sm flex-1 text-left">
                      {habit.name}
                    </span>
                    <div className="w-4 h-4 border-2 border-base-content/30 rounded" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-warning text-sm font-semibold">activities</h3>
              <button
                onClick={() => {
                  setIsAddingActivity(true);
                  setShowPresets(presets.length > 0);
                }}
                className="text-warning hover:text-warning/70 transition-colors"
                aria-label="Add activity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {isAddingActivity && (
              <div className="mb-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newActivityName}
                    onChange={(e) => setNewActivityName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddActivity(newActivityName);
                      else if (e.key === "Escape") {
                        setIsAddingActivity(false);
                        setNewActivityName("");
                        setShowPresets(false);
                      }
                    }}
                    placeholder="activity name..."
                    className="flex-1 bg-base-200 text-base-content px-3 py-2 rounded-lg border border-warning focus:outline-none text-sm placeholder:text-base-content/30"
                    autoFocus
                  />
                  <button
                    onClick={() => handleAddActivity(newActivityName)}
                    disabled={addActivityMutation.isPending}
                    className="px-3 py-2 bg-warning text-white rounded-lg hover:brightness-110 transition-all"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingActivity(false);
                      setNewActivityName("");
                      setShowPresets(false);
                    }}
                    className="px-3 py-2 bg-base-200 text-base-content/50 rounded-lg hover:text-base-content transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {showPresets && presets.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {presets.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handleAddActivity(preset)}
                        disabled={addActivityMutation.isPending}
                        className="px-3 py-1 bg-base-200 text-base-content text-xs rounded-full border border-warning/30 hover:border-warning hover:bg-warning/10 transition-all"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activitiesForDay.length > 0 ? (
              <div className="space-y-2">
                {activitiesForDay.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 bg-base-200 rounded-lg group"
                  >
                    <div className="w-2 h-2 bg-warning rounded-full flex-shrink-0" />
                    <span className="text-base-content text-sm flex-1">
                      {activity.name}
                    </span>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(`Delete activity "${activity.name}"?`)
                        ) {
                          deleteActivityMutation.mutate(activity.id);
                        }
                      }}
                      className="p-1 text-base-content/30 hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Delete activity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : !isAddingActivity ? (
              <p className="text-base-content/30 text-xs italic">
                no activities for this day
              </p>
            ) : null}
          </div>

          {unscheduledNotCompleted.length > 0 && (
            <div>
              <button
                onClick={() => setIsOtherHabitsExpanded(!isOtherHabitsExpanded)}
                className="flex items-center gap-2 text-base-content/40 text-xs font-semibold mb-2 hover:text-base-content/60 transition-colors"
              >
                {isOtherHabitsExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                other habits ({unscheduledNotCompleted.length})
              </button>
              {isOtherHabitsExpanded && (
                <div className="space-y-2">
                  {unscheduledNotCompleted.map((habit) => (
                    <button
                      key={habit.id}
                      onClick={() =>
                        toggleMutation.mutate({ habitId: habit.id })
                      }
                      className="w-full flex items-center gap-3 p-3 bg-base-200 rounded-lg opacity-40 hover:opacity-100 hover:bg-base-100 transition-all"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: habit.color }}
                      />
                      <span className="text-base-content text-sm flex-1 text-left">
                        {habit.name}
                      </span>
                      <div className="w-4 h-4 border-2 border-base-content/20 rounded" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!hasItems && !isAddingActivity && (
            <div className="text-center py-8">
              <p className="text-base-content/50 text-sm">
                no habits or activities for this day
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
