import { useState } from "react";
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Check,
  Calendar,
} from "lucide-react";
import type { Task } from "../types";
import ExpandCollapse from "./ExpandCollapse";
import TaskInlineForm from "./TaskInlineForm";

type ConfettiFunc = (options?: Record<string, unknown>) => Promise<null> | null;
let confettiPromise: Promise<ConfettiFunc> | null = null;
function getConfetti(): Promise<ConfettiFunc> {
  if (!confettiPromise) {
    confettiPromise = import("canvas-confetti").then(
      (m) => m.default as unknown as ConfettiFunc,
    );
  }
  return confettiPromise;
}

function formatDueDate(due: string): string {
  const d = new Date(due + "T00:00:00");
  const now = new Date();
  const isThisYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(isThisYear ? {} : { year: "numeric" }),
  });
}

function getDueBadge(due: string | null): {
  label: string;
  color: string;
} | null {
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(due + "T00:00:00");
  const diffDays = Math.ceil(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return { label: formatDueDate(due), color: "error" };
  if (diffDays === 0) return { label: "today", color: "warning" };
  if (diffDays === 1) return { label: "tomorrow", color: "info" };
  return { label: formatDueDate(due), color: "muted" };
}

function formatCompletedAt(completedAt: string): string {
  const d = new Date(completedAt);
  const now = new Date();
  const isThisYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(isThisYear ? {} : { year: "numeric" }),
  });
}

export interface TaskItemProps {
  task: Task;
  editingId: string | null;
  addingSubtaskFor: string | null;
  onEdit: (task: Task) => void;
  onAddSubtask: (parentId: string) => void;
  onCloseEdit: () => void;
  onToggleStatus: (task: Task) => void;
  depth?: number;
}

export default function TaskItem({
  task,
  editingId,
  addingSubtaskFor,
  onEdit,
  onAddSubtask,
  onCloseEdit,
  onToggleStatus,
  depth = 0,
}: TaskItemProps) {
  const [expanded, setExpanded] = useState(true);
  const hasSubtasks = task.subtasks.length > 0;
  const dueBadge = getDueBadge(task.due);
  const isClosed = task.status === "closed";
  const isEditing = editingId === task.id;

  return (
    <div>
      <div
        className={`group flex items-center gap-2 py-2 ${depth > 0 ? "ml-6" : ""}`}
      >
        {hasSubtasks ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-base-content/40 hover:text-base-content shrink-0 transition-colors motion-reduce:transition-none"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <button
          onClick={(e) => {
            if (!isClosed) {
              const rect = e.currentTarget.getBoundingClientRect();
              getConfetti().then((confetti) =>
                confetti({
                  origin: {
                    x: (rect.left + rect.width / 2) / window.innerWidth,
                    y: (rect.top + rect.height / 2) / window.innerHeight,
                  },
                  spread: 70,
                  startVelocity: 25,
                  particleCount: 40,
                  scalar: 0.8,
                  colors: ["#e2e8f0", "#ffffff", "#94a3b8"],
                }),
              );
            }
            onToggleStatus(task);
          }}
          className={`flex-shrink-0 w-8 h-8 rounded-full border-2 transition-colors motion-reduce:transition-none flex items-center justify-center${isClosed ? " animate-check-pulse" : ""}`}
          style={{
            borderColor: isClosed
              ? "oklch(var(--bc) / 0.8)"
              : "oklch(var(--bc) / 0.25)",
            backgroundColor: isClosed ? "oklch(var(--bc) / 0.8)" : "transparent",
          }}
        >
          {isClosed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
        </button>

        <span
          onClick={() => (isEditing ? onCloseEdit() : onEdit(task))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (isEditing) onCloseEdit(); else onEdit(task);
            }
          }}
          role="button"
          tabIndex={0}
          className={`text-left text-sm leading-none translate-y-px flex-1 min-w-0 truncate transition-colors motion-reduce:transition-none cursor-pointer ${isEditing ? "text-primary" : isClosed ? "line-through text-base-content/40 hover:text-primary" : "text-base-content hover:text-primary"}`}
        >
          {task.title}
        </span>

        {!isEditing && isClosed && task.completed_at && (
          <span className="text-xs text-base-content/30 shrink-0 whitespace-nowrap translate-y-px">
            {formatCompletedAt(task.completed_at)}
          </span>
        )}

        {!isEditing && !isClosed && dueBadge && (
          <span
            className={`flex items-center text-xs shrink-0 whitespace-nowrap ${
              dueBadge.color === "error"
                ? "text-error"
                : dueBadge.color === "warning"
                  ? "text-warning"
                  : dueBadge.color === "info"
                    ? "text-info"
                    : "text-base-content/50"
            }`}
          >
            <Calendar size={12} className="mr-1" />
            <span className="translate-y-px">{dueBadge.label}</span>
          </span>
        )}

        {depth === 0 && !isEditing && (
          <button
            onClick={() => addingSubtaskFor === task.id ? onCloseEdit() : onAddSubtask(task.id)}
            className="p-1.5 text-base-content/30 hover:text-base-content/60 shrink-0 transition-colors motion-reduce:transition-none"
            title="Add sub-task"
            aria-label="Add sub-task"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <ExpandCollapse expanded={isEditing} className={depth > 0 ? "ml-6" : ""}>
        <TaskInlineForm task={task} onClose={onCloseEdit} isVisible={isEditing} />
      </ExpandCollapse>

      {hasSubtasks && expanded && (
        <div>
          {task.subtasks.map((sub) => (
            <TaskItem
              key={sub.id}
              task={sub}
              editingId={editingId}
              addingSubtaskFor={addingSubtaskFor}
              onEdit={onEdit}
              onAddSubtask={onAddSubtask}
              onCloseEdit={onCloseEdit}
              onToggleStatus={onToggleStatus}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      <ExpandCollapse expanded={addingSubtaskFor === task.id} className="ml-6">
        <TaskInlineForm
          parentId={task.id}
          onClose={onCloseEdit}
          isVisible={addingSubtaskFor === task.id}
        />
      </ExpandCollapse>
    </div>
  );
}
