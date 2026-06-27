"use client";

import { startTransition, useEffect, useState } from "react";
import { avatarService } from "./avatarService";
import type {
  Avatar,
  AvatarCreateInput,
  AvatarLibrary,
  AvatarUpdateInput,
} from "./avatarTypes";

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Avatar request failed";

export const useAvatarLibrary = () => {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const library = await avatarService.list();
      startTransition(() => {
        setAvatars([...library]);
      });
    } catch (error) {
      setError(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const runMutation = async <T>(
    operation: () => Promise<T>,
    apply: (result: T) => void,
  ): Promise<T> => {
    setMutating(true);
    setError(null);
    try {
      const result = await operation();
      startTransition(() => {
        apply(result);
      });
      return result;
    } catch (error) {
      const message = toErrorMessage(error);
      setError(message);
      throw new Error(message);
    } finally {
      setMutating(false);
    }
  };

  return {
    avatars,
    loading,
    mutating,
    error,
    refresh,
    createAvatar: (input: AvatarCreateInput) =>
      runMutation(
        () => avatarService.create(input),
        (avatar) => {
          setAvatars((current) => [...current, avatar]);
        },
      ),
    updateAvatar: (id: string, input: AvatarUpdateInput) =>
      runMutation(
        () => avatarService.update(id, input),
        (avatar) => {
          setAvatars((current) =>
            current.map((item) => (item.id === avatar.id ? avatar : item)),
          );
        },
      ),
    deleteAvatar: (id: string) =>
      runMutation(
        () => avatarService.delete(id),
        (library: AvatarLibrary) => {
          setAvatars([...library]);
        },
      ),
    setDefaultAvatar: (id: string) =>
      runMutation(
        () => avatarService.setDefault(id),
        (avatar) => {
          setAvatars((current) =>
            current.map((item) => ({
              ...item,
              isDefault: item.id === avatar.id,
            })),
          );
        },
      ),
  };
};
