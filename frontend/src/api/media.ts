import { apiFetch } from "./client";
import type { MediaItem, MediaFormData } from "../types";

export function fetchMedia(status: string): Promise<MediaItem[]> {
  return apiFetch<MediaItem[]>(`/media?status=${encodeURIComponent(status)}`);
}

export function fetchMediaItem(id: string): Promise<MediaItem> {
  return apiFetch<MediaItem>(`/media/${encodeURIComponent(id)}`);
}

export function createMedia(data: MediaFormData): Promise<MediaItem> {
  return apiFetch<MediaItem>("/media", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateMedia(
  id: string,
  data: MediaFormData,
): Promise<MediaItem> {
  return apiFetch<MediaItem>(`/media/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteMedia(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/media/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function checkMediaName(
  name: string,
  exclude?: string,
): Promise<{ duplicate: boolean }> {
  const params = new URLSearchParams({ name });
  if (exclude) params.set("exclude", exclude);
  return apiFetch<{ duplicate: boolean }>(`/media/check-name?${params}`);
}
