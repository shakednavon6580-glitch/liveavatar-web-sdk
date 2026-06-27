"use client";

import { AvatarCard, type AvatarCardAction } from "./AvatarCard";
import type { Avatar } from "../../lib/avatar/avatarTypes";

interface AvatarGridProps {
  avatars: readonly Avatar[];
  emptyMessage: string;
  selectedAvatarId?: string;
  getActions: (avatar: Avatar) => readonly AvatarCardAction[];
  onCopyAvatarId?: (avatar: Avatar) => void;
}

export const AvatarGrid = ({
  avatars,
  emptyMessage,
  selectedAvatarId,
  getActions,
  onCopyAvatarId,
}: AvatarGridProps) => {
  if (avatars.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.03] px-6 py-14 text-center text-sm text-zinc-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {avatars.map((avatar) => (
        <AvatarCard
          key={avatar.id}
          avatar={avatar}
          selected={selectedAvatarId === avatar.id}
          actions={getActions(avatar)}
          onCopyAvatarId={onCopyAvatarId}
        />
      ))}
    </div>
  );
};
