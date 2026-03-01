import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import {
  fetchPresets,
  createPreset,
  updatePreset,
  deletePreset,
} from "../api/habits";

interface PresetsModalProps {
  onClose: () => void;
}

export default function PresetsModal({ onClose }: PresetsModalProps) {
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

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-base-300 rounded-xl max-w-md w-full p-6 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.3)] max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base-content text-xl font-bold">
              activity presets
            </h2>
            <p className="text-base-content/50 text-xs mt-1">
              manage your common activities
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-base-content/50 hover:text-base-content transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

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
                          onClick={() => startEditing(preset.id, preset.name)}
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
      </div>
    </div>
  );
}
