# Quintara — Legal and IP Risk Review

**Review date:** 28 October 2026  
**Scope:** the public Quintara repository, its game concept, assets, dependencies,
branding, and planned web deployment.  
**Prepared for:** Venkata Sai Krishna Chirasani (the project owner).

> **This is not legal advice.** I am not a lawyer. This is a practical
> engineering and IP-hygiene review based on public sources and the repository
> as it exists today. It does not create an attorney-client relationship, does
> not guarantee freedom to operate, and does not replace a formal clearance
> search, copyright registration, trademark filing, patent search, or review by
> counsel in Canada, the United States, India, or any other target market.
> Before a commercial launch, have an IP attorney review this document and the
> final branding. The risk ratings below are engineering estimates, not legal
> opinions. Legal propositions are attributed to the cited sources and should be
> confirmed by counsel for the relevant jurisdiction.

## Executive summary

Quintara is a browser-based line-building game that is mechanically close to
the commercial board game _Sequence_. The good news is that game **mechanics and
rules are generally not protected by copyright** in Canada and the United
States. The larger risks are:

1. **The QUINTARA name.** A live US trademark registration for QUINTARA exists
   in Class 9 (software), owned by an unrelated company. A browser game is
   software, so this is the highest-priority brand risk.
2. **Expressive similarity to Sequence.** The mechanics are not the problem;
   copied board art, card art, rulebook wording, trade dress, or marketing that
   suggests affiliation would be.
3. **AI-generated material.** A significant portion of the repository appears
   to be AI-assisted. Purely AI-generated code, art, and text may not be
   protectable by copyright, and the human-authorship boundary is uncertain.
4. **No copyright registrations.** Registration is not required to own
   copyright, but it is important for enforcement, especially in the US.
5. **Privacy and consumer-law compliance.** The app collects display names,
   guest identifiers, and hosting logs. A beta can be lean, but a public launch
   needs accurate notices, a contact channel, and a lawful basis.

| Area                             | Current risk           | Direction                                                                                                                                 |
| -------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| QUINTARA trademark               | **High / medium-high** | Clearance search and a keep-or-rebrand decision are needed before spending on branding.                                                   |
| Sequence copyright / trade dress | **Medium**             | Mechanics are not protected; keep all expression original and avoid the Sequence name in branding.                                        |
| AI-generated content ownership   | **Medium-high**        | Document human authorship; use human-created or human-directed assets for key material.                                                   |
| Copyright enforcement            | **Medium**             | Register the code, art, and rules with the US Copyright Office and CIPO.                                                                  |
| Patent                           | **Low**                | The core Sequence patents appear expired; a formal FTO search is still prudent.                                                           |
| Dependency licenses              | **Low**                | MIT/Apache/ISC/BSD dominate; LGPL/MPL/CC-BY notices are now included.                                                                     |
| Domain and metadata              | **Medium**             | The app defaulted to `quintara.game`, which the project does not own. Fixed in code; the production value must be set to an owned domain. |
| Privacy / terms                  | **Medium**             | Pages improved; a real contact channel, jurisdiction, and counsel review are still needed.                                                |
| Security                         | **Medium**             | Security policy added; a beta should still get a focused review before public launch.                                                     |
| Repo licensing                   | **Low-medium**         | Proprietary LICENSE, contribution terms, and trademark policy added.                                                                      |

## 1. What was reviewed

- Git history and commit authorship.
- Tracked assets (SVG, PNG, screenshots, fonts, audio).
- Source references to external URLs, fonts, images, and audio.
- `package.json`, workspace manifests, and `package-lock.json`.
- Installed dependency licenses (294 third-party packages after excluding
  workspace packages).
- Board generation and game rules documentation.
- README, privacy page, terms page, metadata, robots, and sitemap.
- Public trademark, patent, domain, and case-law sources listed at the end.

I did **not** perform a formal trademark clearance search, a patent
freedom-to-operate opinion, a source-code provenance scan, an artwork
similarity search, an app-store name search, a security audit, or a legal
review of the final privacy/terms text.

## 2. Copyright

### 2.1 What copyright protects

