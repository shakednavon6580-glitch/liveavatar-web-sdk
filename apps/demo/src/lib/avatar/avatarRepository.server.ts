import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { constants as fsConstants } from "node:fs";
import { ensureSingleDefault, parseAvatarLibrary } from "./avatarLoader";
import {
  AvatarRepositoryError,
  type AvatarRepository,
} from "./avatarRepository";
import type {
  Avatar,
  AvatarCreateInput,
  AvatarLibrary,
  AvatarUpdateInput,
} from "./avatarTypes";

const AVATAR_CONFIG_CANDIDATES = [
  path.resolve(process.cwd(), "config/avatars.json"),
  path.resolve(process.cwd(), "apps/demo/config/avatars.json"),
];

const toAvatarLibrary = (avatars: readonly Avatar[]): AvatarLibrary => {
  if (avatars.length === 0) {
    throw new AvatarRepositoryError(
      "Avatar Library must contain at least one avatar",
      500,
    );
  }

  return ensureSingleDefault(avatars);
};

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "avatar";

const createAvatarId = (name: string, existingIds: Set<string>): string => {
  const base = slugify(name);
  if (!existingIds.has(base)) {
    return base;
  }

  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
};

const resolveAvatarConfigPath = async (): Promise<string> => {
  for (const candidate of AVATAR_CONFIG_CANDIDATES) {
    try {
      await access(candidate, fsConstants.F_OK);
      return candidate;
    } catch {
      // Try the next candidate path.
    }
  }

  throw new AvatarRepositoryError("Could not locate config/avatars.json", 500);
};

class JSONAvatarRepository implements AvatarRepository {
  private async readLibrary(): Promise<AvatarLibrary> {
    const configPath = await resolveAvatarConfigPath();
    const raw = await readFile(configPath, "utf8");

    try {
      return parseAvatarLibrary(JSON.parse(raw));
    } catch (error) {
      if (error instanceof AvatarRepositoryError) {
        throw error;
      }

      throw new AvatarRepositoryError((error as Error).message, 500);
    }
  }

  private async writeLibrary(
    avatars: readonly Avatar[],
  ): Promise<AvatarLibrary> {
    const configPath = await resolveAvatarConfigPath();
    const library = toAvatarLibrary(avatars);

    await writeFile(
      configPath,
      `${JSON.stringify(library, null, 2)}\n`,
      "utf8",
    );

    return library;
  }

  async list(): Promise<AvatarLibrary> {
    return this.readLibrary();
  }

  async create(input: AvatarCreateInput): Promise<Avatar> {
    const avatars = await this.readLibrary();
    const existingIds = new Set(avatars.map((avatar) => avatar.id));
    const nextAvatar: Avatar = {
      id: createAvatarId(input.name, existingIds),
      ...input,
      isDefault: false,
    };

    const library = await this.writeLibrary([...avatars, nextAvatar]);
    return library.find((avatar) => avatar.id === nextAvatar.id) ?? nextAvatar;
  }

  async update(id: string, input: AvatarUpdateInput): Promise<Avatar> {
    const avatars = await this.readLibrary();
    const index = avatars.findIndex((avatar) => avatar.id === id);
    if (index === -1) {
      throw new AvatarRepositoryError("Avatar not found", 404);
    }

    const existingAvatar = avatars[index];
    if (!existingAvatar) {
      throw new AvatarRepositoryError("Avatar not found", 404);
    }

    const updatedAvatar: Avatar = {
      ...existingAvatar,
      ...input,
    };

    const library = await this.writeLibrary(
      avatars.map((avatar, avatarIndex) =>
        avatarIndex === index ? updatedAvatar : avatar,
      ),
    );

    return library.find((avatar) => avatar.id === id) ?? updatedAvatar;
  }

  async delete(id: string): Promise<AvatarLibrary> {
    const avatars = await this.readLibrary();
    if (avatars.length === 1) {
      throw new AvatarRepositoryError(
        "You must keep at least one avatar in the library",
        400,
      );
    }

    const nextAvatars = avatars.filter((avatar) => avatar.id !== id);
    if (nextAvatars.length === avatars.length) {
      throw new AvatarRepositoryError("Avatar not found", 404);
    }

    return this.writeLibrary(nextAvatars);
  }

  async setDefault(id: string): Promise<Avatar> {
    const avatars = await this.readLibrary();
    const hasAvatar = avatars.some((avatar) => avatar.id === id);
    if (!hasAvatar) {
      throw new AvatarRepositoryError("Avatar not found", 404);
    }

    const library = await this.writeLibrary(
      avatars.map((avatar) => ({
        ...avatar,
        isDefault: avatar.id === id,
      })),
    );

    return library.find((avatar) => avatar.id === id) ?? library[0];
  }
}

let repository: AvatarRepository | undefined;

export const getAvatarRepository = (): AvatarRepository => {
  repository ??= new JSONAvatarRepository();
  return repository;
};
