# QUINTARA

**Build the line. Break the plan. Own the board.**

[![CI](https://github.com/vskrch/Quintara/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/vskrch/Quintara/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D20.11-5fa04e)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/status-playable%20beta-d7ad62)](#project-status)

Quintara is a browser-based strategy board game where cards meet position on a
10 × 10 board. Claim spaces, complete five-in-a-row lines, and protect them from
rival Jacks. Play solo against AI, pass-and-play on one device, or compete online
in private rooms and quick matches.

![Quintara home screen](docs/screenshots/home.png)

## At a glance

| Property | Details |
| --- | --- |
| **Modes** | Solo vs AI · local pass-and-play · online private rooms and quick match |
| **Players** | 2, 3, 4, 6, 8, 9, 10, or 12 (mode-dependent) |
| **AI** | Easy · Medium · Hard · Expert |
| **Stack** | TypeScript · Next.js 15 · Fastify · WebSocket · Vitest |
| **Platform** | Installable PWA for desktop and mobile browsers |
| **License** | Publicly viewable; not open source |

## Contents

- [Quick start](#quick-start)
- [Screenshots](#screenshots)
- [How to play](#how-to-play)
- [Features](#features)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [npm scripts](#npm-scripts)
- [Testing and quality](#testing-and-quality)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [Security and privacy](#security-and-privacy)
- [Project status](#project-status)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Quick start

Requirements: **Node.js ≥ 20.11** and **npm ≥ 10**.

```bash
git clone https://github.com/vskrch/Quintara.git
cd Quintara
npm run dev
```

Open **http://localhost:3000**.

`npm run dev` installs dependencies and builds the shared packages on first run,
then starts both the web client and the authoritative game server. Press
**Ctrl+C** to stop both.

On macOS you can also double-click **`Start Quintara.command`** in Finder.

### Run the pieces separately

```bash
npm run dev:server   # game server on http://localhost:4000
npm run dev:web      # web client on http://localhost:3000
```

For online play with separate processes, create `apps/web/.env.local`:

```env
NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The one-command launcher sets these defaults automatically. Without
`NEXT_PUBLIC_WS_URL`, the client derives the WebSocket URL from its own origin,
which is useful when both apps sit behind one domain.

## Screenshots

<p align="center">
  <img src="docs/screenshots/game-board.png" alt="Quintara game board with cards, team markers, and hand" width="49%" />
  <img src="docs/screenshots/online-lobby.png" alt="Quintara online lobby with quick match and private room controls" width="49%" />
</p>

## How to play

1. **Play a card.** Select a card from your hand, then claim a matching space on
   the board. A replacement card is drawn automatically.
2. **Build a line.** Five markers in a row — horizontal, vertical, or diagonal —
   completes a sequence.
3. **Protect your lines.** Completed sequences are permanent, and their markers
   cannot be removed by One-Eyed Jacks.
4. **Use the Jacks.** Two-Eyed Jacks (J♣ J♦) place a marker on any empty space;
   One-Eyed Jacks (J♥ J♠) remove an unprotected opponent marker.
5. **Win the race.** Two teams need two sequences; three or more teams need one.

The in-app **Rules** page has the full reference. The normative rules live in
`adr/game_engine_rules.md` (Rules Contract v1.0).

## Features

- **Deterministic rules engine** — pure TypeScript with no UI, network, or
  database dependencies. Same initial state, RNG stream, and ordered actions
  always produce the same final state, enabling byte-exact replays.
- **Four AI difficulties** — Easy, Medium, Hard, and Expert. Bots only use
  information legitimately available to their seat and never inspect hidden
  opponent hands or future deck order.
- **Solo, pass-and-play, and daily challenge** — fully client-side, with
  automatic save/resume, a fixed-seed Daily Challenge, and on-device stats.
- **Authoritative online multiplayer** — private rooms with invite codes and
  optional passwords, configurable turn timers, quick match, reconnect-safe
  sessions, idempotent actions, optimistic concurrency, and per-viewer state
  projection so opponent hands never cross the wire.
- **No account required** — guests receive a device-scoped signed identity, so
  a host can create a room and share an invite code immediately.
- **Server-authoritative turn clocks** — reconnecting or reloading resumes the
  existing deadline instead of granting a fresh turn.
- **PWA and offline play** — installable app shell, offline fallback page, and
  offline-capable solo/tutorial modes.
- **Accessible by design** — keyboard card selection and board focus, screen
  reader labels, reduced-motion support, focus-managed dialogs, and team markers
  that use colour, symbol, and pattern rather than colour alone.
- **Launch basics** — privacy/terms pages, branded error/offline pages,
  canonical URLs, sitemap/robots metadata, and a GitHub Actions verification
  workflow.

## Architecture

```
                ┌──────────────────┐
                │   Next.js PWA    │
                │  Board / UI / UX │
                └────────┬─────────┘
                         │  WebSocket / HTTPS
                ┌────────▼─────────┐
                │ Authoritative    │
                │  Game Server     │
                │ (Fastify + WS)   │
                └───────┬──────────┘
          ┌─────────────┼─────────────┐
 ┌────────▼────────┐    │     ┌───────▼────────┐
 │ Quintara Engine │    │     │  Game Store    │
 │ pure TypeScript │    │     │ (in-memory /   │
 │  (deterministic)│    │     │  pluggable)    │
 └─────────────────┘    │     └────────────────┘
                 ┌──────▼──────┐
                 │  AI package │
                 └─────────────┘
```

### Monorepo layout

```
/packages
  /game-engine    deterministic rules engine (Rules Contract v1.0)
  /game-ai        Easy/Medium/Hard/Expert bots
  /shared-types   client/server protocol types
  /config         board layout + immutable Standard presets
/apps
  /web            Next.js PWA (Tailwind v4, framer-motion, zustand)
  /server         Fastify + WebSocket authoritative game server
/docs
  /screenshots    README screenshots
/scripts          dev launcher, icon generation, WebSocket smoke test
```

The engine package must not import React, DOM, WebSocket, database, or CSS code.
This boundary is what makes local play, server validation, AI simulation, and
replay verification share the exact same rules.

### Documentation

- [`adr/game_engine_rules.md`](adr/game_engine_rules.md) — normative rules
  contract (v1.0)
- [`adr/Game_design_plan.md`](adr/Game_design_plan.md) — product and design
  specification
- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — CI pipeline
- [`docs/screenshots`](docs/screenshots) — screenshots used in this README

## npm scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the server and web client together |
| `npm run dev:web` | Start only the Next.js client |
| `npm run dev:server` | Start only the game server |
| `npm run build:packages` | Build engine, AI, shared types, and config |
| `npm run build` | Production build for packages, server, and web |
| `npm test` | Run all workspace test suites |
| `npm run typecheck` | Strict TypeScript checks across the monorepo |
| `npm run lint` | ESLint |
| `npm run start:server` | Run the built server (`dist/index.js`) |
| `npm run format` | Format with Prettier |

## Testing and quality

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

The suite currently contains **238 automated tests**: 192 engine, 40 server,
and 6 AI tests. CI (`.github/workflows/ci.yml`) runs install, package builds,
lint, typecheck, tests, and the production build on Node 20 and 22 for every
push to `main` and every pull request.

Run a single workspace suite with, for example:

```bash
npm test -w @quintara/game-engine
```

Engine coverage includes board/deck invariants, player configurations and
interleaved turn order, normal card play, Two-Eyed and One-Eyed Jacks, dead-card
exchange, sequence detection in all four directions, wild corners, long-run and
crossing overlap rules, the six-run ambiguous claim, the nine-run double line,
victory-before-draw, reshuffles, turn-skip and stalemate safeguards, viewer
privacy projections, and property-based random games (card conservation,
invariants, legal-action safety, atomic rejections).

Server tests cover wrong-turn rejection, identity binding, idempotent retries,
stale-version rejection, hand privacy over the wire, reconnect recovery, room
lifecycle, public/private history visibility, and replay redaction.

End-to-end transport check against a running server:

```bash
node scripts/ws-smoke.mjs ws://localhost:4000/ws
```

## Game rules summary

- 10 × 10 board: 96 card spaces (each identity appears twice) plus 4 universal
  wild corners.
- Two 52-card decks; Jacks are special:
  - **Two-Eyed (J♣ J♦)** — place a marker on any empty space.
  - **One-Eyed (J♥ J♠)** — remove an unprotected opponent marker.
- Play a card → claim a matching space → draw a replacement automatically.
- Complete **five in a row** horizontally, vertically, or diagonally to score a
  line. Completed lines are permanent and their markers are protected.
- Two competing sides need **2 lines**; three sides need **1**.
- One dead-card exchange per turn; deadness is evaluated dynamically.
- Same-team lines may share at most one space (crossing lines count twice).

The normative rules live in `adr/game_engine_rules.md` (Rules Contract v1.0).
Product and design specifications live in `adr/Game_design_plan.md`.

## Environment variables

### Server

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | HTTP/WebSocket port | `4000` |
| `HOST` | Bind address | `0.0.0.0` |
| `CORS_ORIGIN` | Comma-separated allowed origins, or `true` in dev | `http://localhost:3000` |
| `QUINTARA_AUTH_SECRET` | HMAC secret for player tokens (≥32 chars in production) | ephemeral in dev |
| `TRUST_PROXY` | Trusted proxy hops or proxy IPs for client-IP limits | unset (direct) |

`QUINTARA_AUTH_SECRET` is mandatory when `NODE_ENV=production`. The server
refuses to boot without a real secret and rejects documented placeholder values.
A permissive CORS setting (`CORS_ORIGIN=true`) should only be used locally.

Set `TRUST_PROXY` when the server runs behind the reverse proxy described below
so per-IP rate limits see real client addresses. Leave it unset when the server
is directly exposed.

### Web

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_WS_URL` | WebSocket endpoint, e.g. `wss://game.example.com/ws` |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL used by metadata and the sitemap |

Copy `.env.example` to the relevant location as a starting point.

## Deployment

### Build and run

```bash
npm ci
npm run build
npm run start:server
npm run start -w @quintara/web
```

### Hosting notes

- **Web**: deploy the Next.js app to any Node host (Vercel, Fly.io, Render,
  etc.). The service worker provides the offline shell.
- **Server**: deploy the Fastify process to a Node host (Fly.io, Railway,
  Render, AWS, GCP). Put it behind TLS and a reverse proxy that forwards
  WebSocket upgrades.
- **Persistence**: the default store is in-memory and single-instance. Implement
  the `GameStore` interface in `apps/server/src/store.ts` against PostgreSQL or
  Redis before running multiple instances or relying on durable history.
- **Secrets**: set a random `QUINTARA_AUTH_SECRET` of at least 32 characters.
  Generate one with `openssl rand -base64 48`.
- **Configuration**: set `CORS_ORIGIN`, `NEXT_PUBLIC_WS_URL`,
  `NEXT_PUBLIC_SITE_URL`, and `TRUST_PROXY` for the target environment.
- **Shutdown**: the server handles `SIGTERM`/`SIGINT` gracefully.
- Before a paid launch, replace the placeholder contact addresses on the
  privacy/terms pages and have them reviewed by counsel.

## Security and privacy

- The server is authoritative. Clients send intents; every command is validated,
  version-checked, idempotent, and broadcast as a per-viewer projection.
- Opponent hands, draw-pile order, and RNG state never cross the wire. Public
  replays expose a spectator projection only.
- Public history lists public-room results only. Private-room summaries remain
  replayable by their unguessable game ID for participants, but their player
  names are not published in the shared history feed.
- Guest identity tokens are device-scoped and signed with
  `QUINTARA_AUTH_SECRET`. There are no accounts or password-based logins yet.
- HTTP rate limits are per-process. Multi-instance deployments should add
  gateway- or Redis-backed limits.

To report a security issue, please use GitHub's [private security advisory
flow](https://github.com/vskrch/Quintara/security/advisories/new) rather than
opening a public issue.

## Project status

Quintara is a **playable beta**. Solo, pass-and-play, tutorial, daily challenge,
private online rooms, and quick match are implemented and covered by automated
tests. It is suitable for a private beta or friends-and-family deployment on a
single server instance.

Known limitations before a mass-market competitive launch:

- In-memory persistence: a server restart ends active online matches and loses
  process-local history/replays.
- No accounts, ranked seasons, leaderboards, or skill-based matchmaking.
- No replay viewer UI, although the replay API and storage model exist.
- Three-player Standard games use a three-team layout and are more draw-prone
  than two-team configurations. In a 200-game HARD-bot simulation, 30.5% ended
  in a stalemate. The UI warns about this rather than hiding the valid
  configuration.
- AI difficulty tiers are heuristic, not tournament-calibrated. Treat Expert as
  a strong local opponent, not a ranked benchmark.
- Password hashing uses synchronous `scrypt`; move to async hashing or a worker
  pool before high-concurrency deployments.

### Roadmap

- Durable PostgreSQL/Redis `GameStore` adapter and replay archive
- Accounts, ranked play, seasons, and leaderboards
- Replay browser and shareable match pages
- Async password hashing and distributed rate limiting
- Load testing, observability, and multi-region deployment
- A 3-player variant or house rule that reduces stalemates

## Troubleshooting

### Ports 3000 or 4000 are already in use

`npm run dev` starts both services. Stop the process holding the port, then
retry:

```bash
lsof -i :3000
lsof -i :4000
```

### The online lobby stays disconnected

The web client must be able to reach the game server. Check that the server is
running on port 4000, and that `NEXT_PUBLIC_WS_URL` points at its WebSocket
endpoint (for example `ws://localhost:4000/ws`). The one-command launcher sets
this automatically.

### `npm run typecheck` fails on a fresh clone

The workspace packages must be compiled before other packages can resolve their
types:

```bash
npm run build:packages
npm run typecheck
```

`npm run build` and `npm run dev` do this for you.

### macOS blocks `Start Quintara.command`

Right-click the file in Finder and choose **Open**, or allow it under
**System Settings → Privacy & Security**.

### The production server refuses to start

Set `QUINTARA_AUTH_SECRET` to a random value of at least 32 characters:

```bash
export QUINTARA_AUTH_SECRET="$(openssl rand -base64 48)"
```

The server rejects documented placeholder secrets in production.

## Contributing

Issues and pull requests are welcome. Before opening a PR:

```bash
npm ci
npm run build:packages
npm test
npm run typecheck
npm run lint
npm run build
```

Keep the engine pure: no React, DOM, network, database, or CSS imports in
`packages/game-engine`. New rules behavior should include deterministic tests,
and multiplayer changes should include a privacy/idempotency check where
relevant.

## License

This repository is publicly viewable for portfolio and evaluation purposes. It
is **not open source**: no license is granted for reuse, redistribution, or
derivative works. See `package.json` (`"license": "UNLICENSED"`).
