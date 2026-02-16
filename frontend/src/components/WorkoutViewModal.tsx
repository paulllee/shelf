import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "./Modal";
import WorkoutFormModal from "./WorkoutFormModal";
import { deleteWorkout } from "../api/workouts";
import type { Workout } from "../types";

interface WorkoutViewModalProps {
  workout: Workout;
  onClose: () => void;
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d
    .toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
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

export default function WorkoutViewModal({
  workout,
  onClose,
}: WorkoutViewModalProps) {
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deleteWorkout(workout.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      onClose();
    },
  });

  if (showEdit) {
    return (
      <WorkoutFormModal
        editWorkout={workout}
        onClose={() => {
          setShowEdit(false);
          onClose();
        }}
      />
    );
  }

  if (showRepeat) {
    return (
      <WorkoutFormModal
        copyFromWorkout={workout}
        onClose={() => {
          setShowRepeat(false);
          onClose();
        }}
      />
    );
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl">
      <h3 className="font-bold text-lg mb-1">{formatDateLong(workout.date)}</h3>
      <p className="text-sm text-base-content/60 mb-4">
        {formatTime(workout.time)}
      </p>

      <div className="space-y-4">
        {workout.groups.map((group, gi) => (
          <div key={gi} className="collapse collapse-arrow bg-base-200">
            <input type="checkbox" defaultChecked />
            <div className="collapse-title font-medium">
              {group.name}
              <span className="text-sm text-base-content/60 ml-2">
                ({group.rest_seconds}s rest)
              </span>
            </div>
            <div className="collapse-content">
              <div className="space-y-3">
                {group.exercises.map((exercise, ei) => (
                  <div key={ei}>
                    <p className="font-medium">{exercise.name}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {exercise.sets.map((set, si) => (
                        <span key={si} className="badge badge-outline">
                          {set.reps != null ? `${set.reps} reps` : "—"}
                          {set.weight != null ? ` @ ${set.weight}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {workout.content && (
        <div className="mt-4">
          <p className="text-sm text-base-content/70 font-medium mb-1">notes</p>
          <p className="text-sm">{workout.content}</p>
        </div>
      )}

      <div className="modal-action">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            if (confirm("delete this workout?")) {
              deleteMutation.mutate();
            }
          }}
          disabled={deleteMutation.isPending}
        >
          delete
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowRepeat(true)}
        >
          repeat
        </button>
        <button className="btn btn-sm" onClick={() => setShowEdit(true)}>
          edit
        </button>
        <button className="btn btn-sm btn-primary" onClick={onClose}>
          close
        </button>
      </div>
    </Modal>
  );
}
