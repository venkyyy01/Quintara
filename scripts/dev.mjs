#!/usr/bin/env node
/**
 * One-command local launcher: starts the authoritative server and the web
 * client together, installs/builds on first run, and stops both on Ctrl+C.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const env = {
  ...process.env,
  NEXT_PUBLIC_WS_URL:
    process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000/ws",
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

function run(args, options = {}) {
  return spawn(npm, args, {
    cwd: root,
    stdio: "inherit",
    env,
    detached: process.platform !== "win32",
    ...options,
  });
}

function waitForExit(child) {
  return new Promise((resolvePromise, rejectPromise) => {
    child.on("error", rejectPromise);
    child.on("exit", (code, signal) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`exited with ${code ?? signal}`));
    });
  });
}

function kill(child) {
  if (!child.pid || child.exitCode !== null) return;
  try {
    if (process.platform === "win32") child.kill("SIGTERM");
    else process.kill(-child.pid, "SIGTERM");
  } catch {
    // The process already exited.
  }
}

async function ensureSetup() {
  if (!existsSync(resolve(root, "node_modules"))) {
    console.log("\n[quintara] Installing dependencies (first run)…\n");
    await waitForExit(run(["install"]));
  }
  if (!existsSync(resolve(root, "packages/game-engine/dist/index.js"))) {
    console.log("\n[quintara] Building shared packages (first run)…\n");
    await waitForExit(run(["run", "build:packages"]));
  }
}

try {
  await ensureSetup();
} catch (error) {
  console.error(`\n[quintara] Setup failed: ${error.message}\n`);
  process.exit(1);
}

console.log(`
[quintara] Starting server and web client…
[quintara] Web:    http://localhost:3000
[quintara] Server: http://localhost:4000
[quintara] Press Ctrl+C to stop both.
`);

const children = [run(["run", "dev:server"]), run(["run", "dev:web"])];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) kill(child);
  setTimeout(() => process.exit(code), 400);
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

for (const child of children) {
  child.on("exit", (code, signal) => {
    if (stopping) return;
    console.error(
      `\n[quintara] A dev process stopped (${code ?? signal}). Shutting down the other.\n`,
    );
    stop(code ?? 1);
  });
}
