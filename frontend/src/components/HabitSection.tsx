import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus, Settings } from "lucide-react";
import HabitList from "./HabitList";
import HabitCalendar from "./HabitCalendar";
import HabitModal from "./HabitModal";
import ActivityModal from "./ActivityModal";
import DayDetailModal from "./DayDetailModal";
import HabitSettingsModal from "./HabitSettingsModal";
import {
  fetchHabits,
  fetchActivities,
  fetchPresets,
  toggleCompletion,
  deleteHabit,
} from "../api/habits";
import type { Habit } from "../types";
import { formatDateStr } from "../utils/date";

export default function HabitSection() {
  const { data: habits = [] } = useQuery({
    queryKey: ["habits"],
    queryFn: fetchHabits,
  });
  const { data: activities = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: () => fetchActivities(),
  });
  const { data: presetsData = [] } = useQuery({
    queryKey: ["presets"],
    queryFn: fetchPresets,
  });
  const presets = presetsData.map((p) => p.name);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<Date | null>(null);
  const [isOtherHabitsExpanded, setIsOtherHabitsExpanded] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: ({ habitId, dateStr }: { habitId: string; dateStr: string }) =>
      toggleCompletion(habitId, dateStr),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHabit,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysHabits = habits.filter((h) => h.days.includes(today.getDay()));
  const otherHabits = habits.filter(
    (h) => !todaysHabits.some((th) => th.id === h.id),
  );

  const handleToggle = (habitId: string, dateStr: string) => {
    toggleMutation.mutate({ habitId, dateStr });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div>
        {/* Header row matching figma layout */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-semibold">today's habits</h2>
            {habits.length > 0 && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="text-base-content/40 hover:text-base-content transition-colors motion-reduce:transition-none"
                aria-label="Manage habits and presets"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {/* Add activity button */}
            <button
              onClick={() => setShowActivityModal(true)}
              aria-label="Add activity"
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-full border border-warning bg-base-200 text-warning hover:bg-warning/10 transition-colors motion-reduce:transition-none flex items-center gap-1.5 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">add activity</span>
            </button>
            {/* Add habit button */}
            <button
              onClick={() => setShowAddHabitModal(true)}
              aria-label="Add habit"
              className="h-9 sm:h-10 px-4 sm:px-5 rounded-full bg-primary border border-primary/80 text-primary-content hover:brightness-110 transition-[filter] motion-reduce:transition-none flex items-center gap-1.5 text-sm font-semibold relative overflow-hidden"
            >
              <div className="absolute inset-0 rounded-full shadow-[inset_0px_0.5px_0px_1.5px_rgba(255,255,255,0.06)]" />
              <Plus className="w-4 h-4 relative" />
              <span className="hidden sm:inline relative">add habit</span>
            </button>
          </div>
        </div>

        <HabitList
          habits={todaysHabits}
          date={today}
          onToggle={handleToggle}
          onEdit={setEditingHabit}
          onDelete={handleDelete}
        />
      </div>

      <HabitCalendar
        currentDate={currentDate}
        habits={habits}
        activities={activities}
        onPreviousMonth={() =>
          setCurrentDate(
            new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
          )
        }
        onNextMonth={() =>
          setCurrentDate(
            new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
          )
        }
        onDayClick={setSelectedDayDetail}
        onJumpToToday={() => setCurrentDate(new Date())}
      />

      {otherHabits.length > 0 && (
        <div>
          <button
            onClick={() => setIsOtherHabitsExpanded(!isOtherHabitsExpanded)}
            className="flex items-center gap-2 text-base-content font-semibold mb-4 hover:text-primary transition-colors motion-reduce:transition-none"
          >
            {isOtherHabitsExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            other habits ({otherHabits.length})
          </button>
          {isOtherHabitsExpanded && (
            <HabitList
              habits={otherHabits}
              date={today}
              onToggle={handleToggle}
              onEdit={setEditingHabit}
              onDelete={handleDelete}
            />
          )}
        </div>
      )}

      {showSettingsModal && (
        <HabitSettingsModal
          habits={habits}
          onEdit={(habit) => {
            setShowSettingsModal(false);
            setEditingHabit(habit);
          }}
          onDelete={handleDelete}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {(editingHabit || showAddHabitModal) && (
        <HabitModal
          habit={editingHabit ?? undefined}
          onClose={() => {
            setEditingHabit(null);
            setShowAddHabitModal(false);
          }}
        />
      )}

      {showActivityModal && (
        <ActivityModal
          date={formatDateStr(today)}
          presets={presets}
          onClose={() => setShowActivityModal(false)}
        />
      )}

      {selectedDayDetail && (
        <DayDetailModal
          date={selectedDayDetail}
          habits={habits}
          activities={activities}
          presets={presets}
          onClose={() => setSelectedDayDetail(null)}
        />
      )}
    </div>
  );
}