Copyright protects original expression fixed in a tangible medium: source code,
rules text, artwork, card faces, board design, UI, music, sound recordings,
videos, and marketing copy. It does **not** protect ideas, game mechanics,
methods of play, or functional rules as such. This distinction comes from
_Baker v. Selden_, 101 U.S. 99 (1879), and is applied to games in cases such as
_Atari, Inc. v. Amusement World, Inc._, 547 F. Supp. 222 (D. Md. 1981), and
_DaVinci Editrice S.R.L. v. Ziko Games, LLC_, 183 F. Supp. 3d 820 (S.D. Tex.
2016).

The practical line:

- **Generally not protectable:** the idea of a 10×10 board, matching cards to
  spaces, five-in-a-row, wild corners, Jacks with special powers, two sequences
  to win, and the general turn structure.
- **Protectable:** the particular board artwork, card art, card back, logo,
  rulebook wording and organization, UI layout, animations, sounds, tutorial
  text, marketing copy, and trade dress.

_Tetris Holding, LLC v. Xio Interactive, Inc._, 863 F. Supp. 2d 394 (D.N.J.
2012), shows that copying the look and feel of a game can infringe even when
the underlying mechanics are functional. _Spry Fox LLC v. LOLApps Inc._ (W.D.
Wash. 2012) reached a similar result for a close clone.

### 2.2 How close is Quintara to Sequence?

The reviewed rules are mechanically very close to _Sequence_: a 10×10 board,
two decks, four wild corners, five-in-a-row, two-eyed and one-eyed Jacks, and
two sequences for two teams but one for three or more teams. That similarity is
a **mechanics** similarity, which is generally permitted. The risk rises if
Quintara copies Sequence's **expression**:

- the exact board layout and color scheme;
- card faces, card backs, chip design, or box art;
- rulebook wording, examples, diagrams, or tutorial scripts;
- the Sequence logo, trade dress, or distinctive visual identity;
- marketing copy that says or implies "Sequence" or "official" / "authorized."

The repository shows positive evidence of independent expression:

- the board is generated deterministically from a fixed seed in
  `packages/game-engine/src/board.ts`, rather than copied from a physical board;
- the logo/icon is an original SVG lattice;
- the UI uses a distinct dark/gold visual identity;
- the rules contract is written as an original engineering specification;
- sounds are synthesized with the Web Audio API, not sampled from another game;
- commit metadata shows `vskrch` as the author and no third-party copyright
  headers were found. Commit authorship is a provenance signal, not proof of
  human authorship; the project discloses substantial AI assistance in
  [`ai-assistance-disclosure.md`](ai-assistance-disclosure.md).

That evidence helps, but it is not a legal conclusion. A side-by-side review of
the final rulebook, board, cards, and store listing by counsel is still wise.

### 2.3 The Sequence trademark and enforcement history

_Sequence_ is a registered US trademark: Registration No. 1,922,191, Class 28
(board games), filed 16 December 1993 and registered 26 September 1995. The
original registrant was Jax Ltd., Inc.; the current owner is **Goliath IP
Stichting**. Goliath acquired Jax and now owns the _Sequence_ business. In 2015,
Jax filed a legal claim against the developer of a rhythm video game also called
_Sequence_; the developer renamed the game to _Before the Echo_ rather than fight
the claim. Goliath IP Stichting is still actively enforcing the mark: it opposed
the "SEQUENCE KING" application (US Serial No. 99520014) in 2026. That is a
current, not historical, enforcement risk.

This does not mean the word "sequence" is forbidden in ordinary descriptive
language. It does mean:

- do **not** name the game "Sequence," "Sequence Online," "Sequence Clone," or
  anything confusingly similar;
- do **not** use the Sequence logo, board art, card art, or trade dress;
- do **not** use "Sequence" in app-store metadata, domain names, social
  handles, or paid advertising in a way that suggests affiliation;
- a factual sentence such as "Quintara is an independent line-building game
  inspired by classic sequence-building games" is lower risk than "Quintara is
  like Sequence" or "the new Sequence." Keep descriptive references factual and
  minimal, and include a non-affiliation disclaimer.

### 2.4 AI-generated content and authorship

The repository was built with substantial AI assistance, while human creative
direction, selection, editing, integration, testing, and review were
predominant. The project records that position in
[`ai-assistance-disclosure.md`](ai-assistance-disclosure.md). Under current US
Copyright Office guidance, copyright protects only material authored by a
human. Purely AI-generated code, art, or text is not protected; human selection,
arrangement, editing, and creative direction may be protected, but the boundary
is fact-specific. The D.C. Circuit affirmed the human-authorship requirement in
_Thaler v. Perlmutter_ (2025). Canada and India have not settled AI authorship
with the same clarity, but both require an original work connected to a human
author.

