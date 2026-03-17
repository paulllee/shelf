import type { MediaItem } from "../types";

interface MediaCardProps {
  item: MediaItem;
  onClick: () => void;
}

export default function MediaCard({ item, onClick }: MediaCardProps) {
  const showType = item.type !== "undefined";
  const showCountry = item.country !== "undefined";

  return (
    <div
      className="media-card bg-base-200 rounded-lg p-3 active:bg-base-300 cursor-pointer transition-colors motion-reduce:transition-none"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex justify-between items-start">
        <span className="font-medium min-w-0 truncate">{item.name}</span>
        {item.rating && item.rating !== "n/a" && (
          <span className="inline-grid place-items-center px-1.5 py-0.5 rounded-full text-[0.7rem] font-semibold leading-[1] tabular-nums bg-primary text-primary-content">
            {item.rating}
          </span>
        )}
      </div>
      <div className="text-sm text-base-content/60 mt-1">
        {showType && item.type}
        {showType && showCountry && " \u00B7 "}
        {showCountry && item.country}
      </div>
    </div>
  );
}
