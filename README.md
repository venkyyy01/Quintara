# QUINTARA

**Build the line. Break the plan. Own the board.**

Quintara is a production-quality browser-based strategy board game: cards meet
position on a 10 × 10 board, where players claim spaces, complete five-in-a-row
lines and protect them from rival Jacks. Play solo against AI, local
pass-and-play, or online in private rooms and quick matches.

## Features

- **Deterministic rules engine** — pure TypeScript, zero UI/database/network
  code, with a comprehensive rule test suite (board, deck, Jacks, dead cards,
  sequence overlap, protection, victory, reshuffles, property tests) and
  byte-exact replay of recorded command streams (`replayCommands`, §102).
- **Four AI difficulties** (Easy / Medium / Hard / Expert) that never inspect
  hidden opponent hands.
- **Local pass-and-play** with handoff privacy screens, and **solo vs AI** —
  all offline-capable, with automatic save/resume, a fixed-seed **Daily
  Challenge**, and on-device stats/history.
- **Online multiplayer** — authoritative server, private rooms with invite
  codes and optional passwords, configurable turn timers, quick match,
  reconnect-safe, idempotent actions, optimistic concurrency, per-viewer state
  projection (opponent hands never cross the wire).
- **PWA** — installable, standalone display, offline app shell and offline
  fallback page, plus an in-app “new version ready” refresh flow.
- **Premium responsive UI** — dark-graphite design system, vector card art,
  team markers with colour + symbol + pattern (never colour alone), reduced
  motion support, keyboard/screen-reader labels, focus-managed dialogs.
- **Launch basics** — privacy/terms pages, branded 404/error/offline pages,
  robots/sitemap/Open Graph metadata, and a GitHub Actions verification
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
  /game-ai        Easy/Medium/Hard/Expert bots (§22 heuristics + sampling)
  /shared-types   client/server protocol types
  /config         board layout + immutable Standard presets
/apps
  /web            Next.js PWA (Tailwind v4, framer-motion, zustand)
  /server         Fastify + WebSocket authoritative game server
/scripts          icon generation, WebSocket smoke tests
```

The engine package must not import React, DOM, WebSocket, database or CSS
code — `same initial state + same RNG stream + same ordered actions = same
final state`.

## Getting started

Requirements: Node.js ≥ 20.11, npm ≥ 10.

```bash
npm install
npm run build:packages     # build engine, AI, shared-types, config
npm run dev:web            # web client on http://localhost:3000
npm run dev:server         # game server on http://localhost:4000
```

For online play the web client needs the server URL:

```bash
# apps/web/.env.local
NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws
# Used for canonical links, sitemap and Open Graph metadata in production.
NEXT_PUBLIC_SITE_URL=https://your-domain.example
```

Without `NEXT_PUBLIC_WS_URL` the client derives the WebSocket URL from its own
origin (useful when both are served behind one domain).

Copy `.env.example` to the relevant location as a starting point.

### Environment variables (server)

| Variable               | Purpose                                              | Default                 |
| ---------------------- | ---------------------------------------------------- | ----------------------- |
| `PORT`                 | HTTP/WS port                                         | `4000`                  |
| `HOST`                 | Bind address                                         | `0.0.0.0`               |
| `CORS_ORIGIN`          | Comma-separated allowed origins, or `true` in dev    | `http://localhost:3000` |
| `QUINTARA_AUTH_SECRET` | HMAC secret for player tokens (≥32 chars in prod)    | ephemeral (dev only)    |
| `TRUST_PROXY`          | Trusted proxy hops or proxy IPs for client-IP limits | unset (direct)          |

`QUINTARA_AUTH_SECRET` is mandatory when `NODE_ENV=production`: the server
refuses to boot without it. A permissive CORS setting (`CORS_ORIGIN=true`)
should only be used for local development.

## Testing

