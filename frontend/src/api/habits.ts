import { apiFetch } from "./client";
import type {
  Activity,
  ActivityFormData,
  Habit,
  HabitFormData,
  Preset,
  PresetFormData,
} from "../types";

export function fetchHabits(): Promise<Habit[]> {
  return apiFetch<Habit[]>("/habits");
}

export function fetchHabit(id: string): Promise<Habit> {
  return apiFetch<Habit>(`/habit/${encodeURIComponent(id)}`);
}

export function createHabit(data: HabitFormData): Promise<Habit> {
  return apiFetch<Habit>("/habit", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateHabit(id: string, data: HabitFormData): Promise<Habit> {
  return apiFetch<Habit>(`/habit/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteHabit(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/habit/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function toggleCompletion(
  habitId: string,
  date: string,
): Promise<Habit> {
  return apiFetch<Habit>(
    `/habit/${encodeURIComponent(habitId)}/toggle/${encodeURIComponent(date)}`,
    { method: "POST" },
  );
}

export function fetchActivities(date?: string): Promise<Activity[]> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiFetch<Activity[]>(`/activities${qs}`);
}

export function createActivity(data: ActivityFormData): Promise<Activity> {
  return apiFetch<Activity>("/activity", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteActivity(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/activity/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function fetchActivityPresets(): Promise<string[]> {
  return apiFetch<string[]>("/habit-presets");
}

export function fetchPresets(): Promise<Preset[]> {
  return apiFetch<Preset[]>("/presets");
}

export function createPreset(data: PresetFormData): Promise<Preset> {
  return apiFetch<Preset>("/preset", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updatePreset(
  id: string,
  data: PresetFormData,
): Promise<Preset> {
  return apiFetch<Preset>(`/preset/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deletePreset(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/preset/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function shiftHabit(
  habitId: string,
  from: string,
  to: string | null,
): Promise<Habit> {
  const body: { from: string; to?: string } = { from };
  if (to !== null) body.to = to;
  return apiFetch<Habit>(`/habit/${encodeURIComponent(habitId)}/shift`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function cancelShift(habitId: string, fromDate: string): Promise<Habit> {
  return apiFetch<Habit>(
    `/habit/${encodeURIComponent(habitId)}/shift/${encodeURIComponent(fromDate)}`,
    { method: "DELETE" },
  );
}
