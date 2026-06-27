"use client";

import Image, { type ImageLoaderProps } from "next/image";
import { useEffect, useState } from "react";
import type { Avatar } from "../../lib/avatar/avatarTypes";
import { getAvatarProviderLabel } from "../../lib/avatar/avatarTypes";

interface AvatarPreviewProps {
  avatar: Avatar;
  size?: "sm" | "lg";
}

const sizeClasses = {
  sm: "h-20 w-20 rounded-2xl text-lg",
  lg: "h-28 w-28 rounded-[1.75rem] text-2xl",
} as const;

const sizePixels = {
  sm: 80,
  lg: 112,
} as const;

const passthroughImageLoader = ({ src }: ImageLoaderProps) => src;

export const AvatarPreview = ({ avatar, size = "lg" }: AvatarPreviewProps) => {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [avatar.previewImage]);

  const initials = avatar.name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const showImage = !!avatar.previewImage && !hasImageError;
  const previewImageSrc = avatar.previewImage;

  if (showImage && previewImageSrc) {
    return (
      <Image
        loader={passthroughImageLoader}
        unoptimized
        src={previewImageSrc}
        alt={`${avatar.name} preview`}
        width={sizePixels[size]}
        height={sizePixels[size]}
        onError={() => setHasImageError(true)}
        className={`${sizeClasses[size]} object-cover ring-1 ring-white/10`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.3),_transparent_42%),linear-gradient(135deg,rgba(24,24,27,0.95),rgba(39,39,42,0.9),rgba(82,82,91,0.75))] ring-1 ring-white/10`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(130deg,transparent,rgba(255,255,255,0.05),transparent)]" />
      <div className="relative flex h-full flex-col justify-between p-3">
        <span className="text-[0.65rem] uppercase tracking-[0.25em] text-white/55">
          {getAvatarProviderLabel(avatar.provider)}
        </span>
        <span className="text-left font-semibold text-white/90">
          {initials}
        </span>
      </div>
    </div>
  );
};
