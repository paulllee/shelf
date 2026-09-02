export interface MediaItem {
  id: string;
  name: string;
  country: string;
  type: string;
  status: string;
  rating: string;
  review: string;
}

export interface MediaFormData {
  name: string;
  country: string;
  type: string;
  status: string;
  rating?: string | null;
  review?: string | null;
}

export interface EnumValues {
  countries: string[];
  types: string[];
  statuses: string[];
}
