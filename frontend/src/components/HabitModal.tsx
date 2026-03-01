import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { createHabit, updateHabit } from "../api/habits";
import type { Habit, HabitFormData } from "../types";

const PRESET_COLORS = [
  "#605dff",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
];

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

interface HabitModalProps {
  habit?: Habit;
  onClose: () => void;
}

export default function HabitModal({ habit, onClose }: HabitModalProps) {
  const [name, setName] = useState(habit?.name ?? "");
  const [selectedDays, setSelectedDays] = useState<number[]>(habit?.days ?? []);
  const [selectedColor, setSelectedColor] = useState(
    habit?.color ?? PRESET_COLORS[0],
  );

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: HabitFormData }) =>
      updateHabit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      onClose();
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedDays.length === 0) return;

    const formData: HabitFormData = {
      name: name.trim(),
      days: selectedDays,
      color: selectedColor,
      completions: habit?.completions,
    };

    if (habit) {
      updateMutation.mutate({ id: habit.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-base-300 rounded-xl max-w-md w-full p-6 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.3)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base-content text-xl font-bold">
            {habit ? "edit habit" : "add new habit"}
          </h2>
          <button
            onClick={onClose}
            className="text-base-content/50 hover:text-base-content transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-base-content text-sm font-semibold mb-2">
              habit name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., morning meditation"
              className="w-full bg-base-200 text-base-content px-4 py-3 rounded-lg border border-primary/20 focus:border-primary focus:outline-none transition-colors placeholder:text-base-content/30"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-base-content text-sm font-semibold mb-2">
              repeat on
            </label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setSelectedDays([0, 1, 2, 3, 4, 5, 6])}
                className="text-primary text-xs hover:underline"
              >
                every day
              </button>
              <span className="text-base-content/30">•</span>
              <button
                type="button"
                onClick={() => setSelectedDays([1, 2, 3, 4, 5])}
                className="text-primary text-xs hover:underline"
              >
                weekdays
              </button>
              <span className="text-base-content/30">•</span>
              <button
                type="button"
                onClick={() => setSelectedDays([0, 6])}
                className="text-primary text-xs hover:underline"
              >
                weekends
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {DAY_NAMES.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={`aspect-square rounded-lg text-xs font-semibold uppercase transition-all ${
                    selectedDays.includes(index)
                      ? "bg-primary text-primary-content shadow-[0px_2px_4px_0px_rgba(96,93,255,0.3)]"
                      : "bg-base-200 text-base-content/50 border border-primary/20 hover:border-primary"
                  }`}
                >
                  {day[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-base-content text-sm font-semibold mb-2">
              color
            </label>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`aspect-square rounded-full transition-all ${
                    selectedColor === color
                      ? "ring-2 ring-offset-2 ring-offset-base-300 ring-base-content scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          {(createMutation.isError || updateMutation.isError) && (
            <p className="text-error text-sm">
              {(createMutation.error || updateMutation.error)?.message}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 bg-base-200 text-base-content px-4 py-3 rounded-full border border-primary/20 hover:border-primary transition-colors font-semibold text-sm"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || selectedDays.length === 0 || isPending}
              className="flex-1 bg-primary text-primary-content px-4 py-3 rounded-full border border-primary/80 font-semibold text-sm shadow-[0px_3px_2px_-2px_rgba(96,93,255,0.3),0px_4px_3px_-2px_rgba(96,93,255,0.3)] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 relative overflow-hidden"
            >
              <div className="absolute inset-0 rounded-full shadow-[inset_0px_0.5px_0px_1.5px_rgba(255,255,255,0.06)]" />
              <span className="relative">
                {isPending ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : habit ? (
                  "save changes"
                ) : (
                  "add habit"
                )}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
