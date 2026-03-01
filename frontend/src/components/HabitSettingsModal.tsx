import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import AllHabitsList from "./AllHabitsList";
import {
  fetchPresets,
  createPreset,
  updatePreset,
  deletePreset,
} from "../api/habits";
import type { Habit } from "../types";

interface HabitSettingsModalProps {
  habits: Habit[];
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
  onClose: () => void;
}

type Tab = "habits" | "presets";

export default function HabitSettingsModal({
  habits,
  onEdit,
  onDelete,
  onClose,
}: HabitSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("habits");
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const queryClient = useQueryClient();

  const { data: presets = [] } = useQuery({
    queryKey: ["presets"],
    queryFn: fetchPresets,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["presets"] });

  const createMutation = useMutation({
    mutationFn: createPreset,
    onSuccess: () => {
      invalidate();
      setNewName("");
      setIsAdding(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updatePreset(id, { name }),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      setEditingName("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePreset,
    onSuccess: invalidate,
  });

  const handleAdd = () => {
    if (newName.trim()) createMutation.mutate({ name: newName.trim() });
  };

  const handleUpdate = (id: string) => {
    if (editingName.trim()) updateMutation.mutate({ id, name: editingName.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-base-100 rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
          <div className="flex gap-1 bg-base-200 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("habits")}
              className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
                activeTab === "habits"
                  ? "bg-base-100 text-base-content shadow-sm"
                  : "text-base-content/50 hover:text-base-content"
              }`}
            >
              habits
            </button>
            <button
              onClick={() => setActiveTab("presets")}
              className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
                activeTab === "presets"
                  ? "bg-base-100 text-base-content shadow-sm"
                  : "text-base-content/50 hover:text-base-content"
              }`}
            >
              presets
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4">
          {activeTab === "habits" && (
            <AllHabitsList
              habits={habits}
              onEdit={(habit) => {
                onClose();
                onEdit(habit);
              }}
              onDelete={onDelete}
            />
          )}

          {activeTab === "presets" && (
            <div className="space-y-3">
              {isAdding ? (
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAdd();
                      else if (e.key === "Escape") {
                        setIsAdding(false);
                        setNewName("");
                      }
                    }}
                    placeholder="activity name..."
                    className="flex-1 bg-base-200 text-base-content px-3 py-2 rounded-lg border border-warning focus:outline-none text-sm placeholder:text-base-content/30"
                    autoFocus
                  />
                  <button
                    onClick={handleAdd}
                    disabled={createMutation.isPending}
                    className="px-3 py-2 bg-warning text-white rounded-lg hover:brightness-110 transition-all"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsAdding(false);
                      setNewName("");
                    }}
                    className="px-3 py-2 bg-base-200 text-base-content/50 rounded-lg hover:text-base-content transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAdding(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-base-200 text-warning rounded-lg border border-warning/30 hover:border-warning hover:bg-warning/10 transition-all font-semibold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  add new preset
                </button>
              )}

              {presets.length > 0 ? (
                <div className="space-y-2">
                  {presets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center gap-2 p-3 bg-base-200 rounded-lg group"
                    >
                      {editingId === preset.id ? (
                        <>
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdate(preset.id);
                              else if (e.key === "Escape") {
                                setEditingId(null);
                                setEditingName("");
                              }
                            }}
                            className="flex-1 bg-base-300 text-base-content px-2 py-1 rounded border border-primary focus:outline-none text-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdate(preset.id)}
                            disabled={updateMutation.isPending}
                            className="p-1 text-success hover:text-success/70 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditingName("");
                            }}
                            className="p-1 text-base-content/30 hover:text-base-content transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-warning rounded-full flex-shrink-0" />
                          <span className="flex-1 text-base-content text-sm">
                            {preset.name}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingId(preset.id);
                                setEditingName(preset.name);
                              }}
                              className="p-1 text-base-content/30 hover:text-primary transition-colors"
                              aria-label="Edit preset"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete preset "${preset.name}"?`)) {
                                  deleteMutation.mutate(preset.id);
                                }
                              }}
                              className="p-1 text-base-content/30 hover:text-error transition-colors"
                              aria-label="Delete preset"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-base-content/50 text-sm py-8">
                  no presets yet — add your first one!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