Practical consequences:

- Do not assume the entire repository is automatically owned by the project
  owner merely because an AI tool generated it.
- Keep records of human contributions: prompts, design decisions, edits,
  reviews, and the final human-authored changes.
- For key assets (logo, card art, rulebook, tutorial, store art), use
  human-created or human-directed work with a written IP assignment.
- Check the terms of the AI tools used (model provider, coding assistant,
  image generator) for ownership, indemnity, and output restrictions.
- If a coding assistant was used, enable duplicate-code filtering where
  available and scan for copied license headers or recognizable third-party
  snippets.
- Do not represent AI-only output as exclusively human-authored in a copyright
  registration. Disclose AI-generated material as required by the registration
  process.

This is one of the most important "idea-wise" risks: the game may be legally
distinct from Sequence, yet the project owner may still have a thin copyright
portfolio if most of the expression was AI-generated.

### 2.5 Copyright registration

Copyright exists automatically on creation, but registration matters:

- **United States:** registration (or refusal) is a prerequisite to filing an
  infringement suit for US works (_Fourth Estate Public Benefit Corp. v.
  Wall-Street.com, LLC_, 586 U.S. 296 (2019)). Timely registration — before
  infringement or within three months of first publication — can unlock
  statutory damages and attorney's fees under 17 U.S.C. § 412.
- **Canada:** registration with CIPO is optional but provides a certificate and
  useful evidence. Canada also has statutory damages and moral rights.
- **India:** registration with the Copyright Office is optional but useful
  evidence; the Copyright Act, 1957, protects original works.

Recommended registrations, using the correct legal name or company:

1. The source code as a literary work (with deposit material redacted as
   permitted).
2. The rules contract and tutorial text as literary works.
3. The logo/icon and board/card art as artistic works.
4. The website/UI screenshots or a compilation of the visual presentation, if
   strategically useful.

Keep dated copies, repository tags, and a record of first publication. If a
company is formed, assign the IP from the individual to the company in writing.

### 2.6 Repository license

The repository is public, but public visibility is not open source. The root
`package.json` says `"license": "UNLICENSED"`. A proprietary `LICENSE` file has
been added with an "all rights reserved" notice and a limited permission to view
and fork within GitHub. The license now states that the owner claims rights only
"to the extent copyright and other rights subsist" and owned, and it includes an
AI-assisted-material carve-out and a third-party/LGPL carve-out. GitHub's Terms
of Service still allow users to view and fork public repositories; the license
cannot override GitHub's platform terms, but it does put viewers on notice that
reuse is not permitted.

If the project later wants community reuse, choose a real license deliberately
(for example, MIT, Apache-2.0, or a source-available license). Do not add an
open-source license by accident.

## 3. Trademark

### 3.1 QUINTARA search findings

A public search found:

- **USPTO serial 78346997 — QUINTARA**, Registration No. 2,937,944, owned by
  Brilliant Systems LLC. Filed 31 December 2003; registered 5 April 2005;
  renewed 17 August 2025. Class 9, for computer software for storing email on a
  server computer. This is a live registration for a software product.
- **QUINTARA BIOSCIENCES**, a pending mark in Class 42 for scientific/technology
  services (unrelated field).
- No live US Class 28 (board games) registration for QUINTARA was found in the
  public search.
- Other companies and domains use "Quintara" in unrelated fields (biosciences,
  real estate/street names, etc.).

This is not a formal clearance search. It did not cover every US state
registration, common-law use, Canada, the EU, the UK, India, Australia, Japan,
Korea, China, app stores, or social handles.

### 3.2 Why the Class 9 registration matters

A browser-based game is software. If Quintara is distributed as an installable
PWA, a downloadable app, or a hosted service with downloadable components, the
USPTO and a court could treat it as goods/services in Class 9 (downloadable
software) and/or Class 41 (online game services). An identical word mark in
Class 9 for software creates a real likelihood-of-confusion risk, even though
email-server software and a game are different products. The USPTO examines
the similarity of the marks and the relatedness of the goods/services; "both
are software" can be enough for a refusal or an opposition.

A trademark search is not a yes/no answer. It is a risk assessment. The
practical options are:

