import { useReducer, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "./Modal";
import SaveTemplateDialog from "./SaveTemplateDialog";
import WorkoutTemplates from "./WorkoutTemplates";
import GroupsEditor from "./GroupsEditor";
import TemplateFormModal from "./TemplateFormModal";
import { createWorkout, updateWorkout } from "../api/workouts";
import { fetchTemplates } from "../api/templates";
import type {
  Workout,
  WorkoutTemplate,
  ExerciseGroup,
  Exercise,
  WorkoutSet,
  WorkoutFormData,
} from "../types";

// --- reducer types ---

interface FormState {
  date: string;
  time: string;
  groups: ExerciseGroup[];
  content: string;
}

type FormAction =
  | { type: "SET_DATE"; date: string }
  | { type: "SET_TIME"; time: string }
  | { type: "SET_CONTENT"; content: string }
  | { type: "SET_GROUPS"; groups: ExerciseGroup[] }
  | { type: "ADD_GROUP" }
  | { type: "REMOVE_GROUP"; groupIdx: number }
  | { type: "SET_GROUP_NAME"; groupIdx: number; name: string }
  | { type: "SET_GROUP_REST"; groupIdx: number; rest: number }
  | { type: "ADD_EXERCISE"; groupIdx: number }
  | { type: "REMOVE_EXERCISE"; groupIdx: number; exerciseIdx: number }
  | {
      type: "SET_EXERCISE_NAME";
      groupIdx: number;
      exerciseIdx: number;
      name: string;
    }
  | { type: "ADD_SET"; groupIdx: number; exerciseIdx: number }
  | {
      type: "REMOVE_SET";
      groupIdx: number;
      exerciseIdx: number;
      setIdx: number;
    }
  | {
      type: "SET_SET_REPS";
      groupIdx: number;
      exerciseIdx: number;
      setIdx: number;
      reps: number | null;
    }
  | {
      type: "SET_SET_WEIGHT";
      groupIdx: number;
      exerciseIdx: number;
      setIdx: number;
      weight: number | null;
    }
  | { type: "REORDER_GROUPS"; from: number; to: number }
  | { type: "REORDER_EXERCISES"; groupIdx: number; from: number; to: number };

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

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_DATE":
      return { ...state, date: action.date };
    case "SET_TIME":
      return { ...state, time: action.time };
    case "SET_CONTENT":
      return { ...state, content: action.content };
    case "SET_GROUPS":
      return { ...state, groups: action.groups };
    case "ADD_GROUP":
      return { ...state, groups: [...state.groups, emptyGroup()] };
    case "REMOVE_GROUP":
      return {
        ...state,
        groups:
          state.groups.length > 1
            ? removeAt(state.groups, action.groupIdx)
            : state.groups,
      };
    case "SET_GROUP_NAME":
      return {
        ...state,
        groups: updateAt(state.groups, action.groupIdx, (g) => ({
          ...g,
          name: action.name,
        })),
      };
    case "SET_GROUP_REST":
      return {
        ...state,
        groups: updateAt(state.groups, action.groupIdx, (g) => ({
          ...g,
          rest_seconds: action.rest,
        })),
      };
    case "ADD_EXERCISE":
      return {
        ...state,
        groups: updateAt(state.groups, action.groupIdx, (g) => ({
          ...g,
          exercises: [...g.exercises, emptyExercise()],
        })),
      };
    case "REMOVE_EXERCISE":
      return {
        ...state,
        groups: updateAt(state.groups, action.groupIdx, (g) => ({
          ...g,
          exercises:
            g.exercises.length > 1
              ? removeAt(g.exercises, action.exerciseIdx)
              : g.exercises,
        })),
      };
    case "SET_EXERCISE_NAME":
      return {
        ...state,
        groups: updateAt(state.groups, action.groupIdx, (g) => ({
          ...g,
          exercises: updateAt(g.exercises, action.exerciseIdx, (e) => ({
            ...e,
            name: action.name,
          })),
        })),
      };
    case "ADD_SET":
      return {
        ...state,
        groups: updateAt(state.groups, action.groupIdx, (g) => ({
          ...g,
          exercises: updateAt(g.exercises, action.exerciseIdx, (e) => ({
            ...e,
            sets: [...e.sets, emptySet()],
          })),
        })),
      };
    case "REMOVE_SET":
      return {
        ...state,
        groups: updateAt(state.groups, action.groupIdx, (g) => ({
          ...g,
          exercises: updateAt(g.exercises, action.exerciseIdx, (e) => ({
            ...e,
            sets: removeAt(e.sets, action.setIdx),
          })),
        })),
      };
    case "SET_SET_REPS":
      return {
        ...state,
        groups: updateAt(state.groups, action.groupIdx, (g) => ({
          ...g,
          exercises: updateAt(g.exercises, action.exerciseIdx, (e) => ({
            ...e,
            sets: updateAt(e.sets, action.setIdx, (s) => ({
              ...s,
              reps: action.reps,
            })),
          })),
        })),
      };
    case "SET_SET_WEIGHT":
      return {
        ...state,
        groups: updateAt(state.groups, action.groupIdx, (g) => ({
          ...g,
          exercises: updateAt(g.exercises, action.exerciseIdx, (e) => ({
            ...e,
            sets: updateAt(e.sets, action.setIdx, (s) => ({
              ...s,
              weight: action.weight,
            })),
          })),
        })),
      };
    case "REORDER_GROUPS": {
      const groups = [...state.groups];
      const [item] = groups.splice(action.from, 1);
      groups.splice(action.to, 0, item);
      return { ...state, groups };
    }
    case "REORDER_EXERCISES": {
      return {
        ...state,
        groups: updateAt(state.groups, action.groupIdx, (g) => {
          const exercises = [...g.exercises];
          const [item] = exercises.splice(action.from, 1);
          exercises.splice(action.to, 0, item);
          return { ...g, exercises };
        }),
      };
    }
  }
}

