import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { fetchMedia } from "../api/media";
import type { MediaItem } from "../types";
import { selectCls, btnGhostSm } from "../styles";
import MediaTable from "./MediaTable";
import MediaCard from "./MediaCard";
import MediaModal from "./MediaModal";

type SortKey = "name" | "type" | "country" | "rating";
type SortDir = "asc" | "desc";

const STATUSES = ["queued", "watching", "watched"] as const;

export default function MediaSection() {
  const [tab, setTab] = useLocalStorage("shelf-media-tab", "queued");
  const [typeFilter, setTypeFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [editItem, setEditItem] = useState<MediaItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mobileSortKey, setMobileSortKey] = useState<SortKey>("name");
  const [mobileSortDir, setMobileSortDir] = useState<SortDir>("asc");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["media", tab],
    queryFn: () => fetchMedia(tab),
  });

  const types = useMemo(
    () =>
      [...new Set(items.map((i) => i.type))]
        .filter((t) => t !== "undefined")
        .sort(),
    [items],
  );

  const countries = useMemo(
    () =>
      [...new Set(items.map((i) => i.country))]
        .filter((c) => c !== "undefined")
        .sort(),
    [items],
  );

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (!typeFilter || item.type === typeFilter) &&
          (!countryFilter || item.country === countryFilter),
      ),
    [items, typeFilter, countryFilter],
  );

  const mobileSorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (mobileSortKey === "rating") {
        const aVal = a.rating === "n/a" ? -1 : parseFloat(a.rating) || 0;
        const bVal = b.rating === "n/a" ? -1 : parseFloat(b.rating) || 0;
        return mobileSortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(a[mobileSortKey]).localeCompare(String(b[mobileSortKey]));
      return mobileSortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, mobileSortKey, mobileSortDir]);

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div
          role="tablist"
          className="flex gap-1 flex-1 bg-base-200 rounded-full p-1"
        >
          {STATUSES.map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={tab === s}
              className={`flex-1 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors motion-reduce:transition-none cursor-pointer ${tab === s ? "bg-primary/20 text-primary" : "text-base-content/50 hover:text-base-content"}`}
              onClick={() => {
                setTab(s);
                setTypeFilter("");
                setCountryFilter("");
                setMobileSortKey("name");
                setMobileSortDir("asc");
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-primary border border-primary/80 text-primary-content hover:brightness-110 transition-[filter] motion-reduce:transition-none flex items-center gap-1.5 text-sm font-semibold flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">add media</span>
        </button>
      </div>

      {showAddModal && <MediaModal onClose={() => setShowAddModal(false)} />}

      {isLoading ? (
        <span
          className="loading loading-spinner loading-lg"
          role="status"
          aria-label="Loading"
        />
      ) : items.length === 0 ? (
        <p className="text-center py-12 text-base-content/40 text-sm">
          no media yet
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 mb-4">
            <select
              className={`${selectCls} sm:w-auto`}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by type"
            >
              <option value="">all types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              className={`${selectCls} sm:w-auto`}
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              aria-label="Filter by country"
            >
              <option value="">all countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* mobile sort controls */}
          <div className="flex gap-2 md:hidden mb-4">
            <select
              className={`${selectCls} flex-1`}
              value={mobileSortKey}
              onChange={(e) => setMobileSortKey(e.target.value as SortKey)}
              aria-label="Sort by"
            >
              <option value="name">name</option>
              <option value="type">type</option>
              <option value="country">country</option>
              <option value="rating">rating</option>
            </select>
            <button
              className={btnGhostSm}
              onClick={() => setMobileSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              aria-label={mobileSortDir === "asc" ? "Sort descending" : "Sort ascending"}
            >
              {mobileSortDir === "asc" ? "▲" : "▼"}
            </button>
          </div>

          {/* mobile card view */}
          <div className="space-y-2 md:hidden">
            {mobileSorted.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onClick={() => setEditItem(item)}
              />
            ))}
          </div>

          {/* desktop table view */}
          <div className="hidden md:block overflow-auto max-h-[70vh] rounded-lg">
            <MediaTable items={filtered} onEdit={setEditItem} />
          </div>
        </>
      )}

      {editItem && (
        <MediaModal item={editItem} onClose={() => setEditItem(null)} />
      )}
    </>
  );
}
