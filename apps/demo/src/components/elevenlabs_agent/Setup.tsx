"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AvatarPickerModal } from "../avatar/AvatarPickerModal";
import { AvatarPreview } from "../avatar/AvatarPreview";
import { useAvatarLibrary } from "../../lib/avatar/useAvatarLibrary";
import {
  getAvatarProviderLabel,
  getAvatarTypeLabel,
  type Avatar,
} from "../../lib/avatar/avatarTypes";

interface Secret {
  id: string;
  secret_name: string;
  secret_type: string;
  created_at: string;
}

interface Props {
  onSessionStarted: (sessionToken: string, apiUrl?: string) => void;
  onBack: () => void;
}

const IMPORT_KEY_URL = "https://app.liveavatar.com/voices/third-party/import";

const STORAGE_KEY = "liveavatar-demo:elevenlabs-agent-setup";

type StoredSetup = {
  agentId?: string;
  secretId?: string;
  selectedAvatarId?: string;
};

const loadStoredSetup = (): StoredSetup => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSetup) : {};
  } catch {
    return {};
  }
};

const saveStoredSetup = (setup: StoredSetup): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
  } catch {
    // ignore quota / privacy-mode failures
  }
};

const updateStoredSetup = (setup: StoredSetup): void => {
  saveStoredSetup({ ...loadStoredSetup(), ...setup });
};

