import { Check, Trash2, Edit2, MoreVertical } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Habit } from "../types";
import { formatDateStr } from "../utils/date";

interface HabitListProps {
  habits: Habit[];
  date: Date;
  onToggle: (habitId: string, dateStr: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuId) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

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
        const isMenuOpen = openMenuId === habit.id;
        return (
          <div
            key={habit.id}
            className="bg-base-200 rounded-lg p-3 sm:p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => onToggle(habit.id, dateStr)}
                className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 transition-colors motion-reduce:transition-none flex items-center justify-center"
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
                  className={`text-sm sm:text-base font-semibold transition-colors motion-reduce:transition-none ${
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

              <div className="relative" ref={isMenuOpen ? menuRef : null}>
                <button
                  onClick={() =>
                    setOpenMenuId(isMenuOpen ? null : habit.id)
                  }
                  className="p-2 rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-300 transition-colors"
                  aria-label="More options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-10 bg-base-100 border border-base-300 rounded-lg shadow-lg overflow-hidden min-w-[120px]">
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        onEdit(habit);
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left hover:bg-base-200 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-base-content/50" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        if (window.confirm(`Delete habit "${habit.name}"?`)) {
                          onDelete(habit.id);
                        }
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-error hover:bg-base-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
