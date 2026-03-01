import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "./Modal";
import { fetchEnums } from "../api/enums";
import {
  createMedia,
  updateMedia,
  deleteMedia,
  checkMediaName,
} from "../api/media";
import { ApiError } from "../api/client";
import type { MediaItem, MediaFormData } from "../types";

const inputCls =
  "w-full bg-base-200 text-base-content px-4 py-3 rounded-lg border border-primary/20 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors motion-reduce:transition-none placeholder:text-base-content/30";

interface MediaModalProps {
  item?: MediaItem | null;
  onClose: () => void;
}

export default function MediaModal({ item, onClose }: MediaModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!item;

  const { data: enums } = useQuery({
    queryKey: ["enums"],
    queryFn: fetchEnums,
    staleTime: Infinity,
  });

  const [name, setName] = useState(item?.name ?? "");
  const [country, setCountry] = useState(item?.country ?? "");
  const [type, setType] = useState(item?.type ?? "");
  const [status, setStatus] = useState(item?.status ?? "queued");
  const [rating, setRating] = useState(
    item?.rating && item.rating !== "n/a" ? item.rating : "",
  );
  const [review, setReview] = useState(item?.review ?? "");
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (!enums) return;
    if (!item) {
      if (!country && enums.countries.length > 0)
        setCountry(enums.countries[0]);
      if (!type && enums.types.length > 0) setType(enums.types[0]);
    }
  }, [enums, item, country, type]);

  useEffect(() => {
    if (!name.trim()) {
      setNameError("");
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await checkMediaName(name, item?.id);
        setNameError(result.duplicate ? "this name already exists" : "");
      } catch {
        // ignore check errors
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [name, item?.id]);

  const createMutation = useMutation({
    mutationFn: (data: MediaFormData) => createMedia(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      onClose();
    },
    onError: (err: Error) => {
      if (err instanceof ApiError && err.status === 422)
        setNameError(err.detail);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: MediaFormData) => updateMedia(item!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      onClose();
    },
    onError: (err: Error) => {
      if (err instanceof ApiError && err.status === 422)
        setNameError(err.detail);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMedia(item!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      onClose();
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (nameError) return;
      const data: MediaFormData = {
        name: name.trim(),
        country,
        type,
        status,
        rating: rating.trim() || null,
        review: review.trim() || null,
      };
      if (isEdit) updateMutation.mutate(data);
      else createMutation.mutate(data);
    },
    [
      name,
      country,
      type,
      status,
      rating,
      review,
      nameError,
      isEdit,
      createMutation,
      updateMutation,
    ],
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal onClose={onClose}>
      <h3 className="text-base-content text-xl font-bold mb-5 pr-8">
        {isEdit ? "edit media" : "add media"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="media-name" className="block text-base-content text-sm font-semibold mb-2">
            name
          </label>
          <input
            id="media-name"
            name="name"
            autoComplete="off"
            type="text"
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
          {nameError && <p className="text-error text-sm mt-1">{nameError}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="media-country" className="block text-base-content text-sm font-semibold mb-2">
              country
            </label>
            <select
              id="media-country"
              name="country"
              className={inputCls}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {enums?.countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="media-type" className="block text-base-content text-sm font-semibold mb-2">
              type
            </label>
            <select
              id="media-type"
              name="type"
              className={inputCls}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {enums?.types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="media-status" className="block text-base-content text-sm font-semibold mb-2">
              status
            </label>
            <select
              id="media-status"
              name="status"
              className={inputCls}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {enums?.statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="media-rating" className="block text-base-content text-sm font-semibold mb-2">
              rating
            </label>
            <input
              id="media-rating"
              name="rating"
              autoComplete="off"
              type="number"
              step="0.5"
              min="0"
              max="10"
              className={inputCls}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              placeholder="e.g. 4.5"
            />
          </div>
        </div>

        <div>
          <label htmlFor="media-review" className="block text-base-content text-sm font-semibold mb-2">
            review
          </label>
          <textarea
            id="media-review"
            name="review"
            className={`${inputCls} h-24 resize-none`}
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="your thoughts..."
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {isEdit && (
            <button
              type="button"
              onClick={() => {
                if (confirm("delete this media item?")) deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="text-error/60 hover:text-error text-sm font-semibold transition-colors motion-reduce:transition-none"
            >
              delete
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-base-200 text-base-content rounded-full border border-primary/20 hover:border-primary transition-colors motion-reduce:transition-none font-semibold text-sm"
          >
            cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !!nameError}
            className="px-4 py-2.5 bg-primary text-primary-content rounded-full border border-primary/80 font-semibold text-sm hover:brightness-110 transition-[filter,opacity] motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 relative overflow-hidden"
          >
            <div className="absolute inset-0 rounded-full shadow-[inset_0px_0.5px_0px_1.5px_rgba(255,255,255,0.06)]" />
            <span className="relative">
              {isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : isEdit ? (
                "save"
              ) : (
                "add"
              )}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