export const Setup = ({ onSessionStarted, onBack }: Props) => {
  const {
    avatars,
    loading: avatarsLoading,
    error: avatarsError,
    refresh: refreshAvatars,
  } = useAvatarLibrary();
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [secretsLoading, setSecretsLoading] = useState(true);
  const [selectedSecretId, setSelectedSecretId] = useState("");
  const [selectedAvatarId, setSelectedAvatarId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Hydrate from localStorage AFTER mount to avoid SSR/CSR mismatch
  useEffect(() => {
    const stored = loadStoredSetup();
    if (stored.agentId) setAgentId(stored.agentId);
    if (stored.secretId) setSelectedSecretId(stored.secretId);
    if (stored.selectedAvatarId) setSelectedAvatarId(stored.selectedAvatarId);
  }, []);

  useEffect(() => {
    if (avatars.length === 0) return;

    setSelectedAvatarId((current) => {
      if (current && avatars.some((avatar) => avatar.id === current)) {
        return current;
      }

      const storedAvatarId = loadStoredSetup().selectedAvatarId;
      if (
        storedAvatarId &&
        avatars.some((avatar) => avatar.id === storedAvatarId)
      ) {
        return storedAvatarId;
      }

      const fallbackAvatar =
        avatars.find((avatar) => avatar.isDefault) ?? avatars[0];
      return fallbackAvatar ? fallbackAvatar.id : current;
    });
  }, [avatars]);

  const selectedAvatar =
    avatars.find((avatar) => avatar.id === selectedAvatarId) ??
    avatars.find((avatar) => avatar.isDefault) ??
    avatars[0] ??
    null;

  const loadSecrets = async () => {
    setSecretsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/secrets");
      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? "Failed to load secrets");
        return;
      }
      const { secrets: list } = await res.json();
      const filtered: Secret[] = (list ?? []).filter(
        (s: Secret) => s.secret_type === "ELEVENLABS_API_KEY",
      );
      setSecrets(filtered);
      // Prefer the last-used secret if it still exists, otherwise pick the first
      setSelectedSecretId((prev) => {
        if (prev && filtered.some((s) => s.id === prev)) return prev;
        return filtered[0]?.id ?? "";
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSecretsLoading(false);
    }
  };

  useEffect(() => {
    loadSecrets();
  }, []);

  const handleAgentIdChange = (value: string) => {
    setAgentId(value);
    updateStoredSetup({ agentId: value });
  };

  const handleAvatarChange = (avatar: Avatar) => {
    setSelectedAvatarId(avatar.id);
    updateStoredSetup({ selectedAvatarId: avatar.id });
    setIsPickerOpen(false);
  };

  const handleStartCall = async () => {
    if (!selectedAvatar) {
      setError("Select an avatar.");
      return;
    }
    if (!selectedSecretId) {
      setError("Select an ElevenLabs API key.");
      return;
    }
    if (!agentId.trim()) {
      setError("Enter an agent_id.");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/start-elevenlabs-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId.trim(),
          secret_id: selectedSecretId,
          avatarId: selectedAvatar.avatarId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? "Failed to start session");
        return;
      }
      const { session_token, api_url } = await res.json();
      saveStoredSetup({
        agentId: agentId.trim(),
        secretId: selectedSecretId,
        selectedAvatarId: selectedAvatar.id,
      });
      onSessionStarted(session_token, api_url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="w-full max-w-lg flex flex-col items-center gap-6 p-8">
      <div className="text-center mb-2">
        <h1 className="text-2xl font-semibold text-white mb-1">
          ElevenLabs Agent Connector
        </h1>
        <p className="text-sm text-gray-400">
          Pick an ElevenLabs API key and enter an agent_id
        </p>
      </div>

      {error && (
        <div className="w-full px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="w-full flex flex-col gap-2">
        <label className="text-xs text-gray-500 uppercase tracking-wider">
          ElevenLabs API Key
        </label>
        {secretsLoading ? (
          <div className="text-sm text-gray-400">Loading secrets...</div>
        ) : secrets.length === 0 ? (
          <a
            href={IMPORT_KEY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-6 py-2.5 rounded-lg bg-white/10 text-white font-medium text-sm border border-white/20 hover:bg-white/20 transition-colors text-center"
          >
            Add ElevenLabs API Key
          </a>
        ) : (
          <>
            <select
              value={selectedSecretId}
              onChange={(e) => setSelectedSecretId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 text-white text-sm border border-white/10 focus:outline-none focus:border-white/30 transition-colors"
            >
              {secrets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.secret_name}
                </option>
              ))}
            </select>
            <a
              href={IMPORT_KEY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-white underline self-start"
            >
              + Add ElevenLabs API Key
            </a>
          </>
        )}
      </div>

      <div className="w-full flex flex-col gap-2">
        <label className="text-xs text-gray-500 uppercase tracking-wider">
          Agent ID
        </label>
        <input
          type="text"
          value={agentId}
          onChange={(e) => handleAgentIdChange(e.target.value)}
          placeholder="agent_xxxxxxxxxxxxxxxxxx"
          className="w-full px-4 py-2.5 rounded-lg bg-white/5 text-white text-sm border border-white/10 focus:outline-none focus:border-white/30 placeholder-gray-500 transition-colors"
        />
      </div>

      <div className="w-full flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-xs text-gray-500 uppercase tracking-wider">
            Avatar
          </label>
          <Link
            href="/avatars"
            className="text-xs text-gray-400 underline hover:text-white"
          >
            Manage library
          </Link>
        </div>

        {avatarsLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-gray-400">
            Loading avatars...
          </div>
        ) : avatarsError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-200">
            <p>{avatarsError}</p>
            <button
              type="button"
              onClick={() => void refreshAvatars()}
              className="mt-3 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-100 transition hover:border-red-300/40 hover:bg-red-500/15 hover:text-white"
            >
              Retry
            </button>
          </div>
        ) : selectedAvatar ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start gap-4">
              <AvatarPreview avatar={selectedAvatar} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-white">
                    {selectedAvatar.name}
                  </h3>
                  {selectedAvatar.isDefault && (
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-100">
                      Default
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                  <span>
                    Provider{" "}
                    <span className="text-gray-200">
                      {getAvatarProviderLabel(selectedAvatar.provider)}
                    </span>
                  </span>
                  <span>
                    Type{" "}
                    <span className="text-gray-200">
                      {getAvatarTypeLabel(selectedAvatar.type)}
                    </span>
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Avatar ID: {selectedAvatar.avatarId}
                </p>
                {selectedAvatar.description && (
                  <p className="mt-2 text-sm text-gray-400">
                    {selectedAvatar.description}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
            >
              Open Avatar Picker
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-gray-400">
            No avatars are available yet. Add one from Avatar Management.
          </div>
        )}
      </div>

      <div className="w-full flex flex-col gap-3">
        <button
          onClick={handleStartCall}
          disabled={
            starting ||
            secretsLoading ||
            secrets.length === 0 ||
            avatarsLoading ||
            !selectedAvatar
          }
          className="w-full px-6 py-2.5 rounded-lg bg-white/10 text-white font-medium text-base border border-white/20 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {starting ? "Starting..." : "Start Call"}
        </button>
        <button
          onClick={onBack}
          disabled={starting}
          className="w-full px-6 py-2.5 rounded-lg text-gray-400 hover:text-white text-sm transition-colors disabled:opacity-50"
        >
          Back
        </button>
      </div>

      <AvatarPickerModal
        open={isPickerOpen}
        avatars={avatars}
        selectedAvatarId={selectedAvatar?.id}
        loading={avatarsLoading}
        error={avatarsError}
        onClose={() => setIsPickerOpen(false)}
        onRetry={() => void refreshAvatars()}
        onSelect={handleAvatarChange}
      />
    </div>
  );
};
