import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { deleteTemplate } from "../api/templates";
import type { WorkoutTemplate } from "../types";
import { btnPrimary, btnGhostXs } from "../styles";

interface WorkoutTemplatesProps {
  templates: WorkoutTemplate[];
  onUse: (template: WorkoutTemplate) => void;
  onEdit?: (template: WorkoutTemplate) => void;
}

export default function WorkoutTemplates({
  templates,
  onUse,
  onEdit,
}: WorkoutTemplatesProps) {
  const queryClient = useQueryClient();
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  if (templates.length === 0) {
    return <p className="text-sm text-base-content/50">no templates saved</p>;
  }

  return (
    <div className="space-y-2">
      {templates.map((template) => (
        <div
          key={template.id}
          className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between bg-base-300 rounded-lg px-3 py-2"
        >
          <div className="min-w-0">
            <span className="font-medium">{template.name}</span>
            <span className="text-xs text-base-content/50 ml-2">
              {template.groups.length} group
              {template.groups.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex gap-1 self-end sm:self-auto flex-shrink-0">
            <button
              type="button"
              className={btnPrimary.replace("px-4 py-2.5", "px-3 py-1 text-xs")}
              onClick={() => onUse(template)}
            >
              use
            </button>
            {onEdit && (
              <button
                type="button"
                className={btnGhostXs}
                onClick={() => onEdit(template)}
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
            {confirmingDeleteId === template.id ? (
              <div className="flex items-center gap-1.5 animate-fade-in">
                <button
                  type="button"
                  onClick={() => {
                    deleteMutation.mutate(template.id);
                    setConfirmingDeleteId(null);
                  }}
                  disabled={deleteMutation.isPending}
                  className="text-error text-xs font-semibold px-1 transition-colors motion-reduce:transition-none"
                >
                  delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDeleteId(null)}
                  className={btnGhostXs}
                >
                  &times;
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={btnGhostXs}
                onClick={() => setConfirmingDeleteId(template.id)}
                disabled={deleteMutation.isPending}
              >
                &times;
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
