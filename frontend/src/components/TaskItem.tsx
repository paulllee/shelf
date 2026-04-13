import { useState } from "react";
import { ChevronRight, ChevronDown, Check, Calendar } from "lucide-react";
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
  onEdit: (task: Task) => void;
  onCloseEdit: () => void;
  onToggleStatus: (task: Task) => void;
  depth?: number;
  hideDue?: boolean;
}

export default function TaskItem({
  task,
  editingId,
  onEdit,
  onCloseEdit,
  onToggleStatus,
  depth = 0,
  hideDue = false,
}: TaskItemProps) {
  const [expanded, setExpanded] = useState(true);
  const hasSubtasks = task.subtasks.length > 0;
  const dueBadge = getDueBadge(task.doDate);
  const isClosed = task.status === "closed";
  const isEditing = editingId === task.id;

  return (
    <div>
      <div
        className={`group flex items-center gap-2 py-2 ${depth > 0 ? "ml-6" : ""}`}
      >
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
            backgroundColor: isClosed
              ? "oklch(var(--bc) / 0.8)"
              : "transparent",
          }}
        >
          {isClosed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
        </button>

        {/* title + notes + due date column */}
        <div
          onClick={() => (isEditing ? onCloseEdit() : onEdit(task))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (isEditing) onCloseEdit();
              else onEdit(task);
            }
          }}
          role="button"
          tabIndex={0}
          className="flex-1 min-w-0 cursor-pointer"
        >
          <span
            className={`text-sm leading-snug block transition-colors motion-reduce:transition-none ${isEditing ? "text-primary" : isClosed ? "line-through text-base-content/40 hover:text-primary" : "text-base-content hover:text-primary"}`}
          >
            {task.title}
          </span>

          {task.notes && !isEditing && (
            <span className="block text-xs text-base-content/40 truncate mt-0.5">
              {task.notes.split("\n")[0]}
            </span>
          )}

          {!isEditing && isClosed && task.completed_at && (
            <span className="block text-xs text-base-content/30 mt-0.5">
              {formatCompletedAt(task.completed_at)}
            </span>
          )}

          {!isEditing && !isClosed && !hideDue && dueBadge && (
            <span
              className={`flex items-center gap-1 text-xs mt-0.5 ${
                dueBadge.color === "error"
                  ? "text-error"
                  : dueBadge.color === "warning"
                    ? "text-warning"
                    : dueBadge.color === "info"
                      ? "text-info"
                      : "text-base-content/50"
              }`}
            >
              <Calendar size={11} className="shrink-0" />
              <span className="leading-none translate-y-[1.5px]">
                {dueBadge.label}
              </span>
            </span>
          )}
        </div>

        {/* chevron on the right — only when there are subtasks */}
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
      </div>

      <ExpandCollapse expanded={isEditing} className={depth > 0 ? "ml-6" : ""}>
        <TaskInlineForm
          task={task}
          onClose={onCloseEdit}
          isVisible={isEditing}
        />
      </ExpandCollapse>

      {hasSubtasks && expanded && (
        <div>
          {task.subtasks.map((sub) => (
            <TaskItem
              key={sub.id}
              task={sub}
              editingId={editingId}
              onEdit={onEdit}
              onCloseEdit={onCloseEdit}
              onToggleStatus={onToggleStatus}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
