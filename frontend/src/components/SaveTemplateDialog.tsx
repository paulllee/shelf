import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { createTemplate } from "../api/templates";
import type { ExerciseGroup } from "../types";

interface SaveTemplateDialogProps {
  groups: ExerciseGroup[];
  onClose: () => void;
}

export default function SaveTemplateDialog({
  groups,
  onClose,
}: SaveTemplateDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const mutation = useMutation({
    mutationFn: () => createTemplate({ name, groups }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      onClose();
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      alert("please enter a template name");
      return;
    }
    mutation.mutate();
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[1100]"
      onClick={onClose}
    >
      <div
        className="bg-base-300 rounded-xl max-w-md w-full p-6 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base-content text-xl font-bold">
            save as template
          </h2>
          <button
            onClick={onClose}
            className="text-base-content/50 hover:text-base-content transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-base-content text-sm font-semibold mb-2">
              template name
            </label>
            <input
              type="text"
              className="w-full bg-base-200 text-base-content px-4 py-3 rounded-lg border border-primary/20 focus:border-primary focus:outline-none transition-colors placeholder:text-base-content/30"
              placeholder="e.g., push day, leg day"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === "Escape") {
                  onClose();
                }
              }}
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-base-200 text-base-content px-4 py-3 rounded-full border border-primary/20 hover:border-primary transition-colors font-semibold text-sm"
            >
              cancel
            </button>
            <button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="flex-1 bg-primary text-primary-content px-4 py-3 rounded-full border border-primary/80 font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 relative overflow-hidden"
            >
              <div className="absolute inset-0 rounded-full shadow-[inset_0px_0.5px_0px_1.5px_rgba(255,255,255,0.06)]" />
              <span className="relative">
                {mutation.isPending ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  "save"
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
