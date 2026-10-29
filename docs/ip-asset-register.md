# IP Asset Register

This register records the origin, ownership, and licensing status of the
material in the Quintara repository. It is an evidence aid for copyright
registration, trademark filings, and contributor/contractor management. Keep it
current whenever a new asset, font, sound, or dependency is added.

**Owner:** Venkata Sai Krishna Chirasani  
**Repository:** <https://github.com/vskrch/Quintara>  
**Last reviewed:** 28 October 2026

> This register is not a legal document and does not by itself prove ownership.
> Keep source files, dated commits, contracts, and receipts.

## Repository and code

| Asset                  | Location                | Source / author                   | Status                     |
| ---------------------- | ----------------------- | --------------------------------- | -------------------------- |
| Quintara monorepo      | repository root         | Project owner, with AI assistance | Proprietary; see `LICENSE` |
| Game engine            | `packages/game-engine`  | Project owner, with AI assistance | Proprietary                |
| Game AI                | `packages/game-ai`      | Project owner, with AI assistance | Proprietary                |
| Shared types           | `packages/shared-types` | Project owner, with AI assistance | Proprietary                |
| Config / board presets | `packages/config`       | Project owner, with AI assistance | Proprietary                |
| Web client             | `apps/web`              | Project owner, with AI assistance | Proprietary                |
| Game server            | `apps/server`           | Project owner, with AI assistance | Proprietary                |
| CI and scripts         | `.github`, `scripts`    | Project owner, with AI assistance | Proprietary                |

All commits in the reviewed history are authored by `vskrch`. That is a
provenance signal, not proof of human authorship: AI-assisted work is normally
committed under the human operator's name. No third-party copyright headers were
found in the source. This does not prove that no AI-generated snippet resembles
public code; see the AI section below.

## Game expression

| Asset                   | Location                            | Source / author                                              | Status                                                |
| ----------------------- | ----------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| Board layout            | `packages/game-engine/src/board.ts` | Generated deterministically from a fixed seed by the project | Original expression; not copied from a physical board |
| Rules contract          | `adr/game_engine_rules.md`          | Project owner, with AI assistance                            | Original wording; review against Sequence rulebook    |
| Game design plan        | `adr/Game_design_plan.md`           | Project owner, with AI assistance                            | Original                                              |
| Tutorial / in-app rules | `apps/web/src`                      | Project owner, with AI assistance                            | Original wording; review before launch                |
| UI layout and theme     | `apps/web/src`                      | Project owner, with AI assistance                            | Original dark/gold visual identity                    |
| Logo / icon             | `apps/web/public/icon.svg`          | Project owner, with AI assistance                            | Original SVG lattice                                  |
| PWA icons               | `apps/web/public/icons/*.png`       | Generated from `icon.svg` by `scripts`                       | Derived from original SVG                             |
| Screenshots             | `docs/screenshots/*.png`            | Captured from the running app                                | Original UI; no stock images                          |
| Sound effects           | `apps/web/src/lib/sound.ts`         | Synthesized with Web Audio API                               | No audio files; no sampled third-party audio          |

## Fonts

| Asset | Source                               | License     | Notices                     |
| ----- | ------------------------------------ | ----------- | --------------------------- |
| Sora  | Google Fonts / Sora Project Authors  | SIL OFL 1.1 | `docs/licenses/OFL-1.1.txt` |
| Inter | Google Fonts / Inter Project Authors | SIL OFL 1.1 | `docs/licenses/OFL-1.1.txt` |

Fonts are downloaded and self-hosted by `next/font/google` at build time. The
built app redistributes the font files. `next/font` subsets and re-encodes the
font files; the OFL permits this. The Sora and Inter notices do not declare a
Reserved Font Name, so no rename is required. Re-check this if the font
versions or notices change.

## Third-party dependencies

| Category           | Examples                   | License                        | Notices                        |
| ------------------ | -------------------------- | ------------------------------ | ------------------------------ |
| Framework          | Next.js, React             | MIT                            | `docs/third-party-licenses.md` |
| Server             | Fastify, `@fastify/*`      | MIT                            | `docs/third-party-licenses.md` |
| State / animation  | Zustand, framer-motion     | MIT                            | `docs/third-party-licenses.md` |
| CSS tooling        | Tailwind CSS, lightningcss | MIT / MPL-2.0                  | `THIRD_PARTY_NOTICES.md`       |
| Image optimization | sharp / libvips            | Apache-2.0 / LGPL-3.0-or-later | `THIRD_PARTY_NOTICES.md`       |
| Browser data       | caniuse-lite               | CC-BY-4.0                      | `THIRD_PARTY_NOTICES.md`       |

The full inventory is `docs/third-party-licenses.md`. Version pins are in
`package-lock.json`. Re-run the inventory when dependencies change.

## Brand

| Asset                  | Status                                      | Notes                                                                              |
| ---------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| QUINTARA word mark     | Common-law claim; no registration claimed   | Adverse US Class 9 registration owned by Brilliant Systems LLC; see `TRADEMARK.md` |
| Quintara lattice logo  | Copyright claim; common-law trademark claim | Original SVG                                                                       |
| `quintara.game`        | Not owned by the project at review time     | Do not use as canonical URL until registered                                       |
| Other Quintara domains | Registered by others                        | Do not use without permission                                                      |
| Social handles         | Not verified                                | Secure consistent handles before launch                                            |

## AI assistance and provenance

The repository was built with substantial AI assistance, while human creative
direction, selection, editing, integration, testing, and review were
predominant. The full position is in
[`ai-assistance-disclosure.md`](ai-assistance-disclosure.md). For each key
asset, record:

- the tool and model used;
- the prompt or brief;
- the human edits and creative decisions;
- the date and author of the final version;
- any similarity review or license scan performed.

Do not register AI-only material as solely human-authored. Keep prompt logs and
version history. For core brand assets, prefer human-created or
human-commissioned work with a written IP assignment.

## Contracts and evidence to keep

- Contractor, artist, and developer agreements with IP assignments and
  moral-rights waivers.
- Employment agreements if anyone works on the project as an employee.
- Written permission for any third-party asset, font, or dataset.
- Receipts for domain names, registrations, and licenses.
- Dated repository tags for each release.
- Copyright registration certificates and trademark filing receipts.
- Records of first publication (app-store listing, website launch, press kit).
- The AI-assistance disclosure and any prompt/design logs.
- The litigation-response file described in `defense-playbook.md`.

## Gaps

- No copyright registration has been filed.
- No trademark clearance or filing has been completed.
- No formal patent freedom-to-operate search has been completed.
- The project owner's exact legal name/entity, province, and contact address
  should be confirmed before filings.
- AI tool terms and output provenance have not been audited.
- App-store, social-handle, and foreign trademark availability have not been
  searched.
