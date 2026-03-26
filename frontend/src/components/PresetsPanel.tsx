import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, X, Edit2, Trash2 } from "lucide-react";
import { createPreset, updatePreset, deletePreset } from "../api/habits";
import type { Preset } from "../types";
import ConfirmDelete from "./ConfirmDelete";

interface PresetsPanelProps {
  presetsData: Preset[];
}

export default function PresetsPanel({ presetsData }: PresetsPanelProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["presets"] });

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

  return (
    <div className="space-y-3">
      {isAdding ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim())
                createMutation.mutate({ name: newName.trim() });
              else if (e.key === "Escape") {
                setIsAdding(false);
                setNewName("");
              }
            }}
            placeholder="activity name"
            className="flex-1 bg-base-200 text-base-content px-3 py-2 rounded-lg border border-primary/20 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors motion-reduce:transition-none text-sm placeholder:text-base-content/30"
            autoFocus
          />
          <button
            onClick={() => {
              if (newName.trim()) createMutation.mutate({ name: newName.trim() });
            }}
            disabled={createMutation.isPending}
            className="px-3 py-2 bg-primary text-primary-content rounded-lg hover:brightness-110 transition-[filter] motion-reduce:transition-none"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsAdding(false);
              setNewName("");
            }}
            className="px-3 py-2 bg-base-200 text-base-content/50 rounded-lg hover:text-base-content transition-colors motion-reduce:transition-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
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
              {editingId === preset.id ? (
                <>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editingName.trim())
                        updateMutation.mutate({
                          id: preset.id,
                          name: editingName.trim(),
                        });
                      else if (e.key === "Escape") {
                        setEditingId(null);
                        setEditingName("");
                      }
                    }}
                    className="flex-1 bg-base-300 text-base-content px-2 py-1 rounded border border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors motion-reduce:transition-none text-sm"
                    autoFocus
                  />
                  <button
                    onClick={() =>
                      editingName.trim() &&
                      updateMutation.mutate({
                        id: preset.id,
                        name: editingName.trim(),
                      })
                    }
                    disabled={updateMutation.isPending}
                    className="p-1 text-base-content/50 hover:text-base-content transition-colors motion-reduce:transition-none"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditingName("");
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
                        setEditingId(preset.id);
                        setEditingName(preset.name);
                      }}
                      className="p-1 text-base-content/30 hover:text-primary transition-colors motion-reduce:transition-none"
                      aria-label="Edit preset"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {confirmingDeleteId === preset.id ? (
                      <ConfirmDelete
                        size="xs"
                        onConfirm={() => {
                          deleteMutation.mutate(preset.id);
                          setConfirmingDeleteId(null);
                        }}
                        onCancel={() => setConfirmingDeleteId(null)}
                        isPending={deleteMutation.isPending}
                      />
                    ) : (
                      <button
                        onClick={() => setConfirmingDeleteId(preset.id)}
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
  );
}
