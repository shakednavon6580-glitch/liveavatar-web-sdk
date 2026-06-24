import { API_KEY, API_URL, getLocalCredentialSecrets } from "../secrets";

export const dynamic = "force-dynamic";

type RemoteSecret = {
  id?: unknown;
  secret_name?: unknown;
  secret_type?: unknown;
  created_at?: unknown;
};

const toSafeRemoteSecret = (secret: RemoteSecret) => ({
  id: typeof secret.id === "string" ? secret.id : "",
  secret_name:
    typeof secret.secret_name === "string" ? secret.secret_name : "Unnamed",
  secret_type:
    typeof secret.secret_type === "string" ? secret.secret_type : "UNKNOWN",
  created_at: typeof secret.created_at === "string" ? secret.created_at : "",
  source: "liveavatar",
});

export async function GET() {
  const localSecrets = getLocalCredentialSecrets();

  if (!API_KEY) {
    return new Response(JSON.stringify({ secrets: localSecrets }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const res = await fetch(`${API_URL}/v1/secrets`, {
      method: "GET",
      headers: {
        "X-API-KEY": API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type");
      let errorMessage = "Failed to list secrets";
      if (contentType && contentType.includes("application/json")) {
        try {
          const resp = await res.json();
          if (resp.data && resp.data.length > 0 && resp.data[0].message) {
            errorMessage = resp.data[0].message;
          } else if (resp.error) {
            errorMessage = resp.error;
          } else if (resp.message) {
            errorMessage = resp.message;
          }
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }
      } else {
        const text = await res.text();
        errorMessage = text || errorMessage;
      }
      if (localSecrets.length > 0) {
        return new Response(
          JSON.stringify({ secrets: localSecrets, warning: errorMessage }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: res.status,
      });
    }

    const data = await res.json();
    const remoteSecrets = Array.isArray(data.data)
      ? (data.data as RemoteSecret[])
          .map(toSafeRemoteSecret)
          .filter((secret) => secret.id)
      : [];
    return new Response(
      JSON.stringify({ secrets: [...localSecrets, ...remoteSecrets] }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error listing secrets:", error);
    if (localSecrets.length > 0) {
      return new Response(
        JSON.stringify({
          secrets: localSecrets,
          warning: "Failed to list LiveAvatar secrets",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
    });
  }
}
