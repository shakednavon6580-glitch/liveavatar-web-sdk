import type {
  Avatar,
  AvatarCreateInput,
  AvatarLibrary,
  AvatarUpdateInput,
} from "./avatarTypes";

const AVATAR_API_URL = "/api/avatars";

const readApiResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;

  if (!response.ok) {
    throw new Error(payload.error ?? "Avatar request failed");
  }

  return payload;
};

export const avatarService = {
  async list(): Promise<AvatarLibrary> {
    const response = await fetch(AVATAR_API_URL, { method: "GET" });
    const payload = await readApiResponse<{ avatars: AvatarLibrary }>(response);
    return payload.avatars;
  },

  async create(input: AvatarCreateInput): Promise<Avatar> {
    const response = await fetch(AVATAR_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const payload = await readApiResponse<{ avatar: Avatar }>(response);
    return payload.avatar;
  },

  async update(id: string, input: AvatarUpdateInput): Promise<Avatar> {
    const response = await fetch(AVATAR_API_URL, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...input }),
    });
    const payload = await readApiResponse<{ avatar: Avatar }>(response);
    return payload.avatar;
  },

  async delete(id: string): Promise<AvatarLibrary> {
    const response = await fetch(
      `${AVATAR_API_URL}?id=${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    );
    const payload = await readApiResponse<{ avatars: AvatarLibrary }>(response);
    return payload.avatars;
  },

  async setDefault(id: string): Promise<Avatar> {
    const response = await fetch(`${AVATAR_API_URL}/default`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const payload = await readApiResponse<{ avatar: Avatar }>(response);
    return payload.avatar;
  },
};
