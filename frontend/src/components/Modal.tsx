import { useEffect, useCallback, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}

export default function Modal({
  children,
  onClose,
  maxWidth = "max-w-lg",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
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
    // Focus the first focusable element in the dialog
    const timer = requestAnimationFrame(() => {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable?.length) focusable[0].focus();
    });
    return () => {
      document.body.style.overflow = "";
      cancelAnimationFrame(timer);
      previousFocusRef.current?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      ref={dialogRef}
    >
      <div
        className={`bg-base-300 rounded-xl w-full ${maxWidth} max-h-[85vh] sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-[0px_4px_12px_0px_rgba(0,0,0,0.3)] relative p-6 animate-modal-panel`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-base-content/50 hover:text-base-content transition-colors motion-reduce:transition-none"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
        {children}
      </div>
    </div>
  );
}
