import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SlideOver from "./SlideOver";
import { createHabit, updateHabit } from "../api/habits";
import type { Habit, HabitFormData } from "../types";
import { inputCls, btnPrimary, btnSecondary } from "../styles";

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
    <SlideOver onClose={onClose} title={habit ? "edit habit" : "add new habit"}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="habit-name"
            className="block text-base-content text-sm font-semibold mb-2"
          >
            habit name
          </label>
          <input
            id="habit-name"
            name="name"
            autoComplete="off"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., morning meditation"
            className={inputCls}
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
            <span className="text-base-content/30">&bull;</span>
            <button
              type="button"
              onClick={() => setSelectedDays([1, 2, 3, 4, 5])}
              className="text-primary text-xs hover:underline"
            >
              weekdays
            </button>
            <span className="text-base-content/30">&bull;</span>
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
                className={`aspect-square rounded-lg text-xs font-semibold uppercase transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  selectedDays.includes(index)
                    ? "bg-primary text-primary-content shadow-sm"
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
                className={`aspect-square rounded-full transition-[transform] motion-reduce:transition-none ${
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
            className={`flex-1 ${btnSecondary}`}
          >
            cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || selectedDays.length === 0 || isPending}
            className={`flex-1 ${btnPrimary}`}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : habit ? (
              "save changes"
            ) : (
              "add habit"
            )}
          </button>
        </div>
      </form>
    </SlideOver>
  );
}
