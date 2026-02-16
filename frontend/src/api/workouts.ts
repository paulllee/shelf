import { apiFetch } from "./client";
import type { Workout, WorkoutFormData, CalendarData } from "../types";

export function fetchWorkouts(): Promise<Workout[]> {
  return apiFetch<Workout[]>("/workouts");
}

export function fetchWorkout(id: string): Promise<Workout> {
  return apiFetch<Workout>(`/workout/${encodeURIComponent(id)}`);
}

export function createWorkout(data: WorkoutFormData): Promise<Workout> {
  return apiFetch<Workout>("/workout", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateWorkout(
  id: string,
  data: WorkoutFormData,
): Promise<Workout> {
  return apiFetch<Workout>(`/workout/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteWorkout(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/workout/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function fetchCalendar(
  year?: number,
  month?: number,
): Promise<CalendarData> {
  const params = new URLSearchParams();
  if (year !== undefined) params.set("year", year.toString());
  if (month !== undefined) params.set("month", month.toString());
  const qs = params.toString();
  return apiFetch<CalendarData>(`/workout-calendar${qs ? `?${qs}` : ""}`);
}
