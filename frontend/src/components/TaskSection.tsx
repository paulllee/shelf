import { useState, useRef, useEffect } from "react";
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
import { fetchTasks, updateTask, sendChatMessage } from "../api/tasks";
import type { Task, ChatMessage } from "../types";
import TaskModal from "./TaskModal";

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
  if (diffDays < 0) return { label: due, color: "error" };
  if (diffDays === 0) return { label: "today", color: "warning" };
  if (diffDays === 1) return { label: "tomorrow", color: "info" };
  return { label: due, color: "muted" };
}

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onAddSubtask: (parentId: string) => void;
  onToggleStatus: (task: Task) => void;
  depth?: number;
}

function TaskItem({
  task,
  onEdit,
  onAddSubtask,
  onToggleStatus,
  depth = 0,
}: TaskItemProps) {
  const [expanded, setExpanded] = useState(true);
  const hasSubtasks = task.subtasks.length > 0;
  const dueBadge = getDueBadge(task.due);
  const isClosed = task.status === "closed";

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
          onClick={() => onEdit(task)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onEdit(task);
            }
          }}
          role="button"
          tabIndex={0}
          className={`text-left text-sm leading-none translate-y-px truncate hover:text-primary transition-colors motion-reduce:transition-none cursor-pointer ${isClosed ? "line-through text-base-content/40" : "text-base-content"}`}
        >
          {task.title}
        </span>

        {dueBadge && (
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

        {depth === 0 && (
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

      {hasSubtasks && expanded && (
        <div>
          {task.subtasks.map((sub) => (
            <TaskItem
              key={sub.id}
              task={sub}
              onEdit={onEdit}
              onAddSubtask={onAddSubtask}
              onToggleStatus={onToggleStatus}
              depth={depth + 1}
            />
          ))}
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

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addSubtaskParent, setAddSubtaskParent] = useState<string | null>(null);
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
      // Both have due dates: earlier dates first
      if (a.due && b.due) return a.due.localeCompare(b.due);
      // Due date beats no due date
      if (a.due && !b.due) return -1;
      if (!a.due && b.due) return 1;
      // Neither has due date: alphabetical
      return a.title.localeCompare(b.title);
    });
  const closedTasks = tasks.filter(
    (t) =>
      t.status === "closed" && !t.subtasks.some((s) => s.status === "open"),
  );
  const closedCount = closedTasks.length;

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
            className={`p-2 rounded-lg transition-colors motion-reduce:transition-none ${showChat ? "bg-primary/20 text-primary" : "text-base-content/50 hover:text-base-content"}`}
            title="AI chat"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setEditingTask(null);
              setAddSubtaskParent(null);
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors motion-reduce:transition-none"
          >
            <Plus className="w-4 h-4" />
            add task
          </button>
        </div>
      </div>

      {/* Open tasks */}
      {openTasks.length === 0 && closedCount === 0 ? (
        <p className="text-base-content/40 text-sm py-8 text-center">
          no tasks yet
        </p>
      ) : (
        <div className="space-y-0.5">
          {openTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onEdit={(t) => {
                setEditingTask(t);
                setAddSubtaskParent(null);
                setShowModal(true);
              }}
              onAddSubtask={(parentId) => {
                setEditingTask(null);
                setAddSubtaskParent(parentId);
                setShowModal(true);
              }}
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
              {tasks
                .filter(
                  (t) =>
                    t.status === "closed" &&
                    !t.subtasks.some((s) => s.status === "open"),
                )
                .map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setAddSubtaskParent(null);
                      setShowModal(true);
                    }}
                    onAddSubtask={(parentId) => {
                      setEditingTask(null);
                      setAddSubtaskParent(parentId);
                      setShowModal(true);
                    }}
                    onToggleStatus={(t) => toggleMutation.mutate({ task: t })}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {/* Chat panel */}
      {showChat && (
        <div className="border border-primary/20 rounded-xl overflow-hidden">
          {/* Chat messages */}
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
                      msg.role === "user" ? "bg-primary/10" : "bg-base-200"
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

          {/* Chat input */}
          <div className="flex items-center gap-2 p-2 border-t border-primary/10">
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
              className="p-2 text-primary hover:text-primary/80 disabled:text-base-content/20 transition-colors motion-reduce:transition-none"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <TaskModal
          task={editingTask}
          parentId={addSubtaskParent}
          onClose={() => {
            setShowModal(false);
            setEditingTask(null);
            setAddSubtaskParent(null);
          }}
        />
      )}
    </div>
  );
}
