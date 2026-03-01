import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "./Modal";
import GroupsEditor from "./GroupsEditor";
import { updateTemplate } from "../api/templates";
import type { WorkoutTemplate, ExerciseGroup } from "../types";

interface TemplateFormModalProps {
  editTemplate: WorkoutTemplate;
  onClose: () => void;
}

export default function TemplateFormModal({
  editTemplate,
  onClose,
}: TemplateFormModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(editTemplate.name);
  const [groups, setGroups] = useState<ExerciseGroup[]>(editTemplate.groups);

  const mutation = useMutation({
    mutationFn: () => updateTemplate(editTemplate.id, { name, groups }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl">
      <h3 className="text-base-content text-xl font-bold mb-5 pr-8">
        edit template
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">name</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            placeholder="template name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="divider text-sm">exercise groups</div>

        <GroupsEditor groups={groups} onChange={setGroups} />

        <div className="flex gap-2 justify-end pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-base-200 text-base-content rounded-full border border-primary/20 hover:border-primary transition-colors motion-reduce:transition-none font-semibold text-sm"
          >
            cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2.5 bg-primary text-primary-content rounded-full border border-primary/80 font-semibold text-sm hover:brightness-110 transition-[filter,opacity] motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 relative overflow-hidden"
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
      </form>
    </Modal>
  );
}
