import { NextRequest } from "next/server";
import {
  AvatarDataError,
  parseAvatarCreateInput,
  parseAvatarUpdateInput,
} from "../../../src/lib/avatar/avatarLoader";
import { getAvatarRepository } from "../../../src/lib/avatar/avatarRepository.server";
import { AvatarRepositoryError } from "../../../src/lib/avatar/avatarRepository";

export const dynamic = "force-dynamic";

const toErrorResponse = (error: unknown): Response => {
  if (error instanceof AvatarDataError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (error instanceof AvatarRepositoryError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.error("Avatar API error:", error);
  return new Response(JSON.stringify({ error: "Avatar request failed" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
};

export async function GET() {
  try {
    const avatars = await getAvatarRepository().list();
    return new Response(JSON.stringify({ avatars }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}));
    const avatar = await getAvatarRepository().create(
      parseAvatarCreateInput(payload),
    );
    return new Response(JSON.stringify({ avatar }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      id?: unknown;
    };

    if (typeof payload.id !== "string" || !payload.id.trim()) {
      throw new AvatarDataError("id is required");
    }

    const avatar = await getAvatarRepository().update(
      payload.id.trim(),
      parseAvatarUpdateInput(payload),
    );

    return new Response(JSON.stringify({ avatar }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const avatarId = request.nextUrl.searchParams.get("id");
    if (!avatarId?.trim()) {
      throw new AvatarDataError("id is required");
    }

    const avatars = await getAvatarRepository().delete(avatarId.trim());
    return new Response(JSON.stringify({ avatars }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
