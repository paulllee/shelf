import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { fetchWorkouts } from "../api/workouts";
import type { Workout } from "../types";
import WorkoutCard from "./WorkoutCard";
import WorkoutViewModal from "./WorkoutViewModal";
import WorkoutFormModal from "./WorkoutFormModal";

export default function WorkoutSection() {
  const [viewWorkout, setViewWorkout] = useState<Workout | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["workouts"],
    queryFn: fetchWorkouts,
  });

  if (isLoading) {
    return <span className="loading loading-spinner loading-lg" />;
  }

  if (workouts.length === 0) {
    return (
      <>
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-primary border border-primary/80 text-primary-content hover:brightness-110 transition-all flex items-center gap-1.5 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">add workout</span>
          </button>
        </div>
        <div className="text-center py-12 text-base-content/60 bg-base-100 rounded-lg">
          <p>no workouts yet</p>
          <p className="text-sm mt-2">click &quot;add workout&quot; to log your first workout</p>
        </div>
        {showAddModal && <WorkoutFormModal onClose={() => setShowAddModal(false)} />}
      </>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAddModal(true)}
          className="h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-primary border border-primary/80 text-primary-content hover:brightness-110 transition-all flex items-center gap-1.5 text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">add workout</span>
        </button>
      </div>

      <div className="space-y-3">
        {workouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            onClick={() => setViewWorkout(workout)}
          />
        ))}
      </div>

      {viewWorkout && (
        <WorkoutViewModal
          workout={viewWorkout}
          onClose={() => setViewWorkout(null)}
        />
      )}

      {showAddModal && (
        <WorkoutFormModal onClose={() => setShowAddModal(false)} />
      )}
    </>
  );
}
