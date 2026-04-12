import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { sendChatMessage } from "../api/tasks";
import type { ChatMessage } from "../types";
import ExpandCollapse from "./ExpandCollapse";

interface ChatPanelProps {
  expanded: boolean;
  onTasksChanged: () => void;
}

export default function ChatPanel({
  expanded,
  onTasksChanged,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    const userMsg: ChatMessage = { role: "user", content: msg };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const response = await sendChatMessage(msg, messages);
      setMessages([
        ...newHistory,
        { role: "assistant", content: response.response },
      ]);
      if (response.tasks_changed) {
        onTasksChanged();
      }
    } catch {
      setMessages([
        ...newHistory,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExpandCollapse
      expanded={expanded}
      onExpanded={() => inputRef.current?.focus()}
    >
      <div className="border border-base-content/10 rounded-xl overflow-hidden">
        {messages.length > 0 && (
          <div className="max-h-64 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, i) => (
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
            {loading && (
              <div className="text-sm text-base-content/50 mr-4 sm:mr-8">
                <span className="inline-block px-3 py-1.5 bg-base-200 rounded-lg">
                  <span className="loading loading-dots loading-xs" />
                </span>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}

        <div className="flex items-end gap-2 p-2 border-t border-base-content/5">
          <textarea
            ref={inputRef}
            rows={1}
            className="flex-1 bg-transparent text-sm text-base-content px-3 py-2 focus:outline-none placeholder:text-base-content/30 resize-none overflow-hidden"
            placeholder="ask AI to manage tasks..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
                if (inputRef.current) {
                  inputRef.current.style.height = "auto";
                }
              }
            }}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-2 text-primary hover:text-primary/80 disabled:text-base-content/20 transition-colors motion-reduce:transition-none"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </ExpandCollapse>
  );
}