1. **Keep QUINTARA and get a written clearance opinion.** File in Classes 28
   and 41 first, consider whether Class 9 is necessary, use a distinctive logo,
   and be prepared for a USPTO refusal or a coexistence discussion. This is the
   lowest-cost path short-term but carries the most brand risk.
2. **Rebrand now to a coined name with a clean search.** This is usually the
   best long-term option if the game will be commercialized. It avoids building
   goodwill in a name someone else already registered for software.
3. **Use a composite mark** (for example, a distinctive logo plus a word mark)
   to reduce, but not eliminate, confusion risk. A composite mark does not make
   an identical word mark safe.
4. **Seek a coexistence agreement** with Brilliant Systems LLC. This is
   possible but usually requires counsel and may not be worth it for a beta.

Do not file a trademark application until counsel has reviewed the search. A
filing fee is small compared with the cost of an opposition or a rebrand after
launch.

### 3.3 Classes and jurisdictions

For a game business, the core classes are:

- **Class 9:** downloadable game software, mobile apps, installable PWA.
- **Class 28:** board games, card games, physical game equipment.
- **Class 41:** online game services, entertainment, competitions, streaming.

If the project is Canada-first, file with CIPO. If the US is a target market,
file with the USPTO (use-based or intent-to-use). Consider the EU (EUIPO), UK
(UKIPO), and India (IP India) if those are target markets. The Madrid Protocol
can centralize later filings, but a US or Canadian base application is usually
the starting point.

Use **™** now. Use **®** only after a registration issues in the relevant
jurisdiction. Do not claim "registered trademark" without a registration.

### 3.4 Trade dress and visual identity

Trade dress protects the overall look of a product if it is distinctive and
non-functional. A 10×10 grid with card identities is largely functional, but
the following can be protected as trade dress or copyright:

- the board's color palette, typography, and decorative elements;
- chip/marker shape and colors;
- card faces and card backs;
- the logo and icon;
- the overall UI skin and animation style;
- packaging and store art.

Quintara's dark/gold palette, lattice logo, and modern UI are visually distinct
from Sequence's classic blue board and primary-color chips. Keep it that way.
Do not add "retro Sequence-style" board art, chip shapes, or card backs.

### 3.5 Recommended brand actions

- Commission a full clearance search for QUINTARA in Canada, the US, the EU,
  the UK, and India, in Classes 9, 28, and 41, plus app-store and domain
  searches.
- Decide keep-or-rebrand before spending on a logo, domain, trailer, or app
  store listing.
- If keeping the name, register `quintara.game` and defensive domains only
  after the clearance opinion; do not build the brand on a domain someone else
  owns.
- Secure consistent social handles.
- Add the non-affiliation disclaimer to the README, app footer, store listing,
  and press kit.
- Monitor for confusingly similar games and domains; send a cease-and-desist
  for clear copying of expression or branding, not for the underlying mechanic.

## 4. Patents

### 4.1 Search log and findings

The public search focused on the Sequence/Reuter/Jax/Goliath family and on the
core line-building mechanic. The results were:

| Patent / application                 | Title                                                       | Inventor / assignee                                             | Status                | Relevance to Quintara                                                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **US5029871A**                       | Sequence board game                                         | Burt Willson, Jr.; Donna Willson                                | Expired — fee related | Describes a sequence board game. Expired; no current exclusivity.                                                                                      |
| **US6746017B2**                      | Sequence tile board game                                    | Brian Yu; Jonathan Bedford; Mattel, Inc.                        | Expired — lifetime    | Tile-based sequence game. Expired; not a Reuter/Jax patent.                                                                                            |
| **US7828293B1**                      | Seek and find game with shifting three-dimensional underlay | Alan Pruzan; Andrew Forrest; Jay Wheatley; Goliath IP Stichting | Active                | Unrelated seek-and-find/box-underlay game. Does not claim the Quintara line-building mechanic.                                                         |
| No Reuter-assigned US patent located | —                                                           | Douglas Reuter                                                  | —                     | A targeted inventor search did not locate a Reuter-assigned US patent for Sequence. This is a negative search result, not proof that no patent exists. |
| EU/EM filings by Goliath             | Board-game box designs                                      | Goliath IP Stichting                                            | Registered designs    | Packaging/box appearance, not the core mechanic.                                                                                                       |

No live US patent covering the basic Sequence mechanic was found. Game rules as
such are also vulnerable to patent-eligibility challenges after _Alice Corp. v.
CLS Bank International_, 573 U.S. 208 (2014). That said, patents can cover
specific technical implementations: networked matchmaking, deterministic replay,
anti-cheat, AI decision systems, UI interactions, or server architecture.

