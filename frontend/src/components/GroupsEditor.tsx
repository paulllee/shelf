import { useState } from "react";
import { GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import type { ExerciseGroup, Exercise, WorkoutSet } from "../types";

interface GroupsEditorProps {
  groups: ExerciseGroup[];
  onChange: (groups: ExerciseGroup[]) => void;
}

function emptySet(): WorkoutSet {
  return { reps: null, weight: null };
}

function emptyExercise(): Exercise {
  return { name: "", sets: [] };
}

function emptyGroup(): ExerciseGroup {
  return { name: "", rest_seconds: 60, exercises: [emptyExercise()] };
}

function updateAt<T>(arr: T[], idx: number, updater: (item: T) => T): T[] {
  return arr.map((item, i) => (i === idx ? updater(item) : item));
}

function removeAt<T>(arr: T[], idx: number): T[] {
  return arr.filter((_, i) => i !== idx);
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function GroupsEditor({ groups, onChange }: GroupsEditorProps) {
  const [draggingGroup, setDraggingGroup] = useState<number | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<number | null>(null);
  const [draggingEx, setDraggingEx] = useState<{
    gi: number;
    ei: number;
  } | null>(null);
  const [dragOverEx, setDragOverEx] = useState<{
    gi: number;
    ei: number;
  } | null>(null);

  function reorderGroups(from: number, to: number) {
    onChange(moveItem(groups, from, to));
  }

  function reorderExercises(gi: number, from: number, to: number) {
    onChange(
      updateAt(groups, gi, (g) => ({
        ...g,
        exercises: moveItem(g.exercises, from, to),
      })),
    );
  }

  return (
    <div className="space-y-4 mb-4">
      {groups.map((group, gi) => (
        <div
          key={gi}
          onDragOver={(e) => {
            e.preventDefault();
            // Only handle group drag, not exercise drag
            if (draggingGroup !== null && draggingGroup !== gi)
              setDragOverGroup(gi);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node))
              setDragOverGroup(null);
          }}
          onDrop={() => {
            // Only handle if a group is being dragged (not an exercise)
            if (draggingGroup !== null && draggingGroup !== gi) {
              reorderGroups(draggingGroup, gi);
            }
            setDraggingGroup(null);
            setDragOverGroup(null);
          }}
          className={`bg-base-200 rounded-lg p-3 sm:p-4 transition-all ${
            draggingGroup === gi ? "opacity-40" : ""
          } ${dragOverGroup === gi ? "ring-2 ring-primary/40" : ""}`}
        >
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            {/* Reorder controls: drag handle (desktop) + up/down arrows */}
            <div className="flex items-center self-center gap-1 flex-shrink-0">
              <div
                draggable
                onDragStart={() => setDraggingGroup(gi)}
                onDragEnd={() => {
                  setDraggingGroup(null);
                  setDragOverGroup(null);
                }}
                className="hidden sm:flex items-center cursor-grab active:cursor-grabbing text-base-content/30 hover:text-base-content/60 transition-colors"
                title="Drag to reorder"
              >
                <GripVertical className="w-4 h-4" />
              </div>
              {groups.length > 1 && (
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => gi > 0 && reorderGroups(gi, gi - 1)}
                    disabled={gi === 0}
                    className="p-0.5 text-base-content/30 hover:text-base-content/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    aria-label="Move group up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      gi < groups.length - 1 && reorderGroups(gi, gi + 1)
                    }
                    disabled={gi === groups.length - 1}
                    className="p-0.5 text-base-content/30 hover:text-base-content/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    aria-label="Move group down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <input
              type="text"
              className="input input-bordered input-sm w-full sm:flex-1"
              placeholder="group name (e.g., chest & triceps)"
              value={group.name}
              onChange={(e) =>
                onChange(
                  updateAt(groups, gi, (g) => ({ ...g, name: e.target.value })),
                )
              }
              required
            />
            <div className="flex gap-2">
              <input
                type="number"
                className="input input-bordered input-sm flex-1 sm:w-24 sm:flex-none"
                placeholder="rest (s)"
                value={group.rest_seconds}
                onChange={(e) =>
                  onChange(
                    updateAt(groups, gi, (g) => ({
                      ...g,
                      rest_seconds: parseInt(e.target.value) || 0,
                    })),
                  )
                }
                required
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm flex-shrink-0"
                onClick={() =>
                  onChange(groups.length > 1 ? removeAt(groups, gi) : groups)
                }
              >
                &times;
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {group.exercises.map((exercise, ei) => (
              <div
                key={ei}
                onDragOver={(e) => {
                  e.preventDefault();
                  // Only handle exercise drag — don't stop propagation for group drag
                  if (draggingEx && draggingEx.gi === gi && draggingEx.ei !== ei) {
                    e.stopPropagation();
                    setDragOverEx({ gi, ei });
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node))
                    setDragOverEx(null);
                }}
                onDrop={(e) => {
                  // Only handle exercise drop — don't stop propagation for group drag
                  if (draggingEx && draggingEx.gi === gi && draggingEx.ei !== ei) {
                    e.stopPropagation();
                    reorderExercises(gi, draggingEx.ei, ei);
                  }
                  setDraggingEx(null);
                  setDragOverEx(null);
                }}
                className={`bg-base-300 rounded p-3 transition-all ${
                  draggingEx?.gi === gi && draggingEx?.ei === ei
                    ? "opacity-40"
                    : ""
                } ${dragOverEx?.gi === gi && dragOverEx?.ei === ei ? "ring-2 ring-primary/40" : ""}`}
              >
                <div className="flex gap-2 mb-2">
                  {/* Reorder controls: drag handle (desktop) + up/down arrows */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div
                      draggable
                      onDragStart={() => setDraggingEx({ gi, ei })}
                      onDragEnd={() => {
                        setDraggingEx(null);
                        setDragOverEx(null);
                      }}
                      className="hidden sm:flex items-center cursor-grab active:cursor-grabbing text-base-content/30 hover:text-base-content/60 transition-colors"
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>
                    {group.exercises.length > 1 && (
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() =>
                            ei > 0 && reorderExercises(gi, ei, ei - 1)
                          }
                          disabled={ei === 0}
                          className="p-0.5 text-base-content/30 hover:text-base-content/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          aria-label="Move exercise up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            ei < group.exercises.length - 1 &&
                            reorderExercises(gi, ei, ei + 1)
                          }
                          disabled={ei === group.exercises.length - 1}
                          className="p-0.5 text-base-content/30 hover:text-base-content/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          aria-label="Move exercise down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    className="input input-bordered input-sm flex-1"
                    placeholder="exercise name"
                    value={exercise.name}
                    onChange={(e) =>
                      onChange(
                        updateAt(groups, gi, (g) => ({
                          ...g,
                          exercises: updateAt(g.exercises, ei, (ex) => ({
                            ...ex,
                            name: e.target.value,
                          })),
                        })),
                      )
                    }
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      onChange(
                        updateAt(groups, gi, (g) => ({
                          ...g,
                          exercises:
                            g.exercises.length > 1
                              ? removeAt(g.exercises, ei)
                              : g.exercises,
                        })),
                      )
                    }
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-1">
                  {exercise.sets.map((set, si) => (
                    <div key={si} className="set-row flex gap-2 items-center">
                      <span className="text-xs text-base-content/50 w-5 flex-shrink-0">
                        #{si + 1}
                      </span>
                      <input
                        type="number"
                        className="input input-bordered input-xs flex-1 min-w-0"
                        placeholder="reps"
                        min="1"
                        value={set.reps ?? ""}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          onChange(
                            updateAt(groups, gi, (g) => ({
                              ...g,
                              exercises: updateAt(g.exercises, ei, (ex) => ({
                                ...ex,
                                sets: updateAt(ex.sets, si, (s) => ({
                                  ...s,
                                  reps: v > 0 ? v : null,
                                })),
                              })),
                            })),
                          );
                        }}
                      />
                      <input
                        type="number"
                        step="0.5"
                        className="input input-bordered input-xs flex-1 min-w-0"
                        placeholder="weight"
                        value={set.weight ?? ""}
                        onChange={(e) =>
                          onChange(
                            updateAt(groups, gi, (g) => ({
                              ...g,
                              exercises: updateAt(g.exercises, ei, (ex) => ({
                                ...ex,
                                sets: updateAt(ex.sets, si, (s) => ({
                                  ...s,
                                  weight: e.target.value
                                    ? parseFloat(e.target.value)
                                    : null,
                                })),
                              })),
                            })),
                          )
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs flex-shrink-0"
                        onClick={() =>
                          onChange(
                            updateAt(groups, gi, (g) => ({
                              ...g,
                              exercises: updateAt(g.exercises, ei, (ex) => ({
                                ...ex,
                                sets: removeAt(ex.sets, si),
                              })),
                            })),
                          )
                        }
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn btn-ghost btn-xs mt-1"
                  onClick={() =>
                    onChange(
                      updateAt(groups, gi, (g) => ({
                        ...g,
                        exercises: updateAt(g.exercises, ei, (ex) => ({
                          ...ex,
                          sets: [...ex.sets, emptySet()],
                        })),
                      })),
                    )
                  }
                >
                  + add set
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-xs mt-2"
            onClick={() =>
              onChange(
                updateAt(groups, gi, (g) => ({
                  ...g,
                  exercises: [...g.exercises, emptyExercise()],
                })),
              )
            }
          >
            + add exercise
          </button>
        </div>
      ))}

      <button
        type="button"
        className="btn btn-ghost btn-sm w-full"
        onClick={() => onChange([...groups, emptyGroup()])}
      >
        + add group
      </button>
    </div>
  );
}
