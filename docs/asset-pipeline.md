# Asset audit (V2n)

Run from frontend: `npm run asset:audit` (or `node scripts/asset-audit.mjs`). JSON goes to stdout, a compact summary to stderr. Redirect stdout explicitly if a manifest is wanted; the audit itself never writes files. `npm run test:assets` runs builtin Node tests. No package installation is required for either Node command.

Actual production CharacterVersion spriteId references are loaded with the same lightweight ES-module adapter used by foundation tests. Output order and paths are stable; no timestamps or machine-specific absolute paths. PNG checks cover signature, IHDR dimensions/format, chunk bounds/CRC, IDAT decompression and scanline sizes, IEND. This is technical integrity checking, not visual identity certification or a complete image renderer. Decompression has a 64 MiB safety limit.

64x64 and 256x256 are equally accepted. Non-square dimensions and shared references are warnings. Missing references and invalid PNG payloads give exit code 1. Unreferenced files remain visible as ORPHAN. Existing suspicious/unresolved identity entries are reported without changing their mapping.

Baseline observation: 44 files named .png actually contain WebP data, all preserved. Header inventory: 42 at 64x64, 2 at 256x256. Therefore strict PNG audit currently exits 1 with 44 INVALID_PNG and FORMAT_EXTENSION_MISMATCH findings; this is existing source format debt, not an audit test failure. WebP fallback reads dimensions only, does not certify decoding or pretend these are PNGs. No missing/orphan files. Known identity warnings: Austin, Joseph, Jonas. Do not rename or convert them automatically.

Future manually supplied PNG packs can be inventoried immediately: unused PNGs appear as technically valid ORPHAN assets until referenced. Resolve format/mapping policy explicitly in a separate task before enforcing this command as a mandatory release check. Android workflow is not changed here.

Golden Ball target selection is shared between bag and battle. Eligible KO portraits remain legible with a KO • RIANIMABILE label; living targets use native disabled buttons. Source image size, render size and eligibility styling remain independent. Item effects are unchanged.
