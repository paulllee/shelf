import { Check, Trash2, Edit2 } from "lucide-react";
import type { Habit } from "../types";

interface HabitListProps {
  habits: Habit[];
  date: Date;
  onToggle: (habitId: string, dateStr: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDaysText(days: number[]): string {
  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  if (days.length === 7) return "every day";
  if (days.length === 5 && !days.includes(0) && !days.includes(6))
    return "weekdays";
  if (days.length === 2 && days.includes(0) && days.includes(6))
    return "weekends";
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => dayNames[d])
    .join(", ");
}

export default function HabitList({
  habits,
  date,
  onToggle,
  onEdit,
  onDelete,
}: HabitListProps) {
  const dateStr = formatDateStr(date);

  if (habits.length === 0) {
    return (
      <div className="bg-base-200 rounded-lg p-6 text-center">
        <p className="text-base-content/50 text-sm">
          no habits scheduled for today
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {habits.map((habit) => {
        const completed = habit.completions.includes(dateStr);
        return (
          <div
            key={habit.id}
            className="bg-base-200 rounded-lg p-3 sm:p-4 shadow-sm group"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => onToggle(habit.id, dateStr)}
                className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 transition-all flex items-center justify-center"
                style={{
                  borderColor: completed ? habit.color : `${habit.color}50`,
                  backgroundColor: completed ? habit.color : "transparent",
                }}
              >
                {completed && (
                  <Check
                    className="w-7 h-7 sm:w-8 sm:h-8 text-white"
                    strokeWidth={3}
                  />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <h3
                  className={`text-sm sm:text-base font-semibold transition-all ${
                    completed
                      ? "text-base-content/50 line-through"
                      : "text-base-content"
                  }`}
                >
                  {habit.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: habit.color }}
                  />
                  <span className="text-base-content/50 text-xs">
                    {getDaysText(habit.days)}
                  </span>
                </div>
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(habit)}
                  className="flex-shrink-0 p-1.5 sm:p-2 text-base-content/30 hover:text-primary transition-colors"
                  aria-label="Edit habit"
                >
                  <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete habit "${habit.name}"?`)) {
                      onDelete(habit.id);
                    }
                  }}
                  className="flex-shrink-0 p-1.5 sm:p-2 text-base-content/30 hover:text-error transition-colors"
                  aria-label="Delete habit"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
