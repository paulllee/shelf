import { useState } from "react";
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Square,
  CheckSquare,
  Calendar,
} from "lucide-react";
import type { Task } from "../types";
import ExpandCollapse from "./ExpandCollapse";
import TaskInlineForm from "./TaskInlineForm";

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
        className={`group flex items-center gap-2 py-1.5 ${depth > 0 ? "ml-6" : ""}`}
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
          onClick={() => onToggleStatus(task)}
          className={`shrink-0 ${isClosed ? "text-success" : "text-base-content/30 hover:text-base-content/60"}`}
        >
          {isClosed ? (
            <CheckSquare className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4" />
          )}
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
            onClick={() => onAddSubtask(task.id)}
            className="text-base-content/30 hover:text-base-content/60 shrink-0 transition-colors motion-reduce:transition-none"
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