### 4.2 Limits of this search

This was a public, targeted search, not a freedom-to-operate opinion. It did not
cover every patent family, continuation, foreign counterpart, pending
application, or non-patent prior-art source. Patent claims are construed by
courts and can change during prosecution. A formal FTO search is recommended
before a commercial launch, especially if the project adds novel technical
features.

If there is a genuinely new technical invention, talk to a patent attorney
**before public disclosure**. The US and Canada have limited grace periods; many
jurisdictions (including the EU, UK, and India) have absolute-novelty rules, so a
public repo or demo can destroy patentability.

The core idea is old. Do not spend money trying to patent "five in a row with
cards." Spend it on brand clearance, copyright registration, and original
expression instead.

## 5. Third-party licenses, fonts, and assets

### 5.1 Dependencies

The installed tree on the review machine (macOS arm64) contains 294 third-party
npm packages. The dominant licenses are MIT, Apache-2.0, ISC, BSD-2-Clause, and
BSD-3-Clause. Platform-specific optional dependencies vary by operating system
and CPU, so the inventory is a local snapshot, not an authoritative
cross-platform list. Notable items:

- **`@img/sharp-libvips-darwin-arm64@1.3.4` — LGPL-3.0-or-later.** Used by
  `sharp` through Next.js image optimization. If a built binary/container is
  distributed, include the LGPL/GPL notices, make corresponding source
  available, and preserve the ability to replace/relink the LGPL component.
- **`lightningcss@1.32.0` and its platform binary — MPL-2.0.** Build-time CSS
  transformation. No modifications. If modified, publish the modified file's
  source under MPL.
- **`caniuse-lite` — CC-BY-4.0.** Build-time browser data. Attribution is
  included.
- **Apache-2.0 components.** Preserve any `NOTICE` files in distributions and
  include the Apache-2.0 text.
- No AGPL, SSPL, or GPL-only runtime dependency was found. The LGPL component
  is the main copyleft item.

`THIRD_PARTY_NOTICES.md`, `docs/third-party-licenses.md`, and
`docs/licenses/` capture the notices and canonical texts. The same texts are
served in-app at `/licenses` from `apps/web/public/licenses/`. Re-run the
inventory on every target platform whenever dependencies change.

### 5.2 Fonts

Sora and Inter are licensed under the SIL Open Font License 1.1. Next.js
self-hosts them at build time, so the built app redistributes the font files.
`next/font` subsets and re-encodes the font files; the OFL permits this, and the
Sora and Inter notices do not declare a Reserved Font Name, so no rename is
required. The OFL text and both copyright notices are included in
`docs/licenses/OFL-1.1.txt` and referenced in `THIRD_PARTY_NOTICES.md`.

### 5.3 Assets and audio

Tracked assets are limited to the original SVG icon, PWA PNG icons generated
from it, and screenshots of the app. No stock photography, third-party
illustration, or sampled audio was found. Sound effects are synthesized with the
Web Audio API, so there are no audio files to license.

If new art, music, or fonts are added later, record the source, license, and
proof of permission in `docs/ip-asset-register.md`.

### 5.4 Workspace package metadata

The workspace packages already declare `"license": "UNLICENSED"`. They should
also be marked `"private": true` to prevent accidental `npm publish`. This
review adds that flag to the shared packages.

## 6. Domain, app stores, and social handles

- `quintara.com`, `quintara.io`, `quintara.co`, `quintara.in`, and
  `quintara.net` are registered by others.
- `quintara.game` appeared unregistered at review time. The app previously used
  it as the default canonical URL even though the project does not own it. That
  is a brand, SEO, and phishing risk. The code now resolves the canonical URL in
  this order: `NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL` →
  `VERCEL_URL` → `http://localhost:3000`. Production must set
  `NEXT_PUBLIC_SITE_URL` to a domain the project owns; the Vercel fallbacks are a
  deployment convenience, not a substitute for a branded domain.
- Do not register a domain that incorporates another company's trademark. If
  the QUINTARA clearance is unfavorable, do not invest in `quintara.game` or
  social handles.
- Check app-store names, package IDs, Steam/itch.io names, and social handles
  before launch. A store listing that uses "Sequence" in the title or keywords
  invites a trademark complaint.

