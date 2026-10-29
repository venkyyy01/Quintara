# AI Assistance and Human Authorship Disclosure

**Project:** Quintara  
**Owner:** Venkata Sai Krishna Chirasani  
**Repository:** <https://github.com/vskrch/Quintara>  
**Record date:** 28 October 2026

> This is a factual project record, not legal advice. It is intended to help
> counsel, the U.S. Copyright Office, CIPO, or a court understand how the work
> was made. It does not itself establish copyright ownership or human
> authorship.

## 1. Summary

Quintara was developed with **substantial AI assistance**. AI tools were used
to help draft and revise code, tests, documentation, UI copy, and design
material. Human creative direction, selection, editing, integration, testing,
and review were **predominant**. The project does not claim that every portion
of the repository is exclusively human-authored, and it does not claim
exclusive copyright in purely AI-generated output that is not protected by law.

This disclosure is deliberately specific about the distinction:

- **AI-assisted** means a human directed the work, selected or rejected
  outputs, edited the result, integrated it into the project, and reviewed it.
- **AI-generated** means output produced by a model without sufficient human
  creative contribution to support a claim of human authorship in that output.

Most of Quintara is in the first category. Some individual lines, snippets,
test cases, or passages may be in the second. The project treats the boundary
as fact-specific and does not overstate it.

## 2. How AI was used

AI tools were used as drafting and productivity assistants, including for:

- proposing code structure, functions, tests, and refactors;
- drafting and editing documentation, comments, and UI copy;
- suggesting visual, naming, and UX directions for human selection;
- explaining errors, reviewing diffs, and proposing fixes; and
- generating candidate test cases and edge-case checklists.

AI output was not accepted blindly. The project owner:

- chose the game concept, rules, player counts, modes, and product scope;
- set the visual direction, brand name, and user experience;
- selected, rejected, rewrote, and integrated AI-assisted drafts;
- ran the test suite, type checks, lint, and production builds;
- reviewed game-rule behavior and multiplayer privacy boundaries;
- made the deployment, licensing, and disclosure decisions; and
- directed the legal-risk review and the corrections made in response to it.

## 3. What the human contributed

The following are human-directed contributions, even where AI helped draft the
expression:

- the decision to build a browser-based line-building game with solo,
  pass-and-play, and online modes;
- the rules contract and the choices about Jacks, wild corners, sequence
  counting, team configurations, and stalemate handling;
- the product architecture: a pure deterministic engine, an authoritative
  server, per-viewer state projection, and a separate AI package;
- the dark/gold visual identity, the lattice logo concept, and the UI layout;
- the selection and editing of documentation, rules text, and marketing copy;
- the test strategy and the decision to require deterministic and property-based
  tests;
- the security and privacy posture, including guest identities, no accounts,
  no advertising, and no third-party analytics; and
- the decision to publish the repository as proprietary, source-available
  portfolio work rather than open source.

## 4. What may be AI-generated

The project does not have a line-by-line provenance map for every file. The
following categories may contain AI-generated material that is not protectable
on its own:

- individual code snippets, comments, and test cases;
- documentation passages and UI copy;
- candidate names, descriptions, and design suggestions that were not adopted;
- boilerplate configuration and scaffolding; and
- formatting or refactoring changes suggested by a tool.

The project does **not** represent that these categories are exclusively
human-authored. Where a contribution is materially AI-generated, the project
will disclose that in a copyright registration or other filing rather than list
it as solely human-authored.

## 5. What is claimed

To the extent permitted by law, the project claims copyright in the human
creative contributions: the selection, arrangement, coordination, editing, and
integration of the work, the original rules expression, the visual design, the
source code as a whole, and the documentation as a whole. The project does not
claim copyright in:

- ideas, game mechanics, methods of play, or functional rules as such;
- purely AI-generated output that lacks sufficient human authorship;
- third-party packages, fonts, or other components; or
- material owned by someone else.

This is consistent with the proprietary [`LICENSE`](../LICENSE), which limits
the claim to material "to the extent copyright and other rights subsist" and are
owned by the copyright holder.

## 6. Evidence to preserve

The project should keep, and counsel should review:

- the Git history and dated commits;
- this disclosure and any updates;
- prompt/design logs, if retained, including the tool and model used;
- drafts, rejected alternatives, and edit history for key assets;
- test results, CI runs, screenshots, and release tags;
- the IP asset register (`docs/ip-asset-register.md`); and
- any contracts or licenses for commissioned human work.

Commit authorship alone is not proof of human authorship. AI-assisted work is
normally committed under the human operator's name.

## 7. Registration and filing guidance

Before filing a copyright registration:

1. Identify which material is human-authored, which is AI-assisted, and which is
   AI-generated.
2. Disclose AI-generated material as required by the registration process.
3. Do not list AI-only material as solely human-authored.
4. Register the human contributions and the compilation/arrangement where
   appropriate.
5. Have counsel review the application and the deposit material.

The U.S. Copyright Office's guidance on works containing AI-generated material
is the starting point for U.S. filings. Canadian and Indian practice is less
settled; consult local counsel.

## 8. Limits

This record is not a legal opinion, a certification, or a guarantee that any
particular portion of Quintara is protectable. It is a good-faith description of
the development process based on the project's current knowledge. If the project
adopts new AI tools or changes its workflow, update this record.
