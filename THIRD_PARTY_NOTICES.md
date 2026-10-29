# Third-Party Notices

Quintara is proprietary software, but it uses third-party packages, fonts, and
build tools. Those components remain under their own licenses. This file
summarizes the notices that matter most for redistribution and points to the
full inventory.

The full inventory of installed npm packages is in
[`docs/third-party-licenses.md`](docs/third-party-licenses.md). That inventory is
a **local macOS arm64 snapshot**, not an authoritative cross-platform list:
platform-specific optional dependencies vary. Regenerate it on each target
platform and include the relevant platform variants before distributing a
build. Version pins are in `package-lock.json`. Canonical license texts are in
[`docs/licenses/`](docs/licenses/) and are served in-app at `/licenses` from
[`apps/web/public/licenses/`](apps/web/public/licenses/).

## Fonts

The web app uses **Sora** and **Inter** through `next/font/google`. Next.js
downloads and self-hosts the font files at build time, so the built application
redistributes those font files.

- **Sora** — Copyright 2019 The Sora Project Authors
  (<https://github.com/sora-xor/sora-font>). Licensed under the SIL Open Font
  License, Version 1.1.
- **Inter** — Copyright 2020 The Inter Project Authors
  (<https://github.com/rsms/inter>). Licensed under the SIL Open Font License,
  Version 1.1.

The full OFL text and both copyright notices are in
[`docs/licenses/OFL-1.1.txt`](docs/licenses/OFL-1.1.txt) and are served at
`/licenses/OFL-1.1.txt`. `next/font` subsets and re-encodes the font files; the
OFL permits this, and the Sora and Inter notices do not declare a Reserved Font
Name, so no rename is required. The OFL permits bundling and embedding the fonts
with software, provided the license and copyright notices are retained and the
fonts are not sold by themselves.

## sharp / libvips

The web build uses `sharp` (Apache-2.0) through Next.js image optimization.
On macOS arm64, the installed native binary is
`@img/sharp-libvips-darwin-arm64@1.3.4`, which is licensed under
**LGPL-3.0-or-later**.

- Project: <https://github.com/lovell/sharp-libvips>
- Upstream libvips: <https://github.com/libvips/libvips>
- License texts: [`docs/licenses/LGPL-3.0-or-later.txt`](docs/licenses/LGPL-3.0-or-later.txt)
  and [`docs/licenses/GPL-3.0.txt`](docs/licenses/GPL-3.0.txt)

If you distribute a built application or container that includes this binary,
keep the LGPL/GPL notices, make the corresponding source available, and do not
impose terms that restrict replacement or relinking of the LGPL-covered
component. The upstream source is available at the links above. If you received
a binary distribution and need a copy of the corresponding source, contact the
Project Owner through the repository. Nothing in the Quintara proprietary
license limits any right you have under the LGPL, including the right to modify,
replace, or relink the LGPL-covered component.

Running the software as a hosted service does not by itself distribute the
binary, but the notices are retained here for deployments that do distribute
it.

## lightningcss

`lightningcss@1.32.0` and its platform binary are licensed under **MPL-2.0**.
They are used at build time to transform CSS. Quintara does not modify these
packages.

- Project: <https://github.com/parcel-bundler/lightningcss>
- License text: [`docs/licenses/MPL-2.0.txt`](docs/licenses/MPL-2.0.txt)

If you distribute a modified version of an MPL-covered file, make the source of
that modified file available under the MPL. The unmodified package source is at
the link above.

## caniuse-lite

`caniuse-lite` is licensed under **CC-BY-4.0** and is used at build time by
Browserslist. Attribution: caniuse-lite, Browserslist project,
<https://github.com/browserslist/caniuse-lite>.

- License text: [`docs/licenses/CC-BY-4.0.txt`](docs/licenses/CC-BY-4.0.txt)

## Apache-2.0 components

Several dependencies are licensed under Apache-2.0. If you redistribute a
built artifact, preserve any `NOTICE` files that ship with those packages and
include a copy of the Apache License, Version 2.0:
[`docs/licenses/Apache-2.0.txt`](docs/licenses/Apache-2.0.txt).

## MIT, ISC, BSD, and other permissive components

The majority of dependencies are MIT, ISC, BSD-2-Clause, BSD-3-Clause,
Python-2.0, BlueOak-1.0.0, or 0BSD. Their license texts and copyright notices
are included in the corresponding `node_modules` packages. If you distribute a
built artifact, include those notices in the distribution or its accompanying
documentation.

## In-app notices

The app serves a `/licenses` page that links to the texts in
`apps/web/public/licenses/`. Keep those copies in sync with `docs/licenses/`
whenever a license changes. The page covers the principal license families; it
is not a complete package-by-package notice file.

## Distribution checklist

Before shipping a browser bundle, container image, desktop package, or app-store
build:

- [ ] Generate a production-only dependency inventory on the target platform.
- [ ] Include the copyright notice and license text for every package whose
      license requires one, not just the six principal texts in
      `apps/web/public/licenses/`.
- [ ] Preserve Apache-2.0 `NOTICE` files.
- [ ] Include the LGPL/GPL texts and the corresponding-source offer for
      libvips, and do not restrict relinking or replacement of the LGPL-covered
      component.
- [ ] Include the OFL text and font copyright notices.
- [ ] Include the MPL-2.0 and CC-BY-4.0 notices.
- [ ] Keep the inventory and notices with the distributed artifact or its
      accompanying documentation.

A simple starting point is `npx license-checker --production --json`, followed by
a script that copies each package's `LICENSE`/`NOTICE` file into a consolidated
notice file. Review the generated file before shipping; automated inventories
can miss packages or misclassify licenses.

## Regenerating the inventory

```bash
npx license-checker --json > /tmp/quintara-licenses.json
```

Then rebuild `docs/third-party-licenses.md` from the JSON, or run your own
license inventory tool. Re-run the inventory on every target platform whenever
dependencies change and before any distribution. The committed inventory was
generated on macOS arm64 and does not include every platform-specific optional
dependency.

## No legal advice

This file is an engineering compliance aid, not legal advice. License
obligations depend on how the software is deployed and distributed. Have
counsel review the distribution model before shipping a commercial binary,
container image, or app-store build.
