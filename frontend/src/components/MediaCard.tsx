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
      className="media-card bg-base-200 rounded-lg p-3 active:bg-base-300 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <span className="font-medium">{item.name}</span>
        {item.rating && item.rating !== "n/a" && (
          <span className="badge badge-primary badge-sm">{item.rating}</span>
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
