import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWorkouts } from "../api/workouts";
import type { Workout } from "../types";
import WorkoutCard from "./WorkoutCard";
import WorkoutCalendar from "./WorkoutCalendar";
import WorkoutViewModal from "./WorkoutViewModal";

export default function WorkoutSection() {
  const [viewWorkout, setViewWorkout] = useState<Workout | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["workouts"],
    queryFn: fetchWorkouts,
  });

  const handleDateClick = (dateStr: string) => {
    const card = cardRefs.current.get(dateStr);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.classList.add("ring-2", "ring-primary");
      setTimeout(() => {
        card.classList.remove("ring-2", "ring-primary");
      }, 2000);
    }
  };

  if (isLoading) {
    return <span className="loading loading-spinner loading-lg" />;
  }

  if (workouts.length === 0) {
    return (
      <div className="text-center py-12 text-base-content/60 bg-base-100 rounded-lg">
        <p>no workouts yet</p>
        <p className="text-sm mt-2">
          click &quot;add workout&quot; to log your first workout
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <div className="md:w-64 flex-shrink-0">
          <WorkoutCalendar onDateClick={handleDateClick} />
        </div>

        <div className="flex-1">
          <div className="space-y-3">
            {workouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                ref={(el) => {
                  if (el) {
                    cardRefs.current.set(workout.date, el);
                  }
                }}
                onClick={() => setViewWorkout(workout)}
              />
            ))}
          </div>
        </div>
      </div>

      {viewWorkout && (
        <WorkoutViewModal
          workout={viewWorkout}
          onClose={() => setViewWorkout(null)}
        />
      )}
    </>
  );
}
