import { useState } from "react";
import { GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import type { ExerciseGroup } from "../types";
import { updateAt, removeAt, moveItem } from "../utils/arrays";
import { emptySet, emptyExercise, emptyGroup } from "../utils/workout";
import { btnGhostSm, btnGhostXs, inputSmCls, inputXsCls } from "../styles";

interface GroupsEditorProps {
  groups: ExerciseGroup[];
  onChange: (groups: ExerciseGroup[]) => void;
}

let _keyCounter = 0;
function nextKey() {
  return `k${++_keyCounter}`;
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

  // Stable IDs stored in state — initialized from groups, explicitly updated on mutations
  const [groupIds, setGroupIds] = useState<string[]>(() =>
    groups.map(() => nextKey()),
  );
  const [exIds, setExIds] = useState<string[][]>(() =>
    groups.map((g) => g.exercises.map(() => nextKey())),
  );
  const [setIds, setSetIds] = useState<string[][][]>(() =>
    groups.map((g) => g.exercises.map((ex) => ex.sets.map(() => nextKey()))),
  );

function reorderGroups(from: number, to: number) {
    setGroupIds((ids) => {
      const next = [...ids];
      const [gid] = next.splice(from, 1);
      next.splice(to, 0, gid);
      return next;
    });
    setExIds((ids) => {
      const next = [...ids];
      const [eids] = next.splice(from, 1);
      next.splice(to, 0, eids);
      return next;
    });
    setSetIds((ids) => {
      const next = [...ids];
      const [sids] = next.splice(from, 1);
      next.splice(to, 0, sids);
      return next;
    });
    onChange(moveItem(groups, from, to));
  }

  function reorderExercises(gi: number, from: number, to: number) {
    setExIds((ids) => {
      const next = ids.map((row) => [...row]);
      const [eid] = next[gi].splice(from, 1);
      next[gi].splice(to, 0, eid);
      return next;
    });
    setSetIds((ids) => {
      const next = ids.map((row) => [...row]);
      const [sids] = next[gi].splice(from, 1);
      next[gi].splice(to, 0, sids);
      return next;
    });
    onChange(
      updateAt(groups, gi, (g) => ({
        ...g,
        exercises: moveItem(g.exercises, from, to),
      })),
    );
  }

  function removeGroup(gi: number) {
    if (groups.length <= 1) return;
    setGroupIds((ids) => removeAt(ids, gi));
    setExIds((ids) => removeAt(ids, gi));
    setSetIds((ids) => removeAt(ids, gi));
    onChange(removeAt(groups, gi));
  }

  function addGroup() {
    setGroupIds((ids) => [...ids, nextKey()]);
    setExIds((ids) => [...ids, [nextKey()]]);
    setSetIds((ids) => [...ids, [[]]]);
    onChange([...groups, emptyGroup()]);
  }

  function removeExercise(gi: number, ei: number) {
    if (groups[gi].exercises.length <= 1) return;
    setExIds((ids) =>
      ids.map((row, i) => (i === gi ? removeAt(row, ei) : row)),
    );
    setSetIds((ids) =>
      ids.map((row, i) => (i === gi ? removeAt(row, ei) : row)),
    );
    onChange(
      updateAt(groups, gi, (g) => ({
        ...g,
        exercises: removeAt(g.exercises, ei),
      })),
    );
  }

  function addExercise(gi: number) {
    setExIds((ids) =>
      ids.map((row, i) => (i === gi ? [...row, nextKey()] : row)),
    );
    setSetIds((ids) =>
      ids.map((row, i) => (i === gi ? [...row, []] : row)),
    );
    onChange(
      updateAt(groups, gi, (g) => ({
        ...g,
        exercises: [...g.exercises, emptyExercise()],
      })),
    );
  }

  function addSet(gi: number, ei: number) {
    setSetIds((ids) =>
      ids.map((row, i) =>
        i === gi
          ? row.map((srow, j) => (j === ei ? [...srow, nextKey()] : srow))
          : row,
      ),
    );
    onChange(
      updateAt(groups, gi, (g) => ({
        ...g,
        exercises: updateAt(g.exercises, ei, (ex) => ({
          ...ex,
          sets: [...ex.sets, emptySet()],
        })),
      })),
    );
  }

  function removeSet(gi: number, ei: number, si: number) {
    setSetIds((ids) =>
      ids.map((row, i) =>
        i === gi
          ? row.map((srow, j) => (j === ei ? removeAt(srow, si) : srow))
          : row,
      ),
    );
    onChange(
      updateAt(groups, gi, (g) => ({
        ...g,
        exercises: updateAt(g.exercises, ei, (ex) => ({
          ...ex,
          sets: removeAt(ex.sets, si),
        })),
      })),
    );
  }

  return (
    <div className="space-y-4 mb-4">
      {groups.map((group, gi) => (
        <div
          key={groupIds[gi]}
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
          className={`bg-base-200 rounded-lg p-3 sm:p-4 transition-[opacity,box-shadow] motion-reduce:transition-none ${
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
                className="hidden sm:flex items-center cursor-grab active:cursor-grabbing text-base-content/30 hover:text-base-content/60 transition-colors motion-reduce:transition-none"
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
                    className="p-0.5 text-base-content/30 hover:text-base-content/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none"
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
                    className="p-0.5 text-base-content/30 hover:text-base-content/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none"
                    aria-label="Move group down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <input
              type="text"
              className={`${inputSmCls} sm:flex-1`}
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
                className={`${inputSmCls} flex-1 sm:w-24 sm:flex-none`}
                placeholder="sec"
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
                className={`${btnGhostSm} flex-shrink-0`}
                onClick={() => removeGroup(gi)}
                aria-label="Remove group"
              >
                &times;
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {group.exercises.map((exercise, ei) => (
              <div
                key={exIds[gi]?.[ei]}
                onDragOver={(e) => {
                  e.preventDefault();
                  // Only handle exercise drag — don't stop propagation for group drag
                  if (
                    draggingEx &&
                    draggingEx.gi === gi &&
                    draggingEx.ei !== ei
                  ) {
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
                  if (
                    draggingEx &&
                    draggingEx.gi === gi &&
                    draggingEx.ei !== ei
                  ) {
                    e.stopPropagation();
                    reorderExercises(gi, draggingEx.ei, ei);
                  }
                  setDraggingEx(null);
                  setDragOverEx(null);
                }}
                className={`bg-base-300 rounded p-3 transition-[opacity,box-shadow] motion-reduce:transition-none ${
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
                      className="hidden sm:flex items-center cursor-grab active:cursor-grabbing text-base-content/30 hover:text-base-content/60 transition-colors motion-reduce:transition-none"
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
                          className="p-0.5 text-base-content/30 hover:text-base-content/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none"
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
                          className="p-0.5 text-base-content/30 hover:text-base-content/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none"
                          aria-label="Move exercise down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    className={`${inputSmCls} flex-1`}
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
                    className={btnGhostSm}
                    onClick={() => removeExercise(gi, ei)}
                    aria-label="Remove exercise"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-1">
                  {exercise.sets.map((set, si) => (
                    <div key={setIds[gi]?.[ei]?.[si] ?? si} className="set-row flex gap-2 items-center">
                      <span className="text-xs text-base-content/50 w-5 flex-shrink-0">
                        #{si + 1}
                      </span>
                      <input
                        type="number"
                        className={`${inputXsCls} flex-1 min-w-0`}
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
                        className={`${inputXsCls} flex-1 min-w-0`}
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
                        className={`${btnGhostXs} flex-shrink-0`}
                        onClick={() => removeSet(gi, ei, si)}
                        aria-label="Remove set"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className={`${btnGhostXs} mt-1`}
                  onClick={() => addSet(gi, ei)}
                >
                  + add set
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={`${btnGhostXs} mt-2`}
            onClick={() => addExercise(gi)}
          >
            + add exercise
          </button>
        </div>
      ))}

      <button
        type="button"
        className={`${btnGhostSm} w-full`}
        onClick={addGroup}
      >
        + add group
      </button>
    </div>
  );
}
