import { useEffect, useCallback, type ReactNode } from "react";

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
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="modal modal-open">
      <div
        className={`modal-box w-[calc(100%-1rem)] sm:w-auto ${maxWidth} max-h-[85vh] sm:max-h-[90vh]`}
      >
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          X
        </button>
        {children}
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