```bash
npm test                   # all workspaces
npm run typecheck          # strict TypeScript across the monorepo
npm run lint               # ESLint
npm run build              # packages + server + Next.js production build
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and the production
build on Node 20 and 22 for every push to `main` and every pull request.

Engine coverage includes every mandated rules test: board/deck invariants,
player configurations and interleaved turn order, normal card play, Two-Eyed
and One-Eyed Jacks, dead-card exchange, sequence detection in all four
directions, wild corners, long-run and crossing overlap rules, the six-run
ambiguous claim, the nine-run double line, victory-before-draw, reshuffles,
turn-skip and stalemate safeguards, viewer privacy projections and
property-based random games (card conservation, invariants, legal-action
safety, atomic rejections).

Server tests cover the mandated multiplayer behaviours: wrong-turn rejection,
identity binding, idempotent retries, stale-version rejection, hand privacy
over the wire and reconnect recovery.

End-to-end transport check against a running server:

```bash
node scripts/ws-smoke.mjs ws://localhost:4000/ws
```

## Game rules summary

- 10 × 10 board: 96 card spaces (each identity twice) + 4 universal wild
  corners.
- Two 52-card decks; Jacks are special:
  - **Two-Eyed (J♣ J♦)** — place a marker on any empty space.
  - **One-Eyed (J♥ J♠)** — remove an unprotected opponent marker.
- Play a card → claim a matching space → draw a replacement automatically.
- Complete **five in a row** (horizontal/vertical/diagonal) to score a line;
  lines are permanent and their markers protected.
- Two competing sides need **2 lines**; three sides need **1**.
- One dead-card exchange per turn; deadness is dynamic.
- Same-team lines may share at most one space (crossing lines count twice).

The full normative rules live in `adr/game_engine_rules.md` (Rules Contract
v1.0); product and design specifications live in `adr/Game_design_plan.md`.

## Deployment

- **Web**: any static/Node host (Vercel, Netlify, Fly.io). `next build`
  produces a static-first app; the service worker provides offline support.
- **Server**: Node host (Fly.io, Railway, Render, AWS, GCP). `npm run build -
  w @quintara/server && npm run start -w @quintara/server`. Scale via
  WebSockets; for multi-instance deployments implement the `GameStore`
  interface in `apps/server/src/store.ts` against PostgreSQL/Redis (the
  in-memory store is the single-instance default).
- Set `QUINTARA_AUTH_SECRET` (≥32 characters), `CORS_ORIGIN`,
  `NEXT_PUBLIC_WS_URL` and `NEXT_PUBLIC_SITE_URL` for the target environment.
  Set `TRUST_PROXY` to the number of trusted reverse-proxy hops (or a
  comma-separated proxy IP list) so per-IP rate limits see real client
  addresses. Leave it unset when the server is directly exposed.
- Put the server behind TLS (`wss://`) and a reverse proxy that forwards
  WebSocket upgrades. The process handles `SIGTERM`/`SIGINT` with a graceful
  shutdown.
- Before a paid launch, replace the placeholder contact addresses on the
  privacy/terms pages and review them with counsel.

## Known limitations

- Persistence is in-memory by default (single instance); the `GameStore`
  interface is the seam for a PostgreSQL/Redis adapter. Guest tokens and local
  saves are device-scoped.
- Ranking/seasons, accounts (email/OAuth), replay viewer UI and achievements
  are architected for but intentionally deferred beyond this release.
- The turn timer auto-action policy is versioned ("policy v1"): winning move →
  block opponent win → first deterministic legal action.
- Three-player Standard games use a three-team layout and are more draw-prone
  than 2/4/6-player games; the UI warns about this rather than hiding the
  valid configuration.
- AI difficulty tiers are heuristic, not tournament-calibrated or guaranteed
  to be strictly transitive. Treat Expert as a strong local opponent, not a
  ranked benchmark.
- Online rooms are ephemeral. A server restart ends active online matches;
  local save/resume is intentionally local-only.
- Public history lists only public-room results. Private-room summaries stay
  replayable by their unguessable game ID for participants, but their player
  names are not published in the shared history feed.
