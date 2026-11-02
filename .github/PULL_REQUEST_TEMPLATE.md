## What changed

<!-- One paragraph. Link the issue: Fixes #123 -->

## Why

<!-- The user-visible problem this solves. -->

## Verification

- [ ] `npm run check`
- [ ] `node tests/run-e2e.mjs` → `__/__ checks passed`
- [ ] Tested manually in DSH Desktop (`⌘R` after installing the build)

## Docs and release hygiene

- [ ] `CHANGELOG.md` entry added (user-visible changes)
- [ ] `README.md` / `README.zh.md` / `docs/marketplace/listing.md` updated if behaviour changed
- [ ] Screenshots regenerated only if the UI changed (`assets/screenshots/`)
- [ ] No new network calls, storage of user data, or `engines.dsh` changes without a compatibility note
