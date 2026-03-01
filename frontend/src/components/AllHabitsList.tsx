import { Edit2, Trash2, MoreVertical } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Habit } from "../types";

interface AllHabitsListProps {
  habits: Habit[];
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

export default function AllHabitsList({
  habits,
  onEdit,
  onDelete,
}: AllHabitsListProps) {
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
      <div className="bg-base-200 rounded-lg p-6 text-center shadow-sm">
        <p className="text-base-content/50 text-sm">no habits yet</p>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-lg shadow-sm overflow-hidden">
      <div className="divide-y divide-base-300">
        {habits.map((habit) => {
          const isMenuOpen = openMenuId === habit.id;
          return (
            <div
              key={habit.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: habit.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-base-content leading-tight">
                  {habit.name}
                </div>
                <div className="text-xs text-base-content/50 mt-0.5">
                  {getDaysText(habit.days)}
                </div>
              </div>

              <div className="relative" ref={isMenuOpen ? menuRef : null}>
                <button
                  onClick={() => setOpenMenuId(isMenuOpen ? null : habit.id)}
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
          );
        })}
      </div>
    </div>
  );
}
