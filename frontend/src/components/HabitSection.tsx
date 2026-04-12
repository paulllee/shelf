import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus, Settings } from "lucide-react";
import HabitList from "./HabitList";
import ExpandCollapse from "./ExpandCollapse";
import HabitCalendar from "./HabitCalendar";
import HabitModal from "./HabitModal";
import DayDetailModal from "./DayDetailModal";
import AllHabitsList from "./AllHabitsList";
import PresetsPanel from "./PresetsPanel";
import ActivityInput from "./ActivityInput";
import {
  fetchHabits,
  fetchActivities,
  fetchPresets,
  toggleCompletion,
  deleteHabit,
  shiftHabit,
  cancelShift,
} from "../api/habits";
import type { Habit } from "../types";
import { formatDateStr } from "../utils/date";
import { getHabitsForDay } from "../utils/habits";

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
    staleTime: 5 * 60 * 1000,
  });
  const presets = useMemo(() => presetsData.map((p) => p.name), [presetsData]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [showActivityInput, setShowActivityInput] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<Date | null>(null);
  const [isOtherHabitsExpanded, setIsOtherHabitsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"habits" | "presets">(
    "habits",
  );

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

  const shiftMutation = useMutation({
    mutationFn: ({
      habitId,
      from,
      to,
    }: {
      habitId: string;
      from: string;
      to: string | null;
    }) => shiftHabit(habitId, from, to),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });

  const cancelShiftMutation = useMutation({
    mutationFn: ({
      habitId,
      fromDate,
    }: {
      habitId: string;
      fromDate: string;
    }) => cancelShift(habitId, fromDate),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayStr = useMemo(() => formatDateStr(today), [today]);

  const todaysHabits = useMemo(
    () => getHabitsForDay(habits, today),
    [habits, today],
  );
  const todaysHabitIds = useMemo(
    () => new Set(todaysHabits.map((h) => h.id)),
    [todaysHabits],
  );
  const otherHabits = useMemo(
    () =>
      habits.filter(
        (h) =>
          !todaysHabitIds.has(h.id) &&
          !h.shifts.some((s) => s.from === todayStr),
      ),
    [habits, todaysHabitIds, todayStr],
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">today's habits</h2>
            {habits.length > 0 && (
              <button
                onClick={() => setShowSettings((v) => !v)}
                className={`transition-colors motion-reduce:transition-none ${showSettings ? "text-primary" : "text-base-content/40 hover:text-base-content"}`}
                aria-label="Manage habits and presets"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowActivityInput((v) => !v)}
              aria-label="Add activity"
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-base-200 border border-primary/20 text-primary hover:bg-primary/10 transition-colors motion-reduce:transition-none flex items-center gap-1.5 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">add activity</span>
            </button>
            <button
              onClick={() => setShowAddHabitModal(true)}
              aria-label="Add habit"
              className="h-9 sm:h-10 px-4 sm:px-5 rounded-full bg-primary border border-primary/80 text-primary-content hover:brightness-110 transition-[filter] motion-reduce:transition-none flex items-center gap-1.5 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">add habit</span>
            </button>
          </div>
        </div>

        <ExpandCollapse expanded={showSettings}>
          <div className="border border-base-content/10 rounded-lg overflow-hidden mb-4">
            <div className="flex gap-1 bg-base-200 p-1 m-3 rounded-lg">
              <button
                onClick={() => setSettingsTab("habits")}
                className={`flex-1 px-3 py-1 rounded-md text-sm font-semibold transition-colors motion-reduce:transition-none ${
                  settingsTab === "habits"
                    ? "bg-base-100 text-base-content shadow-sm"
                    : "text-base-content/50 hover:text-base-content"
                }`}
              >
                habits
              </button>
              <button
                onClick={() => setSettingsTab("presets")}
                className={`flex-1 px-3 py-1 rounded-md text-sm font-semibold transition-colors motion-reduce:transition-none ${
                  settingsTab === "presets"
                    ? "bg-base-100 text-base-content shadow-sm"
                    : "text-base-content/50 hover:text-base-content"
                }`}
              >
                presets
              </button>
            </div>
            <div className="px-3 pb-3">
              {settingsTab === "habits" && (
                <AllHabitsList
                  habits={habits}
                  onEdit={(habit) => {
                    setShowSettings(false);
                    setEditingHabit(habit);
                  }}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              )}
              {settingsTab === "presets" && (
                <PresetsPanel presetsData={presetsData} />
              )}
            </div>
          </div>
        </ExpandCollapse>

        <ActivityInput
          expanded={showActivityInput}
          presets={presets}
          todayStr={todayStr}
          onClose={() => setShowActivityInput(false)}
        />

        <HabitList
          habits={todaysHabits}
          date={today}
          onToggle={(habitId, dateStr) =>
            toggleMutation.mutate({ habitId, dateStr })
          }
          onEdit={setEditingHabit}
          onDelete={(id) => deleteMutation.mutate(id)}
          onShift={(habitId, fromDate, toDate) =>
            shiftMutation.mutate({ habitId, from: fromDate, to: toDate })
          }
          onCancelShift={(habitId, fromDate) =>
            cancelShiftMutation.mutate({ habitId, fromDate })
          }
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
            onClick={() => setIsOtherHabitsExpanded((prev) => !prev)}
            className="flex items-center gap-2 text-base-content font-semibold mb-4 hover:text-primary transition-colors motion-reduce:transition-none"
          >
            {isOtherHabitsExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            other habits ({otherHabits.length})
          </button>
          <ExpandCollapse expanded={isOtherHabitsExpanded}>
            <HabitList
              habits={otherHabits}
              date={today}
              onToggle={(habitId, dateStr) =>
                toggleMutation.mutate({ habitId, dateStr })
              }
              onEdit={setEditingHabit}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          </ExpandCollapse>
        </div>
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
