# Contributing to Quintara

Quintara is a **proprietary** project. The source is publicly viewable for
portfolio and evaluation purposes, but it is not open source. Before you submit
a pull request, patch, issue, or any other contribution, read this file and
`LICENSE`.

## Before you start

- Open an issue to describe the change and confirm that it is wanted. This
  avoids wasted work and helps keep the project's scope and IP clean.
- Do not include third-party code, images, fonts, audio, data, or other
  material unless you can prove it is licensed for this use and you identify
  the license and source.
- Do not include confidential information, trade secrets, or material you do
  not have the right to disclose.
- If you use generative AI to help produce a contribution, disclose the tool
  and the extent of its use. You are responsible for ensuring the result does
  not reproduce third-party material and that you have the rights needed to
  submit it.

## Contribution license

By submitting a contribution (including code, documentation, artwork, rules
text, tests, or suggestions), you agree that:

1. You retain any copyright you own in the contribution.
2. You grant the Project Owner a perpetual, worldwide, non-exclusive,
   royalty-free, irrevocable, transferable, and sublicensable license to use,
   reproduce, modify, adapt, publish, distribute, publicly perform, publicly
   display, make available, and otherwise exploit the contribution, in whole
   or in part, in any medium and for any purpose, including commercial
   purposes, and to relicense it under any terms.
3. To the extent permitted by law, you waive and agree not to assert any moral
   rights in the contribution against the Project Owner or its successors,
   assigns, or licensees.
4. You represent and warrant that you have the legal right to grant this
   license, that the contribution is your original work or is properly
   licensed, and that it does not infringe any third-party right.
5. You understand that you will not receive compensation, attribution beyond
   the project's normal commit history, or any ownership interest in the
   project, and that the Project Owner may use, modify, or decline the
   contribution without obligation.

If you do not agree to these terms, do not submit a contribution.

## Contribution sign-off

Every commit that contains a contribution must include a sign-off line:

```text
Signed-off-by: Your Name <you@example.com>
```

Use `git commit -s` to add it automatically. By signing off, you confirm that:

- you wrote the contribution or otherwise have the right to submit it;
- you have disclosed any generative-AI assistance as required above;
- you grant the contribution license in this file and waive moral rights as
  stated above;
- you understand that the project is proprietary and that the sign-off does not
  transfer ownership or create an employment, partnership, or agency
  relationship; and
- you have the authority to sign on behalf of yourself or the entity you
  represent.

This is a project-specific contribution sign-off, **not** the Developer
Certificate of Origin. The DCO text at <https://developercertificate.org/> does
not apply to this project and is not incorporated by reference.

## Development checks

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

## Security reports

Do not open a public issue for a security vulnerability. Follow
`SECURITY.md`.

## Code of conduct

Be direct, technical, and respectful. Harassment, discrimination, doxxing, and
personal attacks are not welcome. The Project Owner may remove contributions or
restrict participation at any time.

---

These contribution terms are not legal advice. If you are contributing on
behalf of an employer or another entity, confirm that you have authority to
agree to them.