// --- helpers ---

function nowDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function initState(
  editWorkout?: Workout,
  copyFromWorkout?: Workout,
  template?: WorkoutTemplate,
): FormState {
  if (editWorkout) {
    return {
      date: editWorkout.date,
      time: editWorkout.time.slice(0, 5),
      groups: editWorkout.groups,
      content: editWorkout.content || "",
    };
  }
  const groups = copyFromWorkout?.groups ?? template?.groups ?? [emptyGroup()];
  return {
    date: nowDate(),
    time: nowTime(),
    groups,
    content: "",
  };
}

// --- component ---

interface WorkoutFormModalProps {
  editWorkout?: Workout;
  copyFromWorkout?: Workout;
  onClose: () => void;
}

export default function WorkoutFormModal({
  editWorkout,
  copyFromWorkout,
  onClose,
}: WorkoutFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!editWorkout;

  const [state, dispatch] = useReducer(
    formReducer,
    { editWorkout, copyFromWorkout },
    ({ editWorkout: ew, copyFromWorkout: cw }) => initState(ew, cw),
  );

  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<WorkoutTemplate | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: fetchTemplates,
    enabled: !isEdit,
  });

  const createMutation = useMutation({
    mutationFn: (data: WorkoutFormData) => createWorkout(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: WorkoutFormData) => updateWorkout(editWorkout!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: WorkoutFormData = {
      date: state.date,
      time: state.time + ":00",
      groups: state.groups,
      content: state.content.trim() || null,
    };
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleLoadTemplate = (template: WorkoutTemplate) => {
    dispatch({ type: "SET_GROUPS", groups: template.groups });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl">
      <h3 className="text-base-content text-xl font-bold mb-5 pr-8">
        {isEdit ? "edit workout" : "add workout"}
      </h3>

      {!isEdit && (
        <>
          <div className="collapse collapse-arrow bg-base-200 mb-4">
            <input type="checkbox" defaultChecked={templates.length > 0} />
            <div className="collapse-title font-medium text-sm">
              quick start from template
            </div>
            <div className="collapse-content">
              <WorkoutTemplates
                templates={templates}
                onUse={handleLoadTemplate}
                onEdit={setEditingTemplate}
              />
            </div>
          </div>
          <div className="divider text-sm">or create custom</div>
        </>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">date</span>
            </label>
            <input
              type="date"
              className="input input-bordered"
              value={state.date}
              onChange={(e) =>
                dispatch({ type: "SET_DATE", date: e.target.value })
              }
              required
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">time</span>
            </label>
            <input
              type="time"
              className="input input-bordered"
              value={state.time}
              onChange={(e) =>
                dispatch({ type: "SET_TIME", time: e.target.value })
              }
              required
            />
          </div>
        </div>

        <div className="divider text-sm">exercise groups</div>

        <GroupsEditor
          groups={state.groups}
          onChange={(g) => dispatch({ type: "SET_GROUPS", groups: g })}
        />

        <div className="mb-4">
          <label className="label mb-2 block">notes</label>
          <textarea
            className="textarea textarea-bordered h-20 w-full"
            placeholder="workout notes..."
            value={state.content}
            onChange={(e) =>
              dispatch({ type: "SET_CONTENT", content: e.target.value })
            }
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-4">
          <button
            type="button"
            className="text-base-content/50 hover:text-base-content text-sm font-semibold transition-colors"
            onClick={() => setShowSaveTemplate(true)}
          >
            save as template
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-base-200 text-base-content rounded-full border border-primary/20 hover:border-primary transition-colors font-semibold text-sm"
          >
            cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2.5 bg-primary text-primary-content rounded-full border border-primary/80 font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 relative overflow-hidden"
          >
            <div className="absolute inset-0 rounded-full shadow-[inset_0px_0.5px_0px_1.5px_rgba(255,255,255,0.06)]" />
            <span className="relative">
              {isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : isEdit ? (
                "save"
              ) : (
                "add"
              )}
            </span>
          </button>
        </div>
      </form>

      {showSaveTemplate && (
        <SaveTemplateDialog
          groups={state.groups}
          onClose={() => setShowSaveTemplate(false)}
        />
      )}

      {editingTemplate && (
        <TemplateFormModal
          editTemplate={editingTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </Modal>
  );
}
