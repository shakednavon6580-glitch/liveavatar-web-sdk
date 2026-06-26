const readEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value || value.toLowerCase().startsWith("your_")) return "";
  return value;
};

const readBooleanEnv = (name: string, defaultValue: boolean): boolean => {
  const value = readEnv(name).toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return defaultValue;
};

export const API_KEY = readEnv("LIVEAVATAR_API_KEY");
export const API_URL =
  readEnv("LIVEAVATAR_API_URL") || "https://api.liveavatar.com";
export const AVATAR_ID =
  readEnv("LIVEAVATAR_AVATAR_ID") || "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a";

// When true, we will call everything in Sandbox mode.
// Useful for integration and development.
export const IS_SANDBOX = readBooleanEnv("LIVEAVATAR_IS_SANDBOX", true);

// FULL MODE Customizations
// Wayne's avatar voice and context
export const VOICE_ID = "c2527536-6d1f-4412-a643-53a3497dada9";
export const CONTEXT_ID = "5b9dba8a-aa31-11f0-a6ee-066a7fa2e369";
export const LANGUAGE = "en";

// LITE MODE Customizations
export const ELEVENLABS_API_KEY = readEnv("ELEVENLABS_API_KEY");
export const ELEVENLABS_API_KEY_LABEL =
  readEnv("ELEVENLABS_API_KEY_LABEL") || "eleven";
export const OPENAI_API_KEY = readEnv("OPENAI_API_KEY");
export const OPENAI_API_KEY_LABEL = readEnv("OPENAI_API_KEY_LABEL") || "openai";

export type SafeCredentialSecret = {
  id: string;
  secret_name: string;
  secret_type: "ELEVENLABS_API_KEY" | "OPENAI_API_KEY";
  created_at: string;
  source: "env";
};

const localCredentialId = (secretType: SafeCredentialSecret["secret_type"]) =>
  `env:${secretType.toLowerCase()}`;

export const ELEVENLABS_ENV_SECRET_ID = localCredentialId("ELEVENLABS_API_KEY");
export const OPENAI_ENV_SECRET_ID = localCredentialId("OPENAI_API_KEY");

export const getLocalCredentialSecrets = (): SafeCredentialSecret[] => {
  const secrets: SafeCredentialSecret[] = [];

  if (ELEVENLABS_API_KEY) {
    secrets.push({
      id: ELEVENLABS_ENV_SECRET_ID,
      secret_name: ELEVENLABS_API_KEY_LABEL,
      secret_type: "ELEVENLABS_API_KEY",
      created_at: "local",
      source: "env",
    });
  }

  if (OPENAI_API_KEY) {
    secrets.push({
      id: OPENAI_ENV_SECRET_ID,
      secret_name: OPENAI_API_KEY_LABEL,
      secret_type: "OPENAI_API_KEY",
      created_at: "local",
      source: "env",
    });
  }

  return secrets;
};

export const isLocalElevenLabsCredential = (idOrLabel: string): boolean =>
  idOrLabel === ELEVENLABS_ENV_SECRET_ID ||
  idOrLabel === ELEVENLABS_API_KEY_LABEL;

export const resolveElevenLabsAgentCredential = (
  idOrLabel: string,
): { secret_id: string } | { api_key: string } => {
  if (!isLocalElevenLabsCredential(idOrLabel)) {
    return { secret_id: idOrLabel };
  }

  if (!ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key not configured");
  }

  return { api_key: ELEVENLABS_API_KEY };
};