## 7. Privacy, consumer protection, and online safety

The app has no accounts and stores guest identity locally, but online play still
processes personal information:

- display name;
- randomly generated guest identifier;
- room state and game commands;
- IP address and standard request logs at the hosting layer;
- local storage for settings, stats, reconnect tokens, and interrupted games.

### 7.1 Canada (PIPEDA)

PIPEDA applies to personal information collected in commercial activity. The
project should:

- designate a privacy officer (the project owner can be the contact);
- provide a clear privacy policy explaining what is collected, why, how long it
  is kept, and who it is shared with;
- obtain consent where required, or rely on an appropriate exception;
- provide access and correction rights;
- use reasonable safeguards;
- report breaches of security safeguards involving personal information that
  create a real risk of significant harm;
- keep records of breaches and service providers.

If the project targets Quebec, Law 25 adds privacy-program, incident, and
consent requirements. If it targets the EU/UK, GDPR/UK GDPR may apply even
without an establishment if the game is offered to users there. If it targets
California, CCPA/CPRA may apply once the business meets the thresholds.

### 7.2 Children

All modes, including solo, pass-and-play, tutorial, and online play, are **13+**.
The terms and privacy policy use that single minimum consistently. Players aged
13–17 need a parent or guardian to review and agree to the terms. The project
does not knowingly collect personal information from children under 13. If the
project later wants to allow younger players, it needs a COPPA/GDPR-K analysis
and a child-safe design before opening those modes. Do not add chat, profiles, or
user-generated content without a moderation and parental-consent plan.

### 7.3 Terms of service

The existing terms were thin. The updated page adds:

- who the operator is and how to contact them;
- acceptance and eligibility (13+ for all modes);
- a limited license to play;
- IP ownership, an AI-assisted-material carve-out, and a feedback license;
- user-content/display-name rules;
- prohibited conduct;
- availability and changes;
- no warranty and limitation of liability;
- indemnity;
- governing law;
- non-affiliation and trademark notices;
- contact.

These are still beta-level terms. Have Canadian counsel review them before a
paid launch, especially the consumer-law, liability, and governing-law clauses.
If the game is offered in Quebec, French-language requirements and consumer
protection rules may apply. If it is offered in the EU/UK, consumer withdrawal
and unfair-terms rules may apply.

### 7.4 Online safety and platform rules

If the project later adds chat, user profiles, or user-generated content, it may
need:

- a moderation and reporting process;
- a DMCA agent and takedown process (US);
- notice-and-action procedures (EU Digital Services Act);
- online-safety risk assessments (UK Online Safety Act);
- app-store content and privacy disclosures;
- a data processing agreement with hosting providers.

The current beta has no chat or UGC beyond display names, so these are future
considerations, not current blockers.

## 8. Security

`SECURITY.md` now provides a private reporting channel and a good-faith
no-action statement. That statement is not a contract, a waiver of rights, or a
promise that no claim will ever be brought. Before a public launch:

- enable GitHub private vulnerability reporting and secret scanning;
- enable Dependabot or equivalent dependency updates;
- protect the `main` branch and require CI;
- review authentication, rate limits, CORS, WebSocket authorization, and
  replay/privacy boundaries;
- run a focused penetration test or at least a security review;
- keep secrets out of the repo and rotate any exposed token;
- add a privacy/security contact that actually receives mail.

## 9. AI-generated content and provenance

This is a cross-cutting risk, not a separate legal category. The project's
position is recorded in [`ai-assistance-disclosure.md`](ai-assistance-disclosure.md):
substantial AI assistance was used, but human creative direction, selection,
editing, integration, testing, and review were predominant. Recommended
controls:

- maintain `docs/ip-asset-register.md` with the source, author, date, license,
  and AI involvement for each asset;
- keep prompt/design logs for key creative decisions;
- prefer human-authored or human-commissioned art, rules text, and marketing
  copy for the core brand;
- scan the codebase for third-party license headers and recognizable snippets;
- check AI tool terms for ownership, indemnity, and restrictions;
- do not register AI-only material as solely human-authored;
- if an AI output resembles a known work, replace it before launch.

## 10. Risk matrix

