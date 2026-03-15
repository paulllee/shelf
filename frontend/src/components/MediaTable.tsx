import { useState, useMemo } from "react";
import type { MediaItem } from "../types";

interface MediaTableProps {
  items: MediaItem[];
  onEdit: (item: MediaItem) => void;
}

type SortKey = "name" | "type" | "country" | "rating";
type SortDir = "asc" | "desc";

export default function MediaTable({ items, onEdit }: MediaTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sorted = useMemo(() => {
    if (!sortKey) return items;
    return [...items].sort((a, b) => {
      let aVal: string | number = a[sortKey];
      let bVal: string | number = b[sortKey];

      if (sortKey === "rating") {
        aVal = aVal === "n/a" ? -1 : parseFloat(aVal as string) || 0;
        bVal = bVal === "n/a" ? -1 : parseFloat(bVal as string) || 0;
        return sortDir === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }

      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const indicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " \u25B2" : " \u25BC";
  };

  return (
    <table className="table table-zebra w-full bg-base-100">
      <thead className="sticky top-0 bg-base-100 z-10">
        <tr className="border-b-2 border-base-300">
          <th className="text-left">
            <button
              className="w-full text-left cursor-pointer select-none hover:bg-base-200 px-0 py-0 bg-transparent border-none font-inherit"
              onClick={() => handleSort("name")}
            >
              title
              <span className="sort-indicator text-xs opacity-50">
                {indicator("name")}
              </span>
            </button>
          </th>
          <th className="text-left w-24">
            <button
              className="w-full text-left cursor-pointer select-none hover:bg-base-200 px-0 py-0 bg-transparent border-none font-inherit"
              onClick={() => handleSort("type")}
            >
              type
              <span className="sort-indicator text-xs opacity-50">
                {indicator("type")}
              </span>
            </button>
          </th>
          <th className="text-left w-24">
            <button
              className="w-full text-left cursor-pointer select-none hover:bg-base-200 px-0 py-0 bg-transparent border-none font-inherit"
              onClick={() => handleSort("country")}
            >
              country
              <span className="sort-indicator text-xs opacity-50">
                {indicator("country")}
              </span>
            </button>
          </th>
          <th className="text-left w-20">
            <button
              className="w-full text-left cursor-pointer select-none hover:bg-base-200 px-0 py-0 bg-transparent border-none font-inherit"
              onClick={() => handleSort("rating")}
            >
              rating
              <span className="sort-indicator text-xs opacity-50">
                {indicator("rating")}
              </span>
            </button>
          </th>
          <th className="w-16" />
        </tr>
      </thead>
      <tbody>
        {sorted.map((item) => (
          <tr
            key={item.id}
            className="hover:bg-base-200 cursor-pointer"
            onClick={() => onEdit(item)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEdit(item);
              }
            }}
            tabIndex={0}
          >
            <td className="font-medium max-w-xs">
              <span className="block truncate">{item.name}</span>
            </td>
            <td>{item.type !== "undefined" ? item.type : "-"}</td>
            <td>{item.country !== "undefined" ? item.country : "-"}</td>
            <td className="tabular-nums">
              {item.rating && item.rating !== "n/a" ? item.rating : "-"}
            </td>
            <td className="text-right">
              <span className="text-base-content/40 text-sm">edit</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
