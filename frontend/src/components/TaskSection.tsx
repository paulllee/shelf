import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronRight, ChevronDown, MessageCircle } from "lucide-react";
import { fetchTasks, updateTask } from "../api/tasks";
import type { Task } from "../types";
import ExpandCollapse from "./ExpandCollapse";
import TaskItem from "./TaskItem";
import TaskInlineForm from "./TaskInlineForm";
import ChatPanel from "./ChatPanel";

type View = "inbox" | "today" | "upcoming";

function localDateStr(d = new Date()): string {
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()]
    .map((n) => String(n).padStart(2, "0"))
    .join("-");
}

function formatGroupDate(due: string): string {
  const d = new Date(due + "T00:00:00");
  const now = new Date();
  const isThisYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(isThisYear ? {} : { year: "numeric" }),
  });
}

function dueDateSort(a: Task, b: Task): number {
  if (a.doDate && b.doDate) {
    const dueCmp = a.doDate.localeCompare(b.doDate);
    if (dueCmp !== 0) return dueCmp;
    // same do date: open before closed
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    return a.title.localeCompare(b.title);
  }
  if (a.doDate && !b.doDate) return -1;
  if (!a.doDate && b.doDate) return 1;
  return a.title.localeCompare(b.title);
}

export default function TaskSection() {
  const queryClient = useQueryClient();
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });

  const [view, setView] = useState<View>("today");
  const todayStr = localDateStr();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [hasShownAddForm, setHasShownAddForm] = useState(false);
  const [hasShownChat, setHasShownChat] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: ({ task }: { task: Task }) =>
      updateTask(task.id, {
        title: task.title,
        status: task.status === "open" ? "closed" : "open",
        doDate: task.doDate,
        parent: task.parent,
        notes: task.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  // Inbox: all open tasks (or has open subtask), sorted due ASC then title
  const openTasks = tasks
    .filter(
      (t) => t.status === "open" || t.subtasks.some((s) => s.status === "open"),
    )
    .sort((a, b) => {
      if (a.doDate && b.doDate) return a.doDate.localeCompare(b.doDate);
      if (a.doDate && !b.doDate) return -1;
      if (!a.doDate && b.doDate) return 1;
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

  // Today: all tasks (open + closed) with doDate == today
  const todayViewTasks = tasks
    .filter((t) => t.doDate !== null && t.doDate === todayStr)
    .sort(dueDateSort);

  // Upcoming: all tasks (open + closed) with doDate > today
  const upcomingViewTasks = tasks
    .filter((t) => t.doDate !== null && t.doDate > todayStr)
    .sort(dueDateSort);

  const closeEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
  };

  const taskItemProps = {
    editingId,
    onEdit: (t: Task) => {
      closeEdit();
      setEditingId(t.id);
    },
    onCloseEdit: closeEdit,
    onToggleStatus: (t: Task) => toggleMutation.mutate({ task: t }),
  };

  const views: { id: View; label: string }[] = [
    { id: "inbox", label: "inbox" },
    { id: "today", label: "today" },
    { id: "upcoming", label: "upcoming" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div
          role="tablist"
          className="flex gap-1 bg-base-200 rounded-full p-1 flex-1"
        >
          {views.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={`flex-1 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors motion-reduce:transition-none cursor-pointer ${
                view === id
                  ? "bg-primary/20 text-primary"
                  : "text-base-content/50 hover:text-base-content"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!showChat) setHasShownChat(true);
              setShowChat(!showChat);
            }}
            className={`h-9 sm:h-10 w-9 sm:w-10 rounded-full flex items-center justify-center transition-colors motion-reduce:transition-none ${showChat ? "bg-primary/15 text-primary" : "text-base-content/50 hover:text-base-content"}`}
            title="AI chat"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              closeEdit();
              if (!showAddForm) {
                setShowAddForm(true);
                setHasShownAddForm(true);
              }
            }}
            className="h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-primary border border-primary/80 text-primary-content hover:brightness-110 transition-[filter] motion-reduce:transition-none flex items-center gap-1.5 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">add task</span>
          </button>
        </div>
      </div>

      {hasShownChat && (
        <ChatPanel
          expanded={showChat}
          onTasksChanged={() =>
            queryClient.invalidateQueries({ queryKey: ["tasks"] })
          }
        />
      )}

      {hasShownAddForm && (
        <ExpandCollapse expanded={showAddForm}>
          <div className="pb-4">
            <TaskInlineForm onClose={closeEdit} isVisible={showAddForm} />
          </div>
        </ExpandCollapse>
      )}

      {view === "today" && (
        <>
          {todayViewTasks.length === 0 && !showAddForm ? (
            <p className="text-base-content/40 text-sm py-8 text-center">
              nothing to do today
            </p>
          ) : (
            <div className="space-y-0.5">
              {todayViewTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  hideDue
                  {...taskItemProps}
                />
              ))}
            </div>
          )}
        </>
      )}

      {view === "inbox" && (
        <>
          {openTasks.length === 0 && closedCount === 0 && !showAddForm ? (
            <p className="text-base-content/40 text-sm py-8 text-center">
              no tasks yet
            </p>
          ) : (
            <div className="space-y-0.5">
              {openTasks.map((task) => (
                <TaskItem key={task.id} task={task} {...taskItemProps} />
              ))}
            </div>
          )}

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
                    <TaskItem key={task.id} task={task} {...taskItemProps} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {view === "upcoming" && (
        <>
          {upcomingViewTasks.length === 0 && !showAddForm ? (
            <p className="text-base-content/40 text-sm py-8 text-center">
              nothing upcoming
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(
                upcomingViewTasks.reduce<Record<string, Task[]>>(
                  (acc, task) => {
                    const key = task.doDate!;
                    (acc[key] ??= []).push(task);
                    return acc;
                  },
                  {},
                ),
              ).map(([due, group]) => (
                <div key={due}>
                  <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wide mb-1">
                    {formatGroupDate(due)}
                  </p>
                  <div className="space-y-0.5">
                    {group.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        hideDue
                        {...taskItemProps}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
