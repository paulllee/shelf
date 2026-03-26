import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTask, updateTask, deleteTask } from "../api/tasks";
import type { Task, TaskFormData } from "../types";
import { inputCls, selectCls } from "../styles";
import ConfirmDelete from "./ConfirmDelete";

interface TaskInlineFormProps {
  task?: Task;
  parentId?: string | null;
  onClose: () => void;
  isVisible?: boolean;
}

export default function TaskInlineForm({
  task,
  parentId,
  onClose,
  isVisible,
}: TaskInlineFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!task;
  const [title, setTitle] = useState(task?.title ?? "");
  const [status, setStatus] = useState(task?.status ?? "open");
  const [due, setDue] = useState(task?.due ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVisible) {
      titleRef.current?.focus({ preventScroll: true });
    }
  }, [isVisible]);

  const saveMutation = useMutation({
    mutationFn: (data: TaskFormData) =>
      isEdit ? updateTask(task!.id, data) : createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (!isEdit) {
        setTitle("");
        setStatus("open");
        setDue("");
        setNotes("");
        titleRef.current?.focus({ preventScroll: true });
      }
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
      if (!title.trim()) return;
      saveMutation.mutate({
        title: title.trim(),
        status,
        due: due || null,
        parent: parentId ?? task?.parent ?? null,
        notes: notes.trim() || null,
      });
    },
    [title, status, due, notes, parentId, task, saveMutation],
  );

  const isPending = saveMutation.isPending || deleteMutation.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="py-2 space-y-2 border-b border-base-content/5"
    >
      <input
        ref={titleRef}
        type="text"
        autoComplete="off"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={parentId ? "sub-task title" : "task title"}
        className={inputCls}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        required
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={selectCls}
        >
          <option value="open">open</option>
          <option value="closed">closed</option>
        </select>
        <div className="relative">
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className={inputCls}
          />
          {!due && (
            <span className="absolute inset-0 hidden [@media(pointer:coarse)]:flex items-center px-4 text-base-content/30 pointer-events-none text-sm">
              due date
            </span>
          )}
        </div>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="notes"
        className={`${inputCls} h-16 resize-none`}
      />
      <div className="flex items-center gap-2">
        {isEdit &&
          (confirmingDelete ? (
            <ConfirmDelete
              size="xs"
              onConfirm={() => deleteMutation.mutate()}
              onCancel={() => setConfirmingDelete(false)}
              isPending={isPending}
            />
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={isPending}
              className="text-error/60 hover:text-error text-xs font-semibold transition-colors motion-reduce:transition-none"
            >
              delete
            </button>
          ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="text-base-content/50 hover:text-base-content text-xs font-semibold transition-colors motion-reduce:transition-none"
        >
          cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim() || isPending}
          className="px-3 py-1.5 bg-primary text-primary-content rounded-lg text-xs font-semibold hover:brightness-110 transition-[filter,opacity] motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <span className="loading loading-spinner loading-xs" />
          ) : isEdit ? (
            "save"
          ) : (
            "add"
          )}
        </button>
      </div>
    </form>
  );
}
