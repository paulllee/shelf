import { apiFetch } from "./client";
import type {
  Task,
  TaskFormData,
  ChatMessage,
  ChatResponse,
} from "../types";

export function fetchTasks(): Promise<Task[]> {
  return apiFetch<Task[]>("/tasks");
}

export function fetchTask(id: string): Promise<Task> {
  return apiFetch<Task>(`/task/${encodeURIComponent(id)}`);
}

export function createTask(data: TaskFormData): Promise<Task> {
  return apiFetch<Task>("/task", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTask(id: string, data: TaskFormData): Promise<Task> {
  return apiFetch<Task>(`/task/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteTask(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/task/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function sendChatMessage(
  message: string,
  history: ChatMessage[],
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}
