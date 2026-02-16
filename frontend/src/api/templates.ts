import { apiFetch } from "./client";
import type { WorkoutTemplate, WorkoutTemplateFormData } from "../types";

export function fetchTemplates(): Promise<WorkoutTemplate[]> {
  return apiFetch<WorkoutTemplate[]>("/templates");
}

export function createTemplate(
  data: WorkoutTemplateFormData,
): Promise<WorkoutTemplate> {
  return apiFetch<WorkoutTemplate>("/template", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteTemplate(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/template/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
