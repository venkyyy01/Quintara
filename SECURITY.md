# Security Policy

## Supported versions

Security fixes are applied to the `main` branch. There are no tagged releases
yet. Older forks and deployments are not supported.

## Reporting a vulnerability

Please use GitHub's private security advisory flow:

<https://github.com/vskrch/Quintara/security/advisories/new>

Do **not** open a public issue, discussion, or pull request for a suspected
vulnerability. Do not test against other people's rooms, accounts, or data.

Include, where possible:

- a description of the issue and its impact;
- the affected component (web client, game server, engine, or deployment);
- reproduction steps or a proof of concept;
- the version, commit, or environment you tested; and
- any suggested fix or mitigation.

## What to expect

- We aim to acknowledge reports within 3 business days.
- We aim to complete initial triage within 10 business days.
- We will keep you informed of material progress and coordinate disclosure
  after a fix is available.
- There is currently no bug bounty or guaranteed payment.

## Safe harbor

If you act in good faith, avoid privacy violations, avoid service disruption,
and give us reasonable time to fix the issue before public disclosure, we will
not pursue legal action against you for your research. This is a good-faith
no-action statement, not a contract, a waiver of rights, or a promise that no
claim will ever be brought. It does not authorize testing against third-party
systems or data. It does not cover privacy or legal requests; use the contact in
the privacy policy for those.

## Scope

In scope:

- the Quintara web application;
- the Fastify/WebSocket game server;
- the deterministic game engine and AI packages; and
- authentication, session, rate-limit, and privacy boundaries in this
  repository.

Out of scope:

- vulnerabilities in third-party dependencies that are already publicly known
  and have an available upstream fix (report them upstream and tell us);
- social engineering, phishing, or physical attacks;
- denial-of-service testing, spam, or automated scraping;
- missing security headers or best-practice findings without a demonstrated
  impact; and
- issues that require a compromised device or browser extension.

## Secrets and credentials

Never include real secrets, tokens, personal data, or production credentials in
a report. If you accidentally expose a secret, tell us immediately and rotate
it.

---

This policy is not legal advice. It does not create a contract, a promise of
payment, or a waiver of rights. The good-faith no-action statement above is a
statement of intent, not a binding waiver.
