import { apiFetch } from "./client";
import type { EnumValues } from "../types";

export function fetchEnums(): Promise<EnumValues> {
  return apiFetch<EnumValues>("/meta/enums");
}
