import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { fetchMedia } from "../api/media";
import type { MediaItem } from "../types";
import MediaTable from "./MediaTable";
import MediaCard from "./MediaCard";
import MediaModal from "./MediaModal";

const STATUSES = ["queued", "watching", "watched"] as const;

export default function MediaSection() {
  const [tab, setTab] = useLocalStorage("shelf-media-tab", "queued");
  const [typeFilter, setTypeFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [editItem, setEditItem] = useState<MediaItem | null>(null);

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

  return (
    <>
      <div role="tablist" className="tabs tabs-boxed mb-6">
        {STATUSES.map((s) => (
          <a
            key={s}
            role="tab"
            className={`tab ${tab === s ? "tab-active" : ""}`}
            onClick={() => {
              setTab(s);
              setTypeFilter("");
              setCountryFilter("");
            }}
          >
            {s}
          </a>
        ))}
      </div>

      {isLoading ? (
        <span className="loading loading-spinner loading-lg" />
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-base-content/60 bg-base-100 rounded-lg">
          <p>no media items in this list</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 mb-4">
            <div className="form-control">
              <select
                className="select select-bordered select-sm w-full sm:w-auto"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">all types</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <select
                className="select select-bordered select-sm w-full sm:w-auto"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
              >
                <option value="">all countries</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* mobile card view */}
          <div className="space-y-2 md:hidden">
            {filtered.map((item) => (
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
