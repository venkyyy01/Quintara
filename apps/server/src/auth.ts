/**
 * Guest-first authentication (§73): HMAC-signed bearer tokens.
 * Guests start immediately; accounts can be layered on later without
 * changing the transport. Tokens are validated server-side on every
 * connection (§74).
 */

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const SECRET =
  process.env.QUINTARA_AUTH_SECRET ??
  (() => {
    // Generated at boot for single-instance development. Production must set
    // QUINTARA_AUTH_SECRET so tokens survive restarts.
    const generated = randomUUID();
    console.warn(
      "[quintara] QUINTARA_AUTH_SECRET not set — using an ephemeral secret.",
    );
    return generated;
  })();

export interface TokenPayload {
  readonly playerId: string;
  readonly displayName: string;
  readonly expiresAt: number;
}

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function issueToken(playerId: string, displayName: string): string {
  const payload: TokenPayload = {
    playerId,
    displayName,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts as [string, string];
  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as TokenPayload;
    if (typeof payload.playerId !== "string") return null;
    if (payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createGuest(displayName?: string): TokenPayload {
  const playerId = `guest-${randomUUID().slice(0, 8)}`;
  const name = (displayName ?? "").trim().slice(0, 24) || randomGuestName();
  return {
    playerId,
    displayName: name,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
  };
}

const ADJECTIVES = ["Swift", "Calm", "Bold", "Clever", "Bright", "Noble"];
const NOUNS = ["Falcon", "Lynx", "Heron", "Otter", "Raven", "Comet"];

function randomGuestName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adjective} ${noun}`;
}
