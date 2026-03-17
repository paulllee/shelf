import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Settings,
  Edit2,
  Trash2,
  Check,
  X,
} from "lucide-react";
import HabitList from "./HabitList";
import ExpandCollapse from "./ExpandCollapse";
import HabitCalendar from "./HabitCalendar";
import HabitModal from "./HabitModal";
import DayDetailModal from "./DayDetailModal";
import AllHabitsList from "./AllHabitsList";
import {
  fetchHabits,
  fetchActivities,
  fetchPresets,
  toggleCompletion,
  deleteHabit,
  shiftHabit,
  cancelShift,
  createActivity,
  createPreset,
  updatePreset,
  deletePreset,
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
  });
  const presets = useMemo(() => presetsData.map((p) => p.name), [presetsData]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [showActivityInput, setShowActivityInput] = useState(false);
  const [activityName, setActivityName] = useState("");
  const [selectedDayDetail, setSelectedDayDetail] = useState<Date | null>(null);
  const [isOtherHabitsExpanded, setIsOtherHabitsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"habits" | "presets">(
    "habits",
  );
  const [isAddingPreset, setIsAddingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState("");
  const [confirmingDeletePresetId, setConfirmingDeletePresetId] = useState<string | null>(null);
  const activityInputRef = useRef<HTMLInputElement>(null);

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

  const activityMutation = useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setActivityName("");
      setShowActivityInput(false);
    },
  });

  const createPresetMutation = useMutation({
    mutationFn: createPreset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presets"] });
      setNewPresetName("");
      setIsAddingPreset(false);
    },
  });

  const updatePresetMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updatePreset(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presets"] });
      setEditingPresetId(null);
      setEditingPresetName("");
    },
  });

  const deletePresetMutation = useMutation({
    mutationFn: deletePreset,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["presets"] }),
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

  const handleToggle = (habitId: string, dateStr: string) => {
    toggleMutation.mutate({ habitId, dateStr });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleShift = (
    habitId: string,
    fromDate: string,
    toDate: string | null,
  ) => {
    shiftMutation.mutate({ habitId, from: fromDate, to: toDate });
  };

  const handleCancelShift = (habitId: string, fromDate: string) => {
    cancelShiftMutation.mutate({ habitId, fromDate });
  };

  return (
    <div className="space-y-6">
      <div>
        {/* Header row matching figma layout */}
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
            {/* Add activity button */}
            <button
              onClick={() => setShowActivityInput((v) => !v)}
              aria-label="Add activity"
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-base-200 border border-primary/20 text-primary hover:bg-primary/10 transition-colors motion-reduce:transition-none flex items-center gap-1.5 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">add activity</span>
            </button>
            {/* Add habit button */}
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

        {/* Inline settings */}
        <ExpandCollapse expanded={showSettings}>
            <div className="border border-base-content/10 rounded-lg overflow-hidden mb-4">
              {/* Tab bar */}
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
                    onDelete={handleDelete}
                  />
                )}

                {settingsTab === "presets" && (
                  <div className="space-y-3">
                    {isAddingPreset ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newPresetName}
                          onChange={(e) => setNewPresetName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newPresetName.trim())
                              createPresetMutation.mutate({
                                name: newPresetName.trim(),
                              });
                            else if (e.key === "Escape") {
                              setIsAddingPreset(false);
                              setNewPresetName("");
                            }
                          }}
                          placeholder="activity name"
                          className="flex-1 bg-base-200 text-base-content px-3 py-2 rounded-lg border border-primary/20 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors motion-reduce:transition-none text-sm placeholder:text-base-content/30"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            if (newPresetName.trim())
                              createPresetMutation.mutate({
                                name: newPresetName.trim(),
                              });
                          }}
                          disabled={createPresetMutation.isPending}
                          className="px-3 py-2 bg-primary text-primary-content rounded-lg hover:brightness-110 transition-[filter] motion-reduce:transition-none"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingPreset(false);
                            setNewPresetName("");
                          }}
                          className="px-3 py-2 bg-base-200 text-base-content/50 rounded-lg hover:text-base-content transition-colors motion-reduce:transition-none"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsAddingPreset(true)}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-base-200 text-primary rounded-lg border border-primary/20 hover:border-primary hover:bg-primary/10 transition-colors motion-reduce:transition-none font-semibold text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        add new preset
                      </button>
                    )}

                    {presetsData.length > 0 ? (
                      <div className="space-y-2">
                        {presetsData.map((preset) => (
                          <div
                            key={preset.id}
                            className="flex items-center gap-2 p-3 bg-base-200 rounded-lg"
                          >
                            {editingPresetId === preset.id ? (
                              <>
                                <input
                                  type="text"
                                  value={editingPresetName}
                                  onChange={(e) =>
                                    setEditingPresetName(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (
                                      e.key === "Enter" &&
                                      editingPresetName.trim()
                                    )
                                      updatePresetMutation.mutate({
                                        id: preset.id,
                                        name: editingPresetName.trim(),
                                      });
                                    else if (e.key === "Escape") {
                                      setEditingPresetId(null);
                                      setEditingPresetName("");
                                    }
                                  }}
                                  className="flex-1 bg-base-300 text-base-content px-2 py-1 rounded border border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors motion-reduce:transition-none text-sm"
                                  autoFocus
                                />
                                <button
                                  onClick={() =>
                                    editingPresetName.trim() &&
                                    updatePresetMutation.mutate({
                                      id: preset.id,
                                      name: editingPresetName.trim(),
                                    })
                                  }
                                  disabled={updatePresetMutation.isPending}
                                  className="p-1 text-base-content/50 hover:text-base-content transition-colors motion-reduce:transition-none"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingPresetId(null);
                                    setEditingPresetName("");
                                  }}
                                  className="p-1 text-base-content/30 hover:text-base-content transition-colors motion-reduce:transition-none"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <div className="w-2 h-2 bg-base-content/20 rounded-full flex-shrink-0" />
                                <span className="flex-1 text-base-content text-sm">
                                  {preset.name}
                                </span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingPresetId(preset.id);
                                      setEditingPresetName(preset.name);
                                    }}
                                    className="p-1 text-base-content/30 hover:text-primary transition-colors motion-reduce:transition-none"
                                    aria-label="Edit preset"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  {confirmingDeletePresetId === preset.id ? (
                                    <div className="flex items-center gap-1.5 animate-fade-in">
                                      <button
                                        onClick={() => {
                                          deletePresetMutation.mutate(preset.id);
                                          setConfirmingDeletePresetId(null);
                                        }}
                                        className="text-error text-xs font-semibold px-1"
                                      >
                                        delete
                                      </button>
                                      <button
                                        onClick={() => setConfirmingDeletePresetId(null)}
                                        className="p-1 text-base-content/30 hover:text-base-content transition-colors motion-reduce:transition-none"
                                        aria-label="Cancel"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setConfirmingDeletePresetId(preset.id)}
                                      className="p-1 text-base-content/30 hover:text-error transition-colors motion-reduce:transition-none"
                                      aria-label="Delete preset"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-base-content/50 text-sm py-8">
                        no presets yet
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
        </ExpandCollapse>

        {/* Inline activity input */}
        <ExpandCollapse expanded={showActivityInput} onExpanded={() => activityInputRef.current?.focus({ preventScroll: true })}>
            <form
              className="mb-4 flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!activityName.trim()) return;
                activityMutation.mutate({
                  name: activityName.trim(),
                  date: todayStr,
                });
              }}
            >
              <div className="flex gap-2">
                <input
                  ref={activityInputRef}
                  type="text"
                  autoComplete="off"
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  placeholder="activity name"
                  className="flex-1 bg-base-200 text-base-content px-3 py-2 rounded-lg border border-primary/20 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors motion-reduce:transition-none placeholder:text-base-content/30 text-sm"
                />
                <button
                  type="submit"
                  disabled={!activityName.trim() || activityMutation.isPending}
                  className="px-3 py-2 bg-primary text-primary-content rounded-lg text-sm font-semibold hover:brightness-110 transition-[filter,opacity] motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {activityMutation.isPending ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    "add"
                  )}
                </button>
              </div>
              {presets.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        activityMutation.mutate({
                          name: preset,
                          date: todayStr,
                        })
                      }
                      disabled={activityMutation.isPending}
                      className="px-2.5 py-1 bg-base-200 text-base-content text-xs rounded-full border border-primary/20 hover:border-primary hover:bg-primary/10 transition-colors motion-reduce:transition-none"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              )}
              {activityMutation.isError && (
                <p className="text-error text-xs">
                  {activityMutation.error.message}
                </p>
              )}
            </form>
        </ExpandCollapse>

        <HabitList
          habits={todaysHabits}
          date={today}
          onToggle={handleToggle}
          onEdit={setEditingHabit}
          onDelete={handleDelete}
          onShift={handleShift}
          onCancelShift={handleCancelShift}
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
              onToggle={handleToggle}
              onEdit={setEditingHabit}
              onDelete={handleDelete}
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
