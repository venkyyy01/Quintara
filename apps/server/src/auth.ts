/**
 * Guest-first authentication (§73): HMAC-signed bearer tokens.
 * Guests start immediately; accounts can be layered on later without
 * changing the transport. Tokens are validated server-side on every
 * connection (§74).
 */

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const CONFIGURED_SECRET = process.env.QUINTARA_AUTH_SECRET?.trim();

/**
 * Values shipped in documentation, examples or scaffolding must never be
 * accepted as a real signing key. Without this check the example value in
 * `.env.example` (which is long enough to pass a length test) would let
 * anyone forge a guest token for another player.
 */
const PLACEHOLDER_SECRETS = new Set([
  "replace-with-a-long-random-string",
  "change-me",
  "changeme",
  "secret",
  "your-secret-here",
  "development-secret",
]);

if (
  process.env.NODE_ENV === "production" &&
  (!CONFIGURED_SECRET ||
    CONFIGURED_SECRET.length < 32 ||
    PLACEHOLDER_SECRETS.has(CONFIGURED_SECRET.toLowerCase()))
) {
  throw new Error(
    "QUINTARA_AUTH_SECRET must be a non-placeholder secret of at least 32 characters in production.",
  );
}

if (
  CONFIGURED_SECRET &&
  PLACEHOLDER_SECRETS.has(CONFIGURED_SECRET.toLowerCase())
) {
  console.warn(
    "[quintara] QUINTARA_AUTH_SECRET is a documented placeholder — set a real random secret before deploying.",
  );
}

const SECRET =
  CONFIGURED_SECRET && CONFIGURED_SECRET.length > 0
    ? CONFIGURED_SECRET
    : (() => {
        // Generated at boot for single-instance development. Production must
        // set QUINTARA_AUTH_SECRET so tokens survive restarts.
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
    if (typeof payload.playerId !== "string" || payload.playerId.length > 128) {
      return null;
    }
    if (
      typeof payload.displayName !== "string" ||
      payload.displayName.length > 64
    ) {
      return null;
    }
    if (
      typeof payload.expiresAt !== "number" ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt < Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function createGuest(displayName?: string): TokenPayload {
  // Full UUID: 122 bits of entropy. Short prefixes collide at scale and a
  // collision would let two guests share a seat/hand projection.
  const playerId = `guest-${randomUUID()}`;
  const name = sanitiseDisplayName(displayName) || randomGuestName();
  return {
    playerId,
    displayName: name,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
  };
}

/**
 * Strips control/bidi characters, normalises whitespace and bounds length.
 * React escapes output, but names also flow into logs, replays and exports.
 */
export function sanitiseDisplayName(displayName?: string): string {
  return (displayName ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
}

const ADJECTIVES = ["Swift", "Calm", "Bold", "Clever", "Bright", "Noble"];
const NOUNS = ["Falcon", "Lynx", "Heron", "Otter", "Raven", "Comet"];

function randomGuestName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adjective} ${noun}`;
}
