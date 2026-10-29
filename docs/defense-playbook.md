# Litigation and Demand-Letter Response Playbook

**Project:** Quintara  
**Owner:** Venkata Sai Krishna Chirasani  
**Repository:** <https://github.com/vskrch/Quintara>  
**Last reviewed:** 28 October 2026

> **This is not legal advice, and it does not create a lawyer-client
> relationship.** I am not your lawyer and cannot represent you, appear for you,
> negotiate for you, or give you a legal opinion. This is an operational
> checklist to help you preserve evidence and work efficiently with qualified
> counsel. If you receive a demand letter, a takedown notice, or a lawsuit,
> contact an IP litigator in the relevant jurisdiction immediately. Do not rely
> on this file as a substitute for legal advice.
>
> **This file is public in the repository.** Do not add privileged
> attorney-client communications, counsel's work product, settlement
> discussions, or litigation strategy to it. Keep those materials in a private,
> access-controlled file.

## 1. Purpose

This playbook is a defense-oriented file for the Quintara project. It covers:

- what to do in the first 24–72 hours after a demand, takedown, or lawsuit;
- how to preserve evidence without spoliation;
- what to give counsel;
- the main copyright, trademark, and patent defenses;
- insurance and notice obligations; and
- communication rules.

It is written for the project owner and for counsel. It is not a threat
assessment, a freedom-to-operate opinion, or a guarantee of any outcome.

## 2. The first 24–72 hours

### If you receive a demand letter or cease-and-desist letter

1. **Do not respond on the substance.** A quick, emotional, or apologetic reply
   can be used against you. Acknowledge receipt only if counsel approves.
2. **Calendar every deadline.** Note the date received, the response deadline,
   and any statutory or contractual deadline.
3. **Preserve everything.** Follow the litigation-hold steps in section 3.
4. **Notify your insurer** if you have IP, cyber, media, E&O, or general
   liability coverage. Ask whether the claim is covered and whether you need
   insurer-approved counsel.
5. **Retain counsel** with experience in the relevant area and jurisdiction.
6. **Do not delete, edit, or "clean up"** repositories, issues, posts, messages,
   analytics, logs, or files. Preservation includes metadata.
7. **Do not make public statements** about the claim, the claimant, or the
   merits. Do not post about it on social media or in the repository.
8. **Do not contact the claimant directly** unless counsel instructs you to.
9. **Keep a communication log.** Record dates, times, channels, participants,
   and a factual summary of every call or meeting. Do not record calls without
   checking the law in your jurisdiction.

### If you are served with a lawsuit

1. **Note the court, case number, and response deadline.** Missing a response
   deadline can result in default judgment.
2. **Notify your insurer immediately.** Coverage may require prompt notice and
   may require you to use approved counsel.
3. **Retain litigation counsel in that court's jurisdiction.** Ask about
   admission, local counsel, and fee arrangements.
4. **Preserve evidence** and issue a written litigation hold.
5. **Do not file an answer, motion, or pro se response** without counsel unless
   you have no realistic alternative and understand the risks.
6. **Consider ADR.** Mediation or a negotiated resolution may be cheaper and
   faster than litigation, especially for a beta project.
7. **Assess the business response.** A rebrand, removal of a feature, or a
   coexistence agreement may be commercially sensible even if the legal defense
   is strong.

### If you receive a DMCA takedown or platform complaint

1. **Preserve the notice and all related files.**
2. **Do not repost the removed material** until counsel reviews the notice.
3. **Consider a counter-notice** only with counsel. A counter-notice has legal
   consequences and may lead to litigation.
4. **Check whether the complaint targets the game, the repository, a screenshot,
   or a store listing.** The response may differ.
5. **Notify your host or platform** through the proper channel; do not argue the
   merits in public.

## 3. Litigation hold and evidence preservation

Preserve the following in a read-only or archived form:

- the Git repository, including all branches, tags, reflogs, and commit
  metadata;
- GitHub issues, pull requests, discussions, releases, and security advisories;
- deployment logs, server logs, error logs, and hosting-provider logs;
- analytics, if any, and any consent records;
- emails, chat messages, text messages, and call notes relating to the project;
- design files, prompts, model outputs, and AI-tool account history;
- invoices, receipts, contracts, licenses, and registrations;
- screenshots and recordings of the game and store listings;
- trademark, patent, and copyright search results; and
- insurance policies and correspondence.

