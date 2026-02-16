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

  // set defaults from enums when they load (for create mode)
  useEffect(() => {
    if (!enums) return;
    if (!item) {
      if (!country && enums.countries.length > 0)
        setCountry(enums.countries[0]);
      if (!type && enums.types.length > 0) setType(enums.types[0]);
    }
  }, [enums, item, country, type]);

  // debounced name check
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
      if (err instanceof ApiError && err.status === 422) {
        setNameError(err.detail);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: MediaFormData) => updateMedia(item!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      onClose();
    },
    onError: (err: Error) => {
      if (err instanceof ApiError && err.status === 422) {
        setNameError(err.detail);
      }
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

      if (isEdit) {
        updateMutation.mutate(data);
      } else {
        createMutation.mutate(data);
      }
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
      <h3 className="font-bold text-lg mb-4">
        {isEdit ? "edit media" : "add media"}
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="label mb-2 block">name</label>
          <input
            type="text"
            className="input input-bordered"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          {nameError && (
            <div className="text-error text-sm mt-1">{nameError}</div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">country</span>
            </label>
            <select
              className="select select-bordered"
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

          <div className="form-control">
            <label className="label">
              <span className="label-text">type</span>
            </label>
            <select
              className="select select-bordered"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">status</span>
            </label>
            <select
              className="select select-bordered"
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

          <div className="form-control">
            <label className="label">
              <span className="label-text">rating</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              placeholder="e.g. 4.5"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="label mb-2 block">review</label>
          <textarea
            className="textarea textarea-bordered h-24"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="your thoughts..."
          />
        </div>

        <div className="modal-action flex-col-reverse gap-2 sm:flex-row">
          {isEdit && (
            <button
              type="button"
              className="btn btn-ghost btn-sm text-error"
              onClick={() => {
                if (confirm("delete this media item?")) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
            >
              delete
            </button>
          )}
          <div className="flex-1" />
          <button type="button" className="btn" onClick={onClose}>
            cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending || !!nameError}
          >
            {isEdit ? "save" : "add"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
