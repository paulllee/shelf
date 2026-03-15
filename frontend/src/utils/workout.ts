import type { ExerciseGroup, Exercise, WorkoutSet } from "../types";

export function emptySet(): WorkoutSet {
  return { reps: null, weight: null };
}

export function emptyExercise(): Exercise {
  return { name: "", sets: [] };
}

export function emptyGroup(): ExerciseGroup {
  return { name: "", rest_seconds: 60, exercises: [emptyExercise()] };
}
