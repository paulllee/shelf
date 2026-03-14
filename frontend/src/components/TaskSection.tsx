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
  cls: string;
} | null {
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(due + "T00:00:00");
  const diffDays = Math.ceil(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return { label: due, cls: "text-error" };
  if (diffDays === 0) return { label: "today", cls: "text-warning" };
  if (diffDays === 1) return { label: "tomorrow", cls: "text-warning" };
  return { label: due, cls: "text-base-content/50" };
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
            className="text-base-content/40 hover:text-base-content shrink-0"
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

        <button
          onClick={() => onEdit(task)}
          className={`text-left text-sm truncate hover:text-primary transition-colors ${isClosed ? "line-through text-base-content/40" : "text-base-content"}`}
        >
          {task.title}
        </button>

        {dueBadge && (
          <span className={`text-xs shrink-0 flex items-center gap-1 ${dueBadge.cls}`}>
            <Calendar className="w-3 h-3" />
            {dueBadge.label}
          </span>
        )}

        <button
          onClick={() => onAddSubtask(task.id)}
          className="opacity-0 group-hover:opacity-100 text-base-content/30 hover:text-base-content/60 shrink-0 transition-opacity"
          title="Add sub-task"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
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

  // Separate tasks by status (flatten tree for counting)
  function flattenTasks(taskList: Task[]): Task[] {
    const result: Task[] = [];
    for (const t of taskList) {
      result.push(t);
      if (t.subtasks.length > 0) result.push(...flattenTasks(t.subtasks));
    }
    return result;
  }

  const allFlat = flattenTasks(tasks);
  const openTasks = tasks.filter(
    (t) => t.status === "open" || t.subtasks.some((s) => s.status === "open"),
  );
  const closedCount = allFlat.filter((t) => t.status === "closed").length;

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
            className={`p-2 rounded-lg transition-colors ${showChat ? "bg-primary/20 text-primary" : "text-base-content/50 hover:text-base-content"}`}
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
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
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
          {tasks
            .filter(
              (t) =>
                t.status === "open" ||
                t.subtasks.some((s) => s.status === "open"),
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

      {/* Closed tasks */}
      {closedCount > 0 && (
        <div>
          <button
            onClick={() => setShowClosed(!showClosed)}
            className="flex items-center gap-1.5 text-sm font-semibold text-base-content/40 hover:text-base-content/60 transition-colors"
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
                      ? "text-base-content ml-8 justify-end"
                      : "text-base-content/70 mr-8"
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
                <div className="text-sm text-base-content/50 mr-8">
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
              className="p-2 text-primary hover:text-primary/80 disabled:text-base-content/20 transition-colors"
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
