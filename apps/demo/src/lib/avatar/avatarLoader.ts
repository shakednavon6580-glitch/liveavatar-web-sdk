import {
  AVATAR_PROVIDERS,
  AVATAR_TYPES,
  type Avatar,
  type AvatarCreateInput,
  type AvatarLibrary,
  type AvatarProvider,
  type AvatarType,
  type AvatarUpdateInput,
} from "./avatarTypes";

export class AvatarDataError extends Error {}

type AvatarRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readRequiredString = (
  value: AvatarRecord,
  field: string,
  index: number,
): string => {
  const fieldValue = value[field];
  if (typeof fieldValue !== "string" || !fieldValue.trim()) {
    throw new AvatarDataError(
      `Avatar at index ${index} requires a non-empty ${field}`,
    );
  }
  return fieldValue.trim();
};

const normalizeComparisonValue = (value: string): string =>
  value.trim().toLowerCase();

export const normalizeAvatarProvider = (
  value: string,
): AvatarProvider | undefined => {
  const normalized = normalizeComparisonValue(value);
  const match = AVATAR_PROVIDERS.find(
    (provider) =>
      normalized === provider.id || normalized === provider.label.toLowerCase(),
  );
  return match?.id;
};

export const normalizeAvatarType = (value: string): AvatarType | undefined => {
  const normalized = normalizeComparisonValue(value);
  const match = AVATAR_TYPES.find(
    (type) => normalized === type.id || normalized === type.label.toLowerCase(),
  );
  return match?.id;
};

const readOptionalString = (
  value: AvatarRecord,
  field: "previewImage" | "description",
  index: number,
): string | undefined => {
  const fieldValue = value[field];
  if (fieldValue === undefined || fieldValue === "") return undefined;
  if (typeof fieldValue !== "string") {
    throw new AvatarDataError(
      `Avatar at index ${index} has an invalid ${field}`,
    );
  }
  return fieldValue.trim() || undefined;
};

const parseAvatar = (value: unknown, index: number): Avatar => {
  if (!isRecord(value)) {
    throw new AvatarDataError(`Avatar at index ${index} must be an object`);
  }

  const typeValue = readRequiredString(value, "type", index);
  const type = normalizeAvatarType(typeValue);
  if (!type) {
    throw new AvatarDataError(
      `Avatar at index ${index} has an unsupported type: ${typeValue}`,
    );
  }

  const providerValue = readRequiredString(value, "provider", index);
  const provider = normalizeAvatarProvider(providerValue);
  if (!provider) {
    throw new AvatarDataError(
      `Avatar at index ${index} has an unsupported provider: ${providerValue}`,
    );
  }

  return {
    id: readRequiredString(value, "id", index),
    name: readRequiredString(value, "name", index),
    provider,
    avatarId: readRequiredString(value, "avatarId", index),
    type,
    previewImage: readOptionalString(value, "previewImage", index),
    description: readOptionalString(value, "description", index),
    isDefault: value.isDefault === true,
  };
};

export const parseAvatarLibrary = (value: unknown): AvatarLibrary => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AvatarDataError(
      "Avatar Library must contain at least one avatar",
    );
  }

  const avatars = value.map(parseAvatar);
  const ids = new Set<string>();
  for (const avatar of avatars) {
    if (ids.has(avatar.id)) {
      throw new AvatarDataError(
        `Avatar Library contains duplicate id: ${avatar.id}`,
      );
    }
    ids.add(avatar.id);
  }

  return ensureSingleDefault(avatars);
};

export const ensureSingleDefault = (
  avatars: readonly Avatar[],
): AvatarLibrary => {
  if (avatars.length === 0) {
    throw new AvatarDataError(
      "Avatar Library must contain at least one avatar",
    );
  }

  const firstDefaultIndex = avatars.findIndex((avatar) => avatar.isDefault);
  const resolvedDefaultIndex = firstDefaultIndex >= 0 ? firstDefaultIndex : 0;

  return avatars.map((avatar, index) => ({
    ...avatar,
    isDefault: index === resolvedDefaultIndex,
  })) as [Avatar, ...Avatar[]];
};

const readOptionalInputString = (
  value: AvatarRecord,
  field: "name" | "avatarId" | "previewImage" | "description",
): string | undefined => {
  const fieldValue = value[field];
  if (fieldValue === undefined) return undefined;
  if (typeof fieldValue !== "string") {
    throw new AvatarDataError(`${field} must be a string`);
  }
  const normalized = fieldValue.trim();
  return normalized || undefined;
};

const readRequiredInputString = (
  value: AvatarRecord,
  field: "name" | "avatarId",
): string => {
  const normalized = readOptionalInputString(value, field);
  if (!normalized) {
    throw new AvatarDataError(`${field} is required`);
  }
  return normalized;
};

export const parseAvatarCreateInput = (value: unknown): AvatarCreateInput => {
  if (!isRecord(value)) {
    throw new AvatarDataError("Avatar payload must be an object");
  }

  const providerValue = readRequiredString(value, "provider", 0);
  const provider = normalizeAvatarProvider(providerValue);
  if (!provider) {
    throw new AvatarDataError(`Unsupported provider: ${providerValue}`);
  }

  const typeValue = readRequiredString(value, "type", 0);
  const type = normalizeAvatarType(typeValue);
  if (!type) {
    throw new AvatarDataError(`Unsupported type: ${typeValue}`);
  }

  return {
    name: readRequiredInputString(value, "name"),
    provider,
    avatarId: readRequiredInputString(value, "avatarId"),
    type,
    previewImage: readOptionalInputString(value, "previewImage"),
    description: readOptionalInputString(value, "description"),
  };
};

export const parseAvatarUpdateInput = (value: unknown): AvatarUpdateInput => {
  if (!isRecord(value)) {
    throw new AvatarDataError("Avatar payload must be an object");
  }

  const update: AvatarUpdateInput = {};

  const name = readOptionalInputString(value, "name");
  if ("name" in value) {
    if (!name) {
      throw new AvatarDataError("name is required");
    }
    update.name = name;
  }

  const avatarId = readOptionalInputString(value, "avatarId");
  if ("avatarId" in value) {
    if (!avatarId) {
      throw new AvatarDataError("avatarId is required");
    }
    update.avatarId = avatarId;
  }

  if ("provider" in value) {
    if (typeof value.provider !== "string") {
      throw new AvatarDataError("provider must be a string");
    }
    const provider = normalizeAvatarProvider(value.provider);
    if (!provider) {
      throw new AvatarDataError(`Unsupported provider: ${value.provider}`);
    }
    update.provider = provider;
  }

  if ("type" in value) {
    if (typeof value.type !== "string") {
      throw new AvatarDataError("type must be a string");
    }
    const type = normalizeAvatarType(value.type);
    if (!type) {
      throw new AvatarDataError(`Unsupported type: ${value.type}`);
    }
    update.type = type;
  }

  if ("previewImage" in value) {
    update.previewImage = readOptionalInputString(value, "previewImage");
  }

  if ("description" in value) {
    update.description = readOptionalInputString(value, "description");
  }

  return update;
};
