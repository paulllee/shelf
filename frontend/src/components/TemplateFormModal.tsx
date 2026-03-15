import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "./Modal";
import GroupsEditor from "./GroupsEditor";
import { updateTemplate } from "../api/templates";
import type { WorkoutTemplate, ExerciseGroup } from "../types";
import { btnPrimary, btnSecondary, btnInnerGlow } from "../styles";

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
          <button type="button" onClick={onClose} className={btnSecondary}>
            cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className={btnPrimary}
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
      </form>
    </Modal>
  );
}
