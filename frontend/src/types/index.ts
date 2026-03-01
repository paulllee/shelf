export interface WorkoutSet {
  reps: number | null;
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

export interface Habit {
  id: string;
  name: string;
  days: number[]; // 0=Sun … 6=Sat
  color: string;
  completions: string[]; // YYYY-MM-DD
}

export interface HabitFormData {
  name: string;
  days: number[];
  color: string;
  completions?: string[];
}

export interface Activity {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
}

export interface ActivityFormData {
  name: string;
  date: string;
}

export interface Preset {
  id: string;
  name: string;
}

export interface PresetFormData {
  name: string;
}
