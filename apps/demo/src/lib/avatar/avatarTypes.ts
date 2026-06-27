export const AVATAR_PROVIDERS = [
  { id: "liveavatar", label: "LiveAvatar" },
  { id: "heygen", label: "HeyGen" },
] as const;

export const AVATAR_TYPES = [
  { id: "public", label: "Public" },
  { id: "custom", label: "Custom" },
] as const;

export type AvatarProvider = (typeof AVATAR_PROVIDERS)[number]["id"];
export type AvatarType = (typeof AVATAR_TYPES)[number]["id"];

export interface Avatar {
  id: string;
  name: string;
  provider: AvatarProvider;
  avatarId: string;
  type: AvatarType;
  previewImage?: string;
  description?: string;
  isDefault: boolean;
}

export type AvatarLibrary = readonly [Avatar, ...Avatar[]];

export interface AvatarUpsertInput {
  name: string;
  provider: AvatarProvider;
  avatarId: string;
  type: AvatarType;
  previewImage?: string;
  description?: string;
}

export type AvatarCreateInput = AvatarUpsertInput;

export type AvatarUpdateInput = Partial<AvatarUpsertInput>;

export const getAvatarProviderLabel = (provider: AvatarProvider): string =>
  AVATAR_PROVIDERS.find((option) => option.id === provider)?.label ?? provider;

export const getAvatarTypeLabel = (type: AvatarType): string =>
  AVATAR_TYPES.find((option) => option.id === type)?.label ?? type;
