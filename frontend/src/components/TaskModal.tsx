import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "./Modal";
import { createTask, updateTask, deleteTask } from "../api/tasks";
import type { Task, TaskFormData } from "../types";

const inputCls =
  "w-full bg-base-200 text-base-content px-4 py-3 rounded-lg border border-primary/20 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors motion-reduce:transition-none placeholder:text-base-content/30";

interface TaskModalProps {
  task?: Task | null;
  parentId?: string | null;
  onClose: () => void;
}

export default function TaskModal({ task, parentId, onClose }: TaskModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [status, setStatus] = useState(task?.status ?? "open");
  const [due, setDue] = useState(task?.due ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");

  const createMutation = useMutation({
    mutationFn: (data: TaskFormData) => createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: TaskFormData) => updateTask(task!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(task!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const data: TaskFormData = {
        title: title.trim(),
        status,
        due: due || null,
        parent: parentId ?? task?.parent ?? null,
        notes: notes.trim() || null,
      };
      if (isEdit) updateMutation.mutate(data);
      else createMutation.mutate(data);
    },
    [title, status, due, notes, parentId, task, isEdit, createMutation, updateMutation],
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal onClose={onClose}>
      <h3 className="text-base-content text-xl font-bold mb-5 pr-8">
        {isEdit ? "edit task" : parentId ? "add sub-task" : "add task"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="task-title"
            className="block text-base-content text-sm font-semibold mb-2"
          >
            title
          </label>
          <input
            id="task-title"
            name="title"
            autoComplete="off"
            type="text"
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="task-status"
              className="block text-base-content text-sm font-semibold mb-2"
            >
              status
            </label>
            <select
              id="task-status"
              name="status"
              className={inputCls}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="open">open</option>
              <option value="closed">closed</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="task-due"
              className="block text-base-content text-sm font-semibold mb-2"
            >
              due date
            </label>
            <input
              id="task-due"
              name="due"
              type="date"
              className={inputCls}
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="task-notes"
            className="block text-base-content text-sm font-semibold mb-2"
          >
            notes
          </label>
          <textarea
            id="task-notes"
            name="notes"
            className={`${inputCls} h-24 resize-none`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="optional notes..."
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {isEdit && (
            <button
              type="button"
              onClick={() => {
                if (confirm("delete this task?")) deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="text-error/60 hover:text-error text-sm font-semibold transition-colors motion-reduce:transition-none"
            >
              delete
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-base-200 text-base-content rounded-full border border-primary/20 hover:border-primary transition-colors motion-reduce:transition-none font-semibold text-sm"
          >
            cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !title.trim()}
            className="px-4 py-2.5 bg-primary text-primary-content rounded-full border border-primary/80 font-semibold text-sm hover:brightness-110 transition-[filter,opacity] motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 relative overflow-hidden"
          >
            <div className="absolute inset-0 rounded-full shadow-[inset_0px_0.5px_0px_1.5px_rgba(255,255,255,0.06)]" />
            <span className="relative">
              {isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : isEdit ? (
                "save"
              ) : (
                "add"
              )}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
