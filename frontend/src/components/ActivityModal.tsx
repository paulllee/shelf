import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { createActivity } from "../api/habits";

interface ActivityModalProps {
  date: string; // YYYY-MM-DD
  presets: string[];
  onClose: () => void;
}

export default function ActivityModal({
  date,
  presets,
  onClose,
}: ActivityModalProps) {
  const [name, setName] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate({ name: name.trim(), date });
  };

  const handlePresetClick = (presetName: string) => {
    mutation.mutate({ name: presetName, date });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-base-300 rounded-xl max-w-md w-full p-6 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.3)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base-content text-xl font-bold">add activity</h2>
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
              activity name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., yoga class"
              className="w-full bg-base-200 text-base-content px-4 py-3 rounded-lg border border-warning/20 focus:border-warning focus:outline-none transition-colors placeholder:text-base-content/30"
              autoFocus
            />

            {presets.length > 0 && (
              <div className="mt-3">
                <p className="text-base-content/50 text-xs mb-2">quick add:</p>
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handlePresetClick(preset)}
                      disabled={mutation.isPending}
                      className="px-3 py-1 bg-base-200 text-base-content text-xs rounded-full border border-warning/30 hover:border-warning hover:bg-warning/10 transition-all"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {mutation.isError && (
            <p className="text-error text-sm">{mutation.error.message}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="flex-1 bg-base-200 text-base-content px-4 py-3 rounded-full border border-warning/20 hover:border-warning transition-colors font-semibold text-sm"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || mutation.isPending}
              className="flex-1 bg-warning text-white px-4 py-3 rounded-full border border-warning/80 font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
            >
              {mutation.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "add activity"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
