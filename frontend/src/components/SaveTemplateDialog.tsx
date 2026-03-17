import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "./Modal";
import { createTemplate } from "../api/templates";
import type { ExerciseGroup } from "../types";
import { inputCls, btnPrimary, btnSecondary } from "../styles";

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

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
      <h2 className="text-base-content text-xl font-bold mb-6">
        save as template
      </h2>

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
            {mutation.isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "save"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