| Risk                                                 | Likelihood     | Impact      | Priority | Mitigation                                                           |
| ---------------------------------------------------- | -------------- | ----------- | -------- | -------------------------------------------------------------------- |
| USPTO refusal/opposition based on QUINTARA Class 9   | Medium-high    | High        | 1        | Clearance opinion; consider rebrand; file in Classes 28/41 first.    |
| Goliath trademark complaint over "Sequence" use      | Medium         | High        | 2        | Never use Sequence in branding; factual references only; disclaimer. |
| Copyright claim over board/card/rulebook expression  | Low-medium     | High        | 3        | Keep expression original; side-by-side review; registration.         |
| AI-generated material is unprotectable or infringing | Medium         | Medium-high | 4        | Human authorship records; human-created key assets; provenance scan. |
| Copying by others / inability to enforce             | Medium         | Medium      | 5        | Register copyrights; monitor; DMCA/cease-and-desist.                 |
| Privacy complaint (PIPEDA/GDPR/CCPA)                 | Low-medium     | Medium      | 6        | Accurate policy; contact; data minimization; DPAs.                   |
| Dependency license breach                            | Low            | Medium      | 7        | Notices; LGPL/MPL compliance; inventory on dependency changes.       |
| Domain/metadata points to unowned site               | Medium (fixed) | Medium      | 8        | Set `NEXT_PUBLIC_SITE_URL`; own the domain before launch.            |
| Patent surprise                                      | Low            | Medium-high | 9        | Formal FTO search before monetization.                               |
| Security incident                                    | Medium         | High        | 10       | Security review; monitoring; incident response.                      |

## 11. Action plan

### This week

- [ ] Decide whether to keep the QUINTARA name or rebrand. Do not spend on
      logo/domain/store art until this is decided.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to a domain the project owns (or a temporary
      Vercel URL) and `NEXT_PUBLIC_CONTACT_EMAIL` to a monitored address.
      Production deployments now fail fast if the contact address is missing.
- [ ] Register `quintara.game` only if the clearance decision is to keep the
      name.
- [ ] Enable GitHub private vulnerability reporting, secret scanning, and
      Dependabot.
- [ ] Add the non-affiliation disclaimer to the app footer and store listing.
- [ ] Start a copyright registration file: code, rules text, logo, board/card
      art, and key screenshots. Include the AI-assistance disclosure.
- [ ] Review [`defense-playbook.md`](defense-playbook.md) and keep the evidence
      pack current.
- [ ] Book a trademark clearance search with Canadian/US counsel.

### Before a public launch

- [ ] Full trademark clearance in Canada, the US, the EU, the UK, and India for
      Classes 9, 28, and 41.
- [ ] File trademark applications in the core markets, or rebrand.
- [ ] Formal patent freedom-to-operate search.
- [ ] Counsel review of privacy policy, terms, and consumer-law disclosures.
- [ ] Confirm `NEXT_PUBLIC_CONTACT_EMAIL` reaches a monitored mailbox and that
      privacy requests are handled within the stated timeline.
- [ ] Sign DPAs with hosting/analytics providers; confirm no unexpected
      tracking.
- [ ] Complete the AI provenance record and disclose AI-assisted material in
      any copyright registration.
- [ ] Set a 13+ age gate and a child-safety position for all modes.
- [ ] Security review/penetration test.
- [ ] App-store name, privacy-label, and content-rating review.
- [ ] Accessibility review (WCAG 2.2 AA; EU Accessibility Act if targeting the
      EU).
- [ ] DMCA agent and takedown process if any UGC/chat is added.

### Before monetization

- [ ] Form a company and assign all IP from the individual to the company in
      writing.
- [ ] Insert the operator's province/territory and any legal entity name in the
      terms, LICENSE, and privacy policy before a paid launch.
- [ ] Register copyrights and trademarks in the entity's name.
- [ ] Put contractor, artist, and developer agreements in place with IP
      assignments and moral-rights waivers.
- [ ] Add refund, tax, and consumer-protection terms.
- [ ] Consider IP/cyber/E&O insurance.
- [ ] Review payment-processor and app-store agreements.

### Ongoing

- [ ] Monitor trademarks, domains, app stores, and social handles.
- [ ] Keep the IP asset register and provenance records current.
- [ ] Re-run the dependency license inventory on every dependency change.
- [ ] Renew registrations and record assignments.
- [ ] Send takedown/cease-and-desist letters for copying of expression or
      branding, not for the underlying mechanic.

## 12. What I could not verify

- Whether any AI tool reproduced third-party code, art, or text.
- The exact AI tools, models, versions, and terms used over the project's
  history; the disclosure records the position but not a complete tool audit.
