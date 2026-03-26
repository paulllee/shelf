import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createActivity } from "../api/habits";
import ExpandCollapse from "./ExpandCollapse";

interface ActivityInputProps {
  expanded: boolean;
  presets: string[];
  todayStr: string;
  onClose: () => void;
}

export default function ActivityInput({
  expanded,
  presets,
  todayStr,
  onClose,
}: ActivityInputProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setName("");
      onClose();
    },
  });

  const submit = (activityName: string) => {
    const trimmed = activityName.trim();
    if (!trimmed || mutation.isPending) return;
    mutation.mutate({ name: trimmed, date: todayStr });
  };

  return (
    <ExpandCollapse
      expanded={expanded}
      onExpanded={() => inputRef.current?.focus({ preventScroll: true })}
    >
      <form
        className="mb-4 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(name);
        }}
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="activity name"
            className="flex-1 bg-base-200 text-base-content px-3 py-2 rounded-lg border border-primary/20 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors motion-reduce:transition-none placeholder:text-base-content/30 text-sm"
          />
          <button
            type="submit"
            disabled={!name.trim() || mutation.isPending}
            className="px-3 py-2 bg-primary text-primary-content rounded-lg text-sm font-semibold hover:brightness-110 transition-[filter,opacity] motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              "add"
            )}
          </button>
        </div>
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => submit(preset)}
                disabled={mutation.isPending}
                className="px-2.5 py-1 bg-base-200 text-base-content text-xs rounded-full border border-primary/20 hover:border-primary hover:bg-primary/10 transition-colors motion-reduce:transition-none"
              >
                {preset}
              </button>
            ))}
          </div>
        )}
        {mutation.isError && (
          <p className="text-error text-xs">{mutation.error.message}</p>
        )}
      </form>
    </ExpandCollapse>
  );
}
