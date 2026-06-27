"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { AvatarGrid } from "./AvatarGrid";
import { ModalShell } from "./ModalShell";
import type { Avatar } from "../../lib/avatar/avatarTypes";
import { getAvatarProviderLabel } from "../../lib/avatar/avatarTypes";

interface AvatarPickerModalProps {
  open: boolean;
  avatars: readonly Avatar[];
  selectedAvatarId?: string;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
  onRetry?: () => void;
  onSelect: (avatar: Avatar) => void;
}

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

export const AvatarPickerModal = ({
  open,
  avatars,
  selectedAvatarId,
  loading,
  error,
  onClose,
  onRetry,
  onSelect,
}: AvatarPickerModalProps) => {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const filteredAvatars = avatars.filter((avatar) =>
    matchesSearch(avatar, deferredQuery),
  );

  return (
    <ModalShell
      open={open}
      title="Avatar Picker"
      description="Select an avatar from the shared library. The session flow still receives the avatarId exactly as before."
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/avatars"
            className="text-sm text-zinc-400 underline transition hover:text-white"
          >
            Open Avatar Management
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            Done
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, provider, or description"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/25"
        />

        {error && (
          <div className="flex flex-col gap-3 rounded-[1.5rem] border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-red-300/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-100 transition hover:border-red-200/40 hover:bg-red-500/15"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-14 text-center text-sm text-zinc-400">
            Loading avatars...
          </div>
        ) : (
          <AvatarGrid
            avatars={filteredAvatars}
            selectedAvatarId={selectedAvatarId}
            emptyMessage="No avatars match your search."
            onCopyAvatarId={(avatar) => {
              void navigator.clipboard.writeText(avatar.avatarId);
            }}
            getActions={(avatar) => [
              {
                label:
                  avatar.id === selectedAvatarId ? "Selected" : "Select Avatar",
                onClick: () => onSelect(avatar),
                disabled: avatar.id === selectedAvatarId,
                tone: avatar.id === selectedAvatarId ? "secondary" : "primary",
              },
            ]}
          />
        )}
      </div>
    </ModalShell>
  );
};