Practical steps:

- create a dated archive (for example, a signed Git bundle and a ZIP of the
  working tree) and store it in two locations;
- record SHA-256 hashes of the archive;
- suspend automatic deletion or retention policies that could destroy relevant
  data;
- tell collaborators and contractors to preserve their records; and
- document who preserved what, when, and where.

Do not use a "clean" copy as the only copy. Preserve the original metadata.

## 4. The defense file

Give counsel a indexed package containing:

### Ownership and creation

- [`ai-assistance-disclosure.md`](ai-assistance-disclosure.md)
- [`ip-asset-register.md`](ip-asset-register.md)
- Git history and release tags
- Contracts, assignments, and licenses for any human-created assets
- Copyright registration certificates or applications
- Trademark applications, registrations, and office actions

### Independent creation and expression

- Board generation code and the fixed seed
- Design notes, sketches, and drafts
- Screenshots and recordings showing the distinct dark/gold visual identity
- The rules contract and evidence that it was written as an original
  engineering specification
- Evidence that no Sequence board art, card art, rulebook wording, or trade
  dress was copied
- Font, sound, and asset provenance records

### Trademark

- [`TRADEMARK.md`](../TRADEMARK.md)
- [`legal-risk-review.md`](legal-risk-review.md), especially the QUINTARA and
  SEQUENCE sections
- Search results and the adverse QUINTARA registration record
- Evidence of when and where QUINTARA was first used
- Marketing, store listings, and disclaimers
- Any coexistence or consent discussions

### Patent

- The patent search log in [`legal-risk-review.md`](legal-risk-review.md)
- The expired patents and the unrelated Goliath patent
- Product documentation showing the implementation
- Any formal freedom-to-operate opinion obtained later

### Licenses and third parties

- [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md)
- [`third-party-licenses.md`](third-party-licenses.md)
- `package-lock.json`
- Font and asset licenses
- Hosting and data-processing agreements

### Insurance and communications

- IP, cyber, media, E&O, and general liability policies
- Notice letters and insurer responses
- Demand letters, takedown notices, and envelopes
- A communication log

## 5. Copyright defenses to discuss with counsel

These are issues for counsel, not conclusions:

- **Independent creation.** Quintara's board is generated from a fixed seed, and
  the visual identity is distinct. Evidence of independent creation can defeat a
  copying claim.
- **Idea/expression distinction.** Game mechanics, rules, and methods of play are
  generally not protected. The claim must target protectable expression.
- **Merger and _scènes à faire_.** Some elements are inseparable from the idea of
  a line-building game or are standard in the genre.
- **Substantial similarity.** The plaintiff must show that the protected
  expression, not just the idea or functional elements, is substantially similar.
- **Lack of valid copyright or ownership.** The plaintiff must own a valid
  copyright in the material it claims.
- **AI-generated material.** Purely AI-generated material may not be protected;
  this can narrow the plaintiff's claim and the project's own portfolio.
- **License or permission.** If any material was used under a license, document
  it.
- **Fair use (US) / fair dealing (Canada).** Available in some contexts, but not
  a general defense for cloning expressive content.
- **Statute of limitations and laches.** Timing matters; ask counsel.
- **Damages and causation.** Even if liability is found, the plaintiff must
  prove actual damages or qualify for statutory damages.

## 6. Trademark defenses to discuss with counsel

- **No likelihood of confusion.** Different marks, different goods/services,
  different channels, and a clear non-affiliation disclaimer.
- **Descriptive fair use.** Using "sequence" descriptively to describe a
  mechanic, not as a brand.
- **Prior use.** If Quintara used a mark before the claimant's relevant priority
  date in a market, document it.
- **Weak or generic mark.** "Sequence" may be suggestive or descriptive in some
  contexts; the scope of protection may be narrow.
- **No trademark use.** A factual reference or comparative mention may not be
  trademark use.
- **Invalidity or abandonment.** Consider the registration's scope, use, and
  maintenance.
- **Coexistence or consent.** A negotiated agreement may be the practical
  solution.
- **Rebrand.** A rebrand can eliminate forward-looking risk, though it does not
  erase past conduct.

The adverse QUINTARA Class 9 registration is the highest brand risk. Counsel
should evaluate:

- whether a browser game is Class 9, Class 41, or both;
- whether the goods/services are related enough for confusion;
- whether a coexistence agreement is possible; and
- whether a rebrand is cheaper than a fight.

