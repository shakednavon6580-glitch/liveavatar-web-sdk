import { NextRequest } from "next/server";
import {
  API_KEY,
  API_URL,
  IS_SANDBOX,
  resolveElevenLabsAgentCredential,
} from "../secrets";

interface StartElevenLabsSessionRequestBody {
  agent_id?: string;
  secret_id?: string;
  avatarId?: string;
}

export async function POST(request: NextRequest) {
  let session_token = "";
  let session_id = "";
  try {
    const body: StartElevenLabsSessionRequestBody = await request
      .json()
      .catch(() => ({}));

    if (!body.agent_id || !body.secret_id || !body.avatarId) {
      return new Response(
        JSON.stringify({
          error: "agent_id, secret_id, and avatarId are required",
        }),
        { status: 400 },
      );
    }

    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: "LiveAvatar API key not configured" }),
        { status: 500 },
      );
    }

    let elevenLabsCredential: ReturnType<
      typeof resolveElevenLabsAgentCredential
    >;
    try {
      elevenLabsCredential = resolveElevenLabsAgentCredential(body.secret_id);
    } catch (error) {
      return new Response(JSON.stringify({ error: (error as Error).message }), {
        status: 500,
      });
    }

    const res = await fetch(`${API_URL}/v1/sessions/token`, {
      method: "POST",
      headers: {
        "X-API-KEY": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "LITE",
        avatar_id: body.avatarId,
        is_sandbox: IS_SANDBOX,
        elevenlabs_agent_config: {
          agent_id: body.agent_id,
          ...elevenLabsCredential,
        },
      }),
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type");
      let errorMessage = "Failed to retrieve session token";
      if (contentType && contentType.includes("application/json")) {
        try {
          const resp = await res.json();
          if (resp.data && resp.data.length > 0) {
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
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: res.status,
      });
    }

    const data = await res.json();
    session_token = data.data.session_token;
    session_id = data.data.session_id;
  } catch (error) {
    console.error("Error retrieving session token:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
    });
  }

  if (!session_token) {
    return new Response(
      JSON.stringify({ error: "Failed to retrieve session token" }),
      { status: 500 },
    );
  }
  return new Response(
    JSON.stringify({ session_token, session_id, api_url: API_URL }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}
