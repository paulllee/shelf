import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTask, updateTask, deleteTask } from "../api/tasks";
import type { Task, TaskFormData } from "../types";
import { inputCls, selectCls } from "../styles";
import ConfirmDelete from "./ConfirmDelete";
import { Plus } from "lucide-react";

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
  const [doDate, setDoDate] = useState(task?.doDate ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showSubForm, setShowSubForm] = useState(false);
  const [subTitle, setSubTitle] = useState("");
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const subTitleRef = useRef<HTMLInputElement>(null);

  function resizeTextarea(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  // useLayoutEffect runs children-before-parents, so this fires before
  // ExpandCollapse measures the container — textareas are already the right
  // height when ExpandCollapse locks in its animation target.
  useLayoutEffect(() => {
    if (!isVisible) return;
    resizeTextarea(titleRef.current);
    resizeTextarea(notesRef.current);
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) {
      titleRef.current?.focus({ preventScroll: true });
    }
  }, [isVisible]);

  useEffect(() => {
    if (showSubForm) {
      subTitleRef.current?.focus({ preventScroll: true });
    }
  }, [showSubForm]);

  const saveMutation = useMutation({
    mutationFn: (data: TaskFormData) =>
      isEdit ? updateTask(task!.id, data) : createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (!isEdit) {
        setTitle("");
        setStatus("open");
        setDoDate("");
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

  const addSubtaskMutation = useMutation({
    mutationFn: (subTaskTitle: string) =>
      createTask({
        title: subTaskTitle,
        status: "open",
        doDate: null,
        parent: task!.id,
        notes: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setSubTitle("");
      setShowSubForm(false);
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) return;
      saveMutation.mutate({
        title: title.trim(),
        status,
        doDate: doDate || null,
        parent: parentId ?? task?.parent ?? null,
        notes: notes.trim() || null,
      });
    },
    [title, status, doDate, notes, parentId, task, saveMutation],
  );

  const handleAddSubtask = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!subTitle.trim()) return;
      addSubtaskMutation.mutate(subTitle.trim());
    },
    [subTitle, addSubtaskMutation],
  );

  const isPending = saveMutation.isPending || deleteMutation.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="py-2 space-y-2 border-b border-base-content/5"
    >
      <textarea
        ref={titleRef}
        autoComplete="off"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          resizeTextarea(e.target);
        }}
        placeholder={parentId ? "sub-task title" : "task title"}
        rows={1}
        className={`${inputCls} resize-none overflow-hidden`}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Enter") {
            e.preventDefault();
            if (title.trim()) handleSubmit(e as unknown as React.FormEvent);
          }
        }}
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
            value={doDate}
            onChange={(e) => setDoDate(e.target.value)}
            className={inputCls}
          />
          {!doDate && (
            <span className="absolute inset-0 hidden [@media(pointer:coarse)]:flex items-center px-4 text-base-content/30 pointer-events-none text-sm">
              do date
            </span>
          )}
        </div>
      </div>
      <textarea
        ref={notesRef}
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          resizeTextarea(e.target);
        }}
        placeholder="notes"
        rows={1}
        className={`${inputCls} resize-none overflow-hidden`}
      />

      {isEdit && !task?.parent && (
        <div className="space-y-1.5">
          {showSubForm ? (
            <div className="flex gap-2">
              <input
                ref={subTitleRef}
                type="text"
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
                placeholder="sub-task title"
                className={inputCls}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setShowSubForm(false);
                    setSubTitle("");
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (subTitle.trim())
                      addSubtaskMutation.mutate(subTitle.trim());
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                disabled={!subTitle.trim() || addSubtaskMutation.isPending}
                className="px-3 py-1.5 bg-primary text-primary-content rounded-lg text-xs font-semibold hover:brightness-110 transition-[filter,opacity] motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {addSubtaskMutation.isPending ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  "add"
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubForm(false);
                  setSubTitle("");
                }}
                className="text-base-content/50 hover:text-base-content text-xs font-semibold transition-colors motion-reduce:transition-none shrink-0"
              >
                cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSubForm(true)}
              className="flex items-center gap-1.5 text-xs text-base-content/50 hover:text-base-content transition-colors motion-reduce:transition-none"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Sub-task
            </button>
          )}
        </div>
      )}

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
