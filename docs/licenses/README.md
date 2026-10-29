# License Texts

This directory contains canonical license texts for third-party components used
by Quintara. They are provided so that built distributions can include the
required notices without relying on `node_modules`.

| File                    | Used by                                    |
| ----------------------- | ------------------------------------------ |
| `OFL-1.1.txt`           | Sora and Inter fonts                       |
| `LGPL-3.0-or-later.txt` | `@img/sharp-libvips-darwin-arm64`          |
| `GPL-3.0.txt`           | LGPL-3.0 incorporates GPL-3.0 by reference |
| `MPL-2.0.txt`           | `lightningcss` and its platform binary     |
| `CC-BY-4.0.txt`         | `caniuse-lite`                             |
| `Apache-2.0.txt`        | Apache-2.0 dependencies                    |

The copyright notices for individual packages are in their package directories
under `node_modules`, and the package/version/license inventory is in
[`../third-party-licenses.md`](../third-party-licenses.md).

These files are not a substitute for the notices shipped with each dependency.
If you distribute a built application, container, or app-store build, include
the relevant notices and license texts with the distribution.
