import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteTemplate } from "../api/templates";
import type { WorkoutTemplate } from "../types";

interface WorkoutTemplatesProps {
  templates: WorkoutTemplate[];
  onUse: (template: WorkoutTemplate) => void;
}

export default function WorkoutTemplates({
  templates,
  onUse,
}: WorkoutTemplatesProps) {
  const queryClient = useQueryClient();

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
          className="flex items-center justify-between bg-base-300 rounded-lg px-3 py-2"
        >
          <div className="flex-1">
            <span className="font-medium">{template.name}</span>
            <span className="text-xs text-base-content/50 ml-2">
              {template.groups.length} group
              {template.groups.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              className="btn btn-primary btn-xs"
              onClick={() => onUse(template)}
            >
              use
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => {
                if (confirm(`delete template '${template.name}'?`)) {
                  deleteMutation.mutate(template.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
