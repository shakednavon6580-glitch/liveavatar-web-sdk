"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { AvatarFormModal } from "./AvatarFormModal";
import { AvatarGrid } from "./AvatarGrid";
import { ModalShell } from "./ModalShell";
import { useAvatarLibrary } from "../../lib/avatar/useAvatarLibrary";
import type { Avatar, AvatarCreateInput } from "../../lib/avatar/avatarTypes";
import { getAvatarProviderLabel } from "../../lib/avatar/avatarTypes";

const matchesSearch = (avatar: Avatar, query: string): boolean => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [
    avatar.name,
    avatar.description ?? "",
    avatar.provider,
    getAvatarProviderLabel(avatar.provider),
  ].some((value) => value.toLowerCase().includes(normalized));
};

export const AvatarManagementPage = () => {
  const {
    avatars,
    loading,
    mutating,
    error,
    refresh,
    createAvatar,
    updateAvatar,
    deleteAvatar,
    setDefaultAvatar,
  } = useAvatarLibrary();
  const [query, setQuery] = useState("");
  const [copiedAvatarId, setCopiedAvatarId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState<Avatar | null>(null);
  const [avatarToDelete, setAvatarToDelete] = useState<Avatar | null>(null);
  const deferredQuery = useDeferredValue(query);

  const filteredAvatars = avatars.filter((avatar) =>
    matchesSearch(avatar, deferredQuery),
  );

  const handleCopyAvatarId = async (avatar: Avatar) => {
    await navigator.clipboard.writeText(avatar.avatarId);
    setCopiedAvatarId(avatar.id);
    window.setTimeout(() => {
      setCopiedAvatarId((current) => (current === avatar.id ? null : current));
    }, 1600);
  };

  const handleCreate = async (input: AvatarCreateInput) => {
    await createAvatar(input);
    setIsCreateOpen(false);
  };

  const handleUpdate = async (input: AvatarCreateInput) => {
    if (!editingAvatar) return;
    await updateAvatar(editingAvatar.id, input);
    setEditingAvatar(null);
  };

  const handleDelete = async () => {
    if (!avatarToDelete) return;
    await deleteAvatar(avatarToDelete.id);
    setAvatarToDelete(null);
  };

  return (
    <div className="min-h-screen w-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(34,197,94,0.12),_transparent_24%),linear-gradient(180deg,#09090b,#111827_45%,#09090b)] px-4 py-10 text-white sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] shadow-[0_30px_120px_rgba(0,0,0,0.32)]">
          <div className="flex flex-col gap-6 px-6 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/75">
                Avatar Management
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Manage the shared avatar library
              </h1>
              <p className="mt-3 text-sm text-zinc-300 sm:text-base">
                Avatars are stored in <code>config/avatars.json</code> through a
                repository layer, so the UI can switch to a database-backed
                source later without changing components.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Back to Demo
              </Link>
              <Link
                href="/elevenlabs-agent"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                ElevenLabs Setup
              </Link>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="rounded-2xl border border-white/20 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:border-white hover:bg-zinc-100"
              >
                Add Avatar
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="flex flex-col gap-2 text-sm text-zinc-300">
            <span>Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, provider, or description"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/25"
            />
          </label>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-zinc-300">
            <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
              Library Status
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {avatars.length} avatar{avatars.length === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {mutating ? "Saving changes..." : "JSON repository active"}
            </p>
          </div>
        </div>

        {copiedAvatarId && (
          <div className="rounded-[1.5rem] border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Avatar ID copied.
          </div>
        )}

        {error && (
          <div className="flex flex-col gap-3 rounded-[1.5rem] border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-full border border-red-300/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-100 transition hover:border-red-200/40 hover:bg-red-500/15"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-20 text-center text-sm text-zinc-400">
            Loading avatar library...
          </div>
        ) : (
          <AvatarGrid
            avatars={filteredAvatars}
            emptyMessage="No avatars match your search."
            onCopyAvatarId={(avatar) => {
              void handleCopyAvatarId(avatar);
            }}
            getActions={(avatar) => [
              {
                label: "Edit",
                onClick: () => setEditingAvatar(avatar),
              },
              {
                label: avatar.isDefault ? "Default" : "Make Default",
                onClick: () => void setDefaultAvatar(avatar.id),
                disabled: avatar.isDefault || mutating,
                tone: avatar.isDefault ? "secondary" : "primary",
              },
              {
                label: "Delete",
                onClick: () => setAvatarToDelete(avatar),
                disabled: avatars.length === 1 || mutating,
                tone: "danger",
              },
            ]}
          />
        )}
      </div>

      <AvatarFormModal
        open={isCreateOpen}
        mode="create"
        saving={mutating}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <AvatarFormModal
        open={!!editingAvatar}
        mode="edit"
        avatar={editingAvatar ?? undefined}
        saving={mutating}
        onClose={() => setEditingAvatar(null)}
        onSubmit={handleUpdate}
      />

      <ModalShell
        open={!!avatarToDelete}
        title="Delete Avatar"
        description="This updates avatars.json immediately. The last remaining avatar cannot be deleted."
        onClose={() => setAvatarToDelete(null)}
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setAvatarToDelete(null)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={mutating}
              className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-100 transition hover:border-red-300/40 hover:bg-red-500/15 hover:text-white disabled:opacity-50"
            >
              {mutating ? "Deleting..." : "Delete Avatar"}
            </button>
          </div>
        }
      >
        <p className="text-sm text-zinc-300">
          {avatarToDelete
            ? `Delete "${avatarToDelete.name}" from the shared library?`
            : ""}
        </p>
      </ModalShell>
    </div>
  );
};
