interface ConfirmDeleteProps {
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
  size?: "xs" | "sm";
}

export default function ConfirmDelete({
  onConfirm,
  onCancel,
  isPending = false,
  size = "sm",
}: ConfirmDeleteProps) {
  const cls = size === "xs" ? "text-xs" : "text-sm";
  return (
    <div className={`flex items-center gap-2 animate-fade-in ${cls}`}>
      <span className="text-base-content/50">delete?</span>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isPending}
        className={`text-error font-semibold transition-colors motion-reduce:transition-none`}
      >
        yes
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-base-content/50 hover:text-base-content font-semibold transition-colors motion-reduce:transition-none"
      >
        cancel
      </button>
    </div>
  );
}
