import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronRight, ChevronDown, MessageCircle } from "lucide-react";
import { fetchTasks, updateTask } from "../api/tasks";
import type { Task } from "../types";
import ExpandCollapse from "./ExpandCollapse";
import TaskItem from "./TaskItem";
import TaskInlineForm from "./TaskInlineForm";
import ChatPanel from "./ChatPanel";

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
  const [showChat, setShowChat] = useState(false);
  const [hasShownAddForm, setHasShownAddForm] = useState(false);
  const [hasShownChat, setHasShownChat] = useState(false);

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

  const taskItemProps = {
    editingId,
    addingSubtaskFor,
    onEdit: (t: Task) => {
      closeEdit();
      setEditingId(t.id);
    },
    onAddSubtask: (parentId: string) => {
      closeEdit();
      setAddingSubtaskFor(parentId);
    },
    onCloseEdit: closeEdit,
    onToggleStatus: (t: Task) => toggleMutation.mutate({ task: t }),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">tasks</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!showChat) setHasShownChat(true);
              setShowChat(!showChat);
            }}
            className={`p-2 rounded-lg transition-colors motion-reduce:transition-none ${showChat ? "bg-primary/15 text-primary" : "text-base-content/50 hover:text-base-content"}`}
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
          <div className="pb-2">
            <TaskInlineForm onClose={closeEdit} isVisible={showAddForm} />
          </div>
        </ExpandCollapse>
      )}

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
    </div>
  );
}