## 7. Patent defenses to discuss with counsel

- **Expired patents.** The two closest Sequence-related patents identified in
  the review are expired.
- **Non-infringement.** The claims may not cover Quintara's implementation.
- **Invalidity.** Prior art, obviousness, indefiniteness, and patent-eligible
  subject matter are possible defenses.
- **Unrelated patent.** Goliath's active US7828293B1 is a seek-and-find game, not
  the line-building mechanic.
- **Licensed or exhausted.** If a component is licensed, document it.
- **Damages.** Patent damages require proof of infringement and a royalty or
  lost-profits theory.

Do not assume that an expired patent ends the analysis. A continuation,
foreign counterpart, or different patent family may exist. A formal FTO search
is still the right pre-launch step.

## 8. Insurance and risk transfer

Ask an insurance broker about:

- **IP liability / media liability** — defense and damages for copyright,
  trademark, and advertising claims;
- **Cyber liability** — data breaches, privacy claims, and incident response;
- **Technology E&O** — errors in the service;
- **General liability** — bodily injury or property damage, if relevant; and
- **Umbrella/excess** coverage.

Key practical points:

- notify insurers promptly and follow the policy's notice and cooperation
  conditions;
- ask whether defense costs are outside the limit or erode it;
- ask whether counsel must be insurer-approved;
- keep policies and correspondence in the defense file; and
- do not admit liability or settle without checking coverage.

## 9. Communication rules

- Do not discuss the dispute on social media, Discord, GitHub, or with the press.
- Do not send a substantive response without counsel's review.
- Do not apologize, admit copying, or speculate about the claimant's motives in
  writing.
- Do not delete or edit evidence.
- Do not contact the claimant's employees, customers, or counsel directly.
- Do not ask others to delete or alter their records.
- Keep factual, dated notes. Separate facts from opinions.
- If a journalist or platform asks for comment, refer them to counsel.

## 10. If you cannot afford counsel

Options to investigate:

- legal aid or clinic services (rare for IP disputes);
- law-school IP clinics;
- volunteer lawyer programs;
- bar association referral services;
- limited-scope or unbundled representation;
- mediation or a negotiated resolution; and
- a rebrand or feature removal to reduce exposure.

Do not rely on a free online template as a substitute for advice on a real
claim. A poorly drafted response can make the situation worse.

## 11. Registration and monitoring checklist

- [ ] Register the copyright in the code, rules text, logo, and key art.
- [ ] File trademark applications only after clearance.
- [ ] Monitor QUINTARA, SEQUENCE, and confusingly similar marks and domains.
- [ ] Keep the IP asset register current.
- [ ] Keep the AI-assistance disclosure current.
- [ ] Re-run the dependency license inventory on each platform.
- [ ] Review insurance coverage annually.
- [ ] Keep the defense file backed up and access-controlled.

## 12. Quick reference

| Situation              | First move                                         | Do not                                      |
| ---------------------- | -------------------------------------------------- | ------------------------------------------- |
| Demand letter          | Calendar deadline, preserve evidence, call counsel | Reply on the merits or admit anything       |
| Lawsuit served         | Note deadline, notify insurer, retain counsel      | Miss the response deadline or file pro se   |
| DMCA takedown          | Preserve notice, review with counsel               | Repost immediately or file a counter-notice |
| Platform complaint     | Preserve records, use the appeal channel           | Argue in public                             |
| Data breach            | Contain, assess, notify per policy and law         | Hide it or destroy logs                     |
| Threat on social media | Screenshot, preserve, do not engage                | Respond publicly                            |

## 13. File index

- [`legal-risk-review.md`](legal-risk-review.md) — IP, trademark, patent, and
  privacy review
- [`ai-assistance-disclosure.md`](ai-assistance-disclosure.md) — AI and human
  authorship record
- [`ip-asset-register.md`](ip-asset-register.md) — asset provenance
- [`third-party-licenses.md`](third-party-licenses.md) — dependency inventory
- [`../LICENSE`](../LICENSE) — proprietary license
- [`../TRADEMARK.md`](../TRADEMARK.md) — brand policy
- [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) — third-party notices

---

**Again: this is not legal advice and does not create a lawyer-client
relationship.** The project owner should retain qualified counsel before
responding to any demand, takedown, or lawsuit.
