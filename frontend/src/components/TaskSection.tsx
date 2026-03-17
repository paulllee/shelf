import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Send,
  Square,
  CheckSquare,
  Calendar,
  MessageCircle,
} from "lucide-react";
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  sendChatMessage,
} from "../api/tasks";
import type { Task, TaskFormData, ChatMessage } from "../types";
import { inputCls } from "../styles";

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

/** Inline edit form shown below a task row when editing */
function TaskInlineForm({
  task,
  parentId,
  onClose,
}: {
  task?: Task;
  parentId?: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!task;
  const [title, setTitle] = useState(task?.title ?? "");
  const [status, setStatus] = useState(task?.status ?? "open");
  const [due, setDue] = useState(task?.due ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const saveMutation = useMutation({
    mutationFn: (data: TaskFormData) =>
      isEdit ? updateTask(task!.id, data) : createTask(data),
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
      <div className="grid grid-cols-2 gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={inputCls}
        >
          <option value="open">open</option>
          <option value="closed">closed</option>
        </select>
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className={inputCls}
        />
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="notes"
        className={`${inputCls} h-16 resize-none`}
      />
      <div className="flex items-center gap-2">
        {isEdit && (
          <button
            type="button"
            onClick={() => {
              if (confirm("delete this task?")) deleteMutation.mutate();
            }}
            disabled={isPending}
            className="text-error/60 hover:text-error text-xs font-semibold transition-colors motion-reduce:transition-none"
          >
            delete
          </button>
        )}
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
          className="px-3 py-1.5 bg-warning text-warning-content rounded-lg text-xs font-semibold hover:brightness-110 transition-[filter,opacity] motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
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

interface TaskItemProps {
  task: Task;
  editingId: string | null;
  addingSubtaskFor: string | null;
  onEdit: (task: Task) => void;
  onAddSubtask: (parentId: string) => void;
  onCloseEdit: () => void;
  onToggleStatus: (task: Task) => void;
  depth?: number;
}

function TaskItem({
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
              isEditing ? onCloseEdit() : onEdit(task);
            }
          }}
          role="button"
          tabIndex={0}
          className={`text-left text-sm leading-none translate-y-px flex-1 min-w-0 truncate transition-colors motion-reduce:transition-none cursor-pointer ${isEditing ? "text-warning" : isClosed ? "line-through text-base-content/40 hover:text-warning" : "text-base-content hover:text-warning"}`}
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

      {isEditing && (
        <div className={depth > 0 ? "ml-6" : ""}>
          <TaskInlineForm task={task} onClose={onCloseEdit} />
        </div>
      )}

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

      {addingSubtaskFor === task.id && (
        <div className="ml-6">
          <TaskInlineForm parentId={task.id} onClose={onCloseEdit} />
        </div>
      )}
    </div>
  );
}

export default function TaskSection() {
  const queryClient = useQueryClient();
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const toggleMutation = useMutation({
    mutationFn: ({ task }: { task: Task }) =>
      updateTask(task.id, {
        title: task.title,
        status: task.status === "open" ? "closed" : "open",
        due: task.due,
        parent: task.parent,
        notes: task.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const openTasks = tasks
    .filter(
      (t) => t.status === "open" || t.subtasks.some((s) => s.status === "open"),
    )
    .sort((a, b) => {
      if (a.due && b.due) return a.due.localeCompare(b.due);
      if (a.due && !b.due) return -1;
      if (!a.due && b.due) return 1;
      return a.title.localeCompare(b.title);
    });
  const closedTasks = tasks
    .filter(
      (t) =>
        t.status === "closed" && !t.subtasks.some((s) => s.status === "open"),
    )
    .sort((a, b) => {
      if (a.completed_at && b.completed_at)
        return b.completed_at.localeCompare(a.completed_at);
      if (a.completed_at) return -1;
      if (b.completed_at) return 1;
      return 0;
    });
  const closedCount = closedTasks.length;

  const closeEdit = () => {
    setEditingId(null);
    setAddingSubtaskFor(null);
    setShowAddForm(false);
  };

  const handleSendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;

    const userMsg: ChatMessage = { role: "user", content: msg };
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await sendChatMessage(msg, chatMessages);
      setChatMessages([
        ...newHistory,
        { role: "assistant", content: response.response },
      ]);
      if (response.tasks_changed) {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      }
    } catch {
      setChatMessages([
        ...newHistory,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-base-content">tasks</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowChat(!showChat);
              setTimeout(() => chatInputRef.current?.focus(), 100);
            }}
            className={`p-2 rounded-lg transition-colors motion-reduce:transition-none ${showChat ? "bg-warning/20 text-warning" : "text-base-content/50 hover:text-base-content"}`}
            title="AI chat"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              closeEdit();
              setShowAddForm(true);
            }}
            className="flex items-center gap-1.5 text-sm font-semibold text-warning hover:text-warning/80 transition-colors motion-reduce:transition-none"
          >
            <Plus className="w-4 h-4" />
            add task
          </button>
        </div>
      </div>

      {/* Inline add form */}
      {showAddForm && (
        <TaskInlineForm onClose={closeEdit} />
      )}

      {/* Open tasks */}
      {openTasks.length === 0 && closedCount === 0 && !showAddForm ? (
        <p className="text-base-content/40 text-sm py-8 text-center">
          no tasks yet
        </p>
      ) : (
        <div className="space-y-0.5">
          {openTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              editingId={editingId}
              addingSubtaskFor={addingSubtaskFor}
              onEdit={(t) => {
                closeEdit();
                setEditingId(t.id);
              }}
              onAddSubtask={(parentId) => {
                closeEdit();
                setAddingSubtaskFor(parentId);
              }}
              onCloseEdit={closeEdit}
              onToggleStatus={(t) => toggleMutation.mutate({ task: t })}
            />
          ))}
        </div>
      )}

      {/* Closed tasks */}
      {closedCount > 0 && (
        <div>
          <button
            onClick={() => setShowClosed(!showClosed)}
            className="flex items-center gap-1.5 text-sm font-semibold text-base-content/40 hover:text-base-content/60 transition-colors motion-reduce:transition-none"
          >
            {showClosed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            closed ({closedCount})
          </button>
          {showClosed && (
            <div className="mt-1 space-y-0.5">
              {closedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  editingId={editingId}
                  addingSubtaskFor={addingSubtaskFor}
                  onEdit={(t) => {
                    closeEdit();
                    setEditingId(t.id);
                  }}
                  onAddSubtask={(parentId) => {
                    closeEdit();
                    setAddingSubtaskFor(parentId);
                  }}
                  onCloseEdit={closeEdit}
                  onToggleStatus={(t) => toggleMutation.mutate({ task: t })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat panel */}
      {showChat && (
        <div className="border border-warning/20 rounded-xl overflow-hidden">
          {chatMessages.length > 0 && (
            <div className="max-h-64 overflow-y-auto p-3 space-y-2">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-sm flex ${
                    msg.role === "user"
                      ? "text-base-content ml-4 sm:ml-8 justify-end"
                      : "text-base-content/70 mr-4 sm:mr-8"
                  }`}
                >
                  <span
                    className={`inline-block px-3 py-1.5 rounded-lg ${
                      msg.role === "user" ? "bg-warning/10" : "bg-base-200"
                    }`}
                  >
                    {msg.content}
                  </span>
                </div>
              ))}
              {chatLoading && (
                <div className="text-sm text-base-content/50 mr-4 sm:mr-8">
                  <span className="inline-block px-3 py-1.5 bg-base-200 rounded-lg">
                    <span className="loading loading-dots loading-xs" />
                  </span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          <div className="flex items-center gap-2 p-2 border-t border-warning/10">
            <input
              ref={chatInputRef}
              type="text"
              className="flex-1 bg-transparent text-sm text-base-content px-3 py-2 focus:outline-none placeholder:text-base-content/30"
              placeholder="ask AI to manage tasks..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
              disabled={chatLoading}
            />
            <button
              onClick={handleSendChat}
              disabled={!chatInput.trim() || chatLoading}
              className="p-2 text-warning hover:text-warning/80 disabled:text-base-content/20 transition-colors motion-reduce:transition-none"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
