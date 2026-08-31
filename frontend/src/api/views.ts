import { apiFetch } from "./client";
import type { ViewSettings } from "../types";

export function fetchViewSettings() {
  return apiFetch<ViewSettings>("/meta/views");
}
