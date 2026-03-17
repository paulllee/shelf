import { useEffect, useCallback, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface SlideOverProps {
  children: ReactNode;
  onClose: () => void;
  title?: string;
}

export default function SlideOver({
  children,
  onClose,
  title,
}: SlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Trigger open animation on next frame
    requestAnimationFrame(() => {
      openRef.current = true;
      panelRef.current?.classList.remove("translate-x-full");
      panelRef.current?.classList.add("translate-x-0");
    });

    const focusTimer = requestAnimationFrame(() => {
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable?.length) focusable[0].focus();
    });

    return () => {
      document.body.style.overflow = "";
      cancelAnimationFrame(focusTimer);
      previousFocusRef.current?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 animate-modal-backdrop" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full sm:max-w-md h-full bg-base-300 shadow-[-4px_0_12px_rgba(0,0,0,0.2)] overflow-y-auto overscroll-contain translate-x-full transition-transform duration-200 ease-out motion-reduce:transition-none motion-reduce:translate-x-0"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-base-300 flex items-center justify-between px-6 py-4 border-b border-base-content/10">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          {!title && <div />}
          <button
            className="text-base-content/50 hover:text-base-content transition-colors motion-reduce:transition-none"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
