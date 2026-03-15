import { Edit2, Trash2, MoreVertical } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import type { Habit } from "../types";
import { getDaysText } from "../utils/habits";
import { useClickOutside } from "../hooks/useClickOutside";
import { menuItemCls } from "../styles";

interface AllHabitsListProps {
  habits: Habit[];
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
}

export default function AllHabitsList({
  habits,
  onEdit,
  onDelete,
}: AllHabitsListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setOpenMenuId(null), []);
  useClickOutside(menuRef, !!openMenuId, closeMenu);

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
            <div key={habit.id} className="flex items-center gap-3 px-4 py-3">
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
                  className="p-2 rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-300 transition-colors motion-reduce:transition-none"
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
                      className={menuItemCls}
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
                      className={`${menuItemCls} text-error`}
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
