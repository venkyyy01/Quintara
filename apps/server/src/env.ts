/**
 * Minimal .env loader for local/server deployments.
 *
 * The package start script runs from `apps/server`, so a `.env` next to the
 * package is the natural place for PORT, CORS_ORIGIN and
 * QUINTARA_AUTH_SECRET. Environment variables already supplied by the host
 * always win (matching dotenv semantics), and a missing file is harmless.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const candidates = [
  resolve(process.cwd(), ".env"),
  // Works from both src/ during development and dist/ after a build.
  fileURLToPath(new URL("../.env", import.meta.url)),
];

const envPath = candidates.find((candidate) => existsSync(candidate));
if (envPath) {
  try {
    const contents = readFileSync(envPath, "utf8");
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator <= 0) continue;
      const key = line.slice(0, separator).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      let value = line.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // A malformed/unreadable optional file must not stop the server.
  }
}
