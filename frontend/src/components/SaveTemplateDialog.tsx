import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { createTemplate } from "../api/templates";
import type { ExerciseGroup } from "../types";
import { inputCls, btnPrimary, btnSecondary, btnInnerGlow } from "../styles";

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
            className="text-base-content/50 hover:text-base-content transition-colors motion-reduce:transition-none"
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
              className={inputCls}
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
            <button onClick={onClose} className={`flex-1 ${btnSecondary}`}>
              cancel
            </button>
            <button
              onClick={handleSave}
              disabled={mutation.isPending}
              className={`flex-1 ${btnPrimary}`}
            >
              <div className={btnInnerGlow} />
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
