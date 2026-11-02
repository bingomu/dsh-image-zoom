# Launch checklist — DSH plugin market

Order matters: the market's CI rejects a repository younger than **1 day**, npm publishes are immutable, and the awesome-list PR is reviewed against the source.

## 0. Preconditions

- [ ] GitHub account `bingomu` is authenticated on this machine (`gh auth status`).
- [ ] npm account is available and logged in (`npm login`) if publishing to npm.
- [ ] Working tree is clean and `npm run check` passes.

## 1. Repository (day 0)

- [ ] Create `bingomu/dsh-image-zoom` as a **public** repository.
- [ ] Description: the repository description from `docs/marketplace/listing.md`.
- [ ] Topics: `dsh-plugin`, `deepseek-harness`, `image-viewer`, `zoom`.
- [ ] Enable **Issues** (and **Discussions** if the Q&A channel is desired).
- [ ] Push `main`; confirm the CI workflow runs.
- [ ] Add the social preview (`assets/social-preview.png`) and confirm `assets/banner.png` renders in the README.
- [ ] The repository must be **at least 1 day old** before opening the marketplace PR. Use the day to publish npm/release and re-run the manual checklist.

## 2. Package and release (day 0)

- [ ] `npm run check` and `node tests/run-e2e.mjs` → 88/88.
- [ ] `npm pack` → inspect that it contains exactly `index.js`, `client.js`, `cordis.patch.yml`, `icon.svg`, `README.md`, `README.zh.md`, `CHANGELOG.md`, `LICENSE`, `locale/*.json`, `package.json`.
- [ ] Install the tarball into a scratch DSH profile and confirm the boot graph contains `dsh-image-zoom`.
- [ ] Commit, tag `v1.0.1`, push the tag.
- [ ] GitHub Release `v1.0.1`: attach `dsh-image-zoom-1.0.1.tgz`, paste the changelog section.
- [ ] `npm publish` (2FA). Verify `npm view dsh-image-zoom version` and `https://www.npmjs.com/package/dsh-image-zoom`.
- [ ] From another checkout, `dsh plugin --profile scratch add dsh-image-zoom` and confirm it installs from npm.

## 3. Marketplace submission (day ≥ 1)

- [ ] Fork `awesome-dsh-plugin/awesome-dsh-plugin`.
- [ ] Add exactly one file `data/plugins/bingomu__dsh-image-zoom.yml` with the content in `docs/marketplace/entry.yml`.
- [ ] Do **not** edit generated READMEs; do not touch other entries.
- [ ] Open the PR with this body:

```markdown
Adds `dsh-image-zoom`, an in-chat image viewer for DSH.

- Repository: https://github.com/bingomu/dsh-image-zoom
- npm: https://www.npmjs.com/package/dsh-image-zoom
- Category: ui
- Declares `dsh.bundle.patch` and `dsh.client` (web), installs with `dsh plugin add dsh-image-zoom`.
- Screenshots are declared in the repository (`screenshots.json`, 4 AppStore-style shots).
- One file only: `data/plugins/bingomu__dsh-image-zoom.yml`.
```

- [ ] Watch CI: READMEs regenerated, YAML valid, repo age, topic present.
- [ ] Answer reviewer comments on description accuracy — the listing text must match the code.

## 4. After merge

- [ ] Confirm the entry appears on awesome-dsh-plugin.com and in the market catalog (nightly build).
- [ ] `dsh plugin --profile scratch add dsh-image-zoom` from the market UI.
- [ ] Check the storefront card: icon, screenshots carousel, install button.
- [ ] Update the repository homepage/description if the listing page URL differs.
- [ ] Announce (optional) and watch issues for the first week.

## Rollback

- npm: deprecate the version (`npm deprecate dsh-image-zoom@1.0.1 "…"`); do not delete published versions.
- Release: mark the GitHub release as pre-release or edit the notes; keep the tag.
- Marketplace: open a follow-up PR editing only your YAML file (do not rewrite the READMEs).
- If the plugin itself is broken, publish a patch and note it in `CHANGELOG.md`; users can pin `dsh-image-zoom@1.0.0` if needed.
