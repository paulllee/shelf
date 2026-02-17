import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">save as template</h3>
        <div className="form-control">
          <label className="label">
            <span className="label-text">template name</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            placeholder="e.g., push day, leg day"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
          />
        </div>
        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={mutation.isPending}
          >
            save
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
