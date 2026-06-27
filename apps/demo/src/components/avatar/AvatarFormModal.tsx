"use client";

import { useEffect, useState } from "react";
import { ModalShell } from "./ModalShell";
import {
  AVATAR_PROVIDERS,
  AVATAR_TYPES,
  type Avatar,
  type AvatarCreateInput,
  type AvatarProvider,
  type AvatarType,
} from "../../lib/avatar/avatarTypes";

interface AvatarFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  avatar?: Avatar;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: AvatarCreateInput) => Promise<void>;
}

interface FormState {
  name: string;
  provider: AvatarProvider;
  type: AvatarType;
  avatarId: string;
  description: string;
  previewImage: string;
}

const createInitialState = (avatar?: Avatar): FormState => ({
  name: avatar?.name ?? "",
  provider: avatar?.provider ?? AVATAR_PROVIDERS[0].id,
  type: avatar?.type ?? AVATAR_TYPES[0].id,
  avatarId: avatar?.avatarId ?? "",
  description: avatar?.description ?? "",
  previewImage: avatar?.previewImage ?? "",
});

export const AvatarFormModal = ({
  open,
  mode,
  avatar,
  saving,
  onClose,
  onSubmit,
}: AvatarFormModalProps) => {
  const [form, setForm] = useState<FormState>(createInitialState(avatar));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(createInitialState(avatar));
    setError(null);
  }, [avatar, open]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.avatarId.trim()) {
      setError("Avatar ID is required.");
      return;
    }

    setError(null);
    await onSubmit({
      name: form.name.trim(),
      provider: form.provider,
      type: form.type,
      avatarId: form.avatarId.trim(),
      description: form.description.trim() || undefined,
      previewImage: form.previewImage.trim() || undefined,
    });
  };

  return (
    <ModalShell
      open={open}
      title={mode === "create" ? "Add Avatar" : "Edit Avatar"}
      description="Changes are stored in avatars.json through the JSON-backed repository."
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-2xl border border-white/20 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:border-white hover:bg-zinc-100 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-zinc-300">
          <span>Name</span>
          <input
            type="text"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/25"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-zinc-300">
          <span>Provider</span>
          <select
            value={form.provider}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                provider: event.target.value as AvatarProvider,
              }))
            }
            className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-white/25"
          >
            {AVATAR_PROVIDERS.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-zinc-300">
          <span>Type</span>
          <select
            value={form.type}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                type: event.target.value as AvatarType,
              }))
            }
            className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-white/25"
          >
            {AVATAR_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-zinc-300">
          <span>Avatar ID</span>
          <input
            type="text"
            value={form.avatarId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                avatarId: event.target.value,
              }))
            }
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/25"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-zinc-300 sm:col-span-2">
          <span>Description</span>
          <textarea
            rows={4}
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/25"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-zinc-300 sm:col-span-2">
          <span>Preview Image URL</span>
          <input
            type="url"
            value={form.previewImage}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                previewImage: event.target.value,
              }))
            }
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/25"
          />
        </label>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
    </ModalShell>
  );
};
