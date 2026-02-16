export interface WorkoutSet {
  reps: number;
  weight: number | null;
}

export interface Exercise {
  name: string;
  sets: WorkoutSet[];
}

export interface ExerciseGroup {
  name: string;
  rest_seconds: number;
  exercises: Exercise[];
}

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

export interface Workout {
  id: string;
  date: string;
  time: string;
  content: string;
  groups: ExerciseGroup[];
}

export interface WorkoutFormData {
  date: string;
  time: string;
  groups: ExerciseGroup[];
  content?: string | null;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  groups: ExerciseGroup[];
}

export interface WorkoutTemplateFormData {
  name: string;
  groups: ExerciseGroup[];
}

export interface CalendarData {
  year: number;
  month: number;
  month_name: string;
  first_weekday: number;
  days_in_month: number;
  workout_dates: string[];
  today: string;
  prev_year: number;
  prev_month: number;
  next_year: number;
  next_month: number;
}

export interface EnumValues {
  countries: string[];
  types: string[];
  statuses: string[];
}