- Whether the final board, cards, rulebook, and UI are visually close to
  Sequence in a way that a court would find substantially similar.
- Whether Brilliant Systems LLC has common-law rights, state registrations, or
  foreign registrations beyond the US Class 9 registration.
- Whether any live patent covers the specific online multiplayer, AI, replay,
  or PWA implementation.
- Whether the project's actual deployment collects analytics, cookies, or logs
  beyond what the code shows.
- The project owner's exact legal name/entity, province, and contact address for
  registrations and privacy notices.
- The hosting provider's actual log-retention period and the final DPA/SCC
  arrangements for cross-border transfers.
- App-store, social-handle, and domain availability in every target market.

## 13. Sources

### Copyright and games

- Copyright Alliance, "Game On! Copyrightability of Board Games" —
  <https://copyrightalliance.org/copyrightability-of-board-games>
- _Baker v. Selden_, 101 U.S. 99 (1879).
- _Atari, Inc. v. Amusement World, Inc._, 547 F. Supp. 222 (D. Md. 1981).
- _DaVinci Editrice S.R.L. v. Ziko Games, LLC_, 183 F. Supp. 3d 820 (S.D. Tex.
  2016).
- _Tetris Holding, LLC v. Xio Interactive, Inc._, 863 F. Supp. 2d 394 (D.N.J.
  2012).
- _Fourth Estate Public Benefit Corp. v. Wall-Street.com, LLC_, 586 U.S. 296
  (2019).
- U.S. Copyright Office, "Copyright Registration Guidance: Works Containing
  Material Generated by Artificial Intelligence," 88 Fed. Reg. 16190 (2023).
- _Thaler v. Perlmutter_ (D.C. Cir. 2025).
- _CCH Canadian Ltd. v. Law Society of Upper Canada_, 2004 SCC 13.

### Trademarks

- Justia, SEQUENCE, US Registration No. 1,922,191 —
  <https://trademarks.justia.com/744/71/sequence-74471703.html>
- USPTO TTABVUE, Goliath IP Stichting v. SEQUENCE KING, Serial No. 99520014 —
  <https://ttabvue.uspto.gov/ttabvue/v?pno=91309086&pty=OPP>
- Trademarkia, QUINTARA, serial 78346997 —
  <https://www.trademarkia.com/quintara-78346997>
- Furm, QUINTARA, Registration No. 2,937,944 —
  <https://furm.com/trademarks/quintara-78346997>
- USPTO trademark search — <https://tmsearch.uspto.gov/>
- CIPO trademark search — <https://ised-isde.canada.ca/cipo/trademark-search/>
- EUIPO — <https://euipo.europa.eu/>
- WIPO Global Brand Database — <https://branddb.wipo.int/>
- IP India — <https://ipindia.gov.in/>

### Patents

- US6746017B2 — <https://patents.google.com/patent/US6746017B2/en>
- US5029871A — <https://patents.google.com/patent/US5029871A/en>
- US7828293B1 — <https://patents.google.com/patent/US7828293B1/en>
- _Alice Corp. v. CLS Bank International_, 573 U.S. 208 (2014).

### Licenses

- SIL Open Font License 1.1 — <https://openfontlicense.org/>
- GNU LGPL 3.0 — <https://www.gnu.org/licenses/lgpl-3.0.html>
- Mozilla Public License 2.0 — <https://www.mozilla.org/en-US/MPL/2.0/>
- Creative Commons BY 4.0 — <https://creativecommons.org/licenses/by/4.0/>
- Apache License 2.0 — <https://www.apache.org/licenses/LICENSE-2.0>

### Project records

- AI-assistance disclosure — [`ai-assistance-disclosure.md`](ai-assistance-disclosure.md)
- Litigation-response playbook — [`defense-playbook.md`](defense-playbook.md)
- IP asset register — [`ip-asset-register.md`](ip-asset-register.md)

### Privacy and platform

- Office of the Privacy Commissioner of Canada, PIPEDA —
  <https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/>
- GDPR — <https://gdpr.eu/>
- COPPA — <https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa>
- CCPA/CPRA — <https://oag.ca.gov/privacy/ccpa>
- GitHub Terms of Service — <https://docs.github.com/en/site-policy/github-terms/github-terms-of-service>
- GitHub DMCA policy — <https://docs.github.com/en/site-policy/content-removal-policies/dmca-takedown-policy>
