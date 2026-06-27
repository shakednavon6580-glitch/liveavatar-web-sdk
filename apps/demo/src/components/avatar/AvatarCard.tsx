"use client";

import { AvatarPreview } from "./AvatarPreview";
import type { Avatar } from "../../lib/avatar/avatarTypes";
import {
  getAvatarProviderLabel,
  getAvatarTypeLabel,
} from "../../lib/avatar/avatarTypes";

export interface AvatarCardAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "primary" | "secondary" | "danger";
}

interface AvatarCardProps {
  avatar: Avatar;
  actions: readonly AvatarCardAction[];
  selected?: boolean;
  onCopyAvatarId?: (avatar: Avatar) => void;
}

const actionToneClasses: Record<
  NonNullable<AvatarCardAction["tone"]>,
  string
> = {
  primary:
    "border-white/20 bg-white text-zinc-900 hover:border-white hover:bg-zinc-100",
  secondary:
    "border-white/10 bg-white/5 text-zinc-200 hover:border-white/20 hover:bg-white/10 hover:text-white",
  danger:
    "border-red-400/20 bg-red-500/10 text-red-200 hover:border-red-300/40 hover:bg-red-500/15 hover:text-white",
};

export const AvatarCard = ({
  avatar,
  actions,
  selected = false,
  onCopyAvatarId,
}: AvatarCardProps) => {
  return (
    <article
      className={`group relative overflow-hidden rounded-[2rem] border p-5 transition ${
        selected
          ? "border-cyan-300/70 bg-cyan-400/10 shadow-[0_20px_60px_rgba(6,182,212,0.18)]"
          : "border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.22)] hover:border-white/20 hover:bg-white/[0.06]"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,197,94,0.12),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.12),_transparent_32%)] opacity-80" />
      <div className="relative flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <AvatarPreview avatar={avatar} />
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-white">
                {avatar.name}
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                {avatar.description?.trim() || "No description yet."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-200">
              {getAvatarProviderLabel(avatar.provider)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-200">
              {getAvatarTypeLabel(avatar.type)}
            </span>
            {avatar.isDefault && (
              <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-100">
                Default
              </span>
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.7rem] uppercase tracking-[0.3em] text-zinc-500">
                Avatar ID
              </p>
              <p className="mt-1 truncate text-sm text-zinc-200">
                {avatar.avatarId}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCopyAvatarId?.(avatar)}
              className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {actions.map((action) => {
            const tone = action.tone ?? "secondary";
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${actionToneClasses[tone]}`}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
};
