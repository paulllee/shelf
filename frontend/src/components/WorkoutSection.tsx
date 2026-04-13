import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { fetchWorkouts } from "../api/workouts";
import type { Workout } from "../types";
import WorkoutCard from "./WorkoutCard";
import WorkoutFormModal from "./WorkoutFormModal";

export default function WorkoutSection() {
  const [editWorkout, setEditWorkout] = useState<Workout | null>(null);
  const [copyWorkout, setCopyWorkout] = useState<Workout | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["workouts"],
    queryFn: fetchWorkouts,
  });

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">log</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-primary border border-primary/80 text-primary-content hover:brightness-110 transition-[filter] motion-reduce:transition-none flex items-center gap-1.5 text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">add workout</span>
        </button>
      </div>

      {isLoading ? (
        <span
          className="loading loading-spinner loading-lg"
          role="status"
          aria-label="Loading"
        />
      ) : workouts.length === 0 ? (
        <p className="text-center py-12 text-base-content/60">
          no workouts yet
        </p>
      ) : (
        <div className="space-y-3">
          {workouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              onEdit={setEditWorkout}
              onRepeat={setCopyWorkout}
            />
          ))}
        </div>
      )}

      {editWorkout && (
        <WorkoutFormModal
          editWorkout={editWorkout}
          onClose={() => setEditWorkout(null)}
        />
      )}

      {copyWorkout && (
        <WorkoutFormModal
          copyFromWorkout={copyWorkout}
          onClose={() => setCopyWorkout(null)}
        />
      )}

      {showAddModal && (
        <WorkoutFormModal onClose={() => setShowAddModal(false)} />
      )}
    </>
  );
}
