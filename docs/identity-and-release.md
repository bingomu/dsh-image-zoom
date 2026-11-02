# Identity, support and release policy

This file is the single source of truth for **who maintains `dsh-image-zoom`**, **where to report what**, and **how versions are shipped**. Keep it in sync with `package.json`, `README.md` and the marketplace listing.

## 1. Identity

| Field | Value |
| --- | --- |
| Maintainer | **Genzo** (GitHub `bingomu`) |
| GitHub | <https://github.com/bingomu> |
| X / Twitter | <https://x.com/robinham> |
| Email (security / private) | robinham@gmail.com |
| Project | `dsh-image-zoom` — 图片缩放查看器 |
| Repository | <https://github.com/bingomu/dsh-image-zoom> |
| Issues | <https://github.com/bingomu/dsh-image-zoom/issues> |
| Discussions | <https://github.com/bingomu/dsh-image-zoom/discussions> (Q&A / show & tell) |
| Security | Private report through GitHub Security Advisories (preferred) or robinham@gmail.com (see `SECURITY.md`) |
| License | MIT, Copyright © 2026 Genzo (bingomu) |

Email is published as a **fallback** for security reports and private matters, not as the primary support channel. Scrapers do collect public npm/GitHub emails; GitHub Issues and Discussions stay the main record so the mailbox only receives security and cooperation mail. A Gmail filter for `dsh-image-zoom` is recommended.

## 2. Where to report what

| Topic | Channel | What to include |
| --- | --- | --- |
| Bug / regression | GitHub Issue (`bug_report`) | DSH version, OS, browser/desktop build, image source type (Markdown / attachment / tool result), reproduction steps, expected vs. actual, screenshot or screen recording |
| Feature request | GitHub Issue (`feature_request`) | The workflow it enables; why the current behaviour is insufficient; alternatives considered |
| Usage question | GitHub Discussions → Q&A, otherwise an Issue | DSH version and where you got stuck |
| Security vulnerability | GitHub Security Advisories (private) | Affected version, impact, reproduction, suggested fix. Do not open a public issue. |
| Marketplace listing problem | `awesome-dsh-plugin` repository | Broken install, wrong category, stale screenshots |

## 3. Support expectations

- This is a **personally maintained** project, not a commercial product; there is no SLA.
- Target: answer new issues **within about a week**, fix regressions in a patch release as soon as practical.
- Supported versions: the latest release and the previous minor. Other versions are answered on a best-effort basis.
- Supported DSH range is the `engines.dsh` field in `package.json`; anything outside it is unsupported even if it happens to work.

## 4. Versioning and compatibility

- Follows **Semantic Versioning**:
  - **patch** — fixes with no behaviour change to the public gesture/API surface;
  - **minor** — backward-compatible features;
  - **major** — removed or changed behaviour, or a DSH compatibility break.
- `engines.dsh` declares the compatible DSH range, e.g. `>=0.2.1-rc.2 <0.3.0-0`.
- DSH's own releases move quickly. A DSH upgrade that removes an API this plugin uses is treated as a **major** change for this plugin; the changelog says which DSH versions are affected.
- Deprecations are announced in `CHANGELOG.md` at least one minor release before removal.
- Every user-visible change lands in `CHANGELOG.md` (Keep a Changelog format).

## 5. Release process

1. Update `CHANGELOG.md` and bump the version in `package.json`.
2. `npm run check` and run the full test suite (`tests/README.md`).
3. `npm pack` and inspect the tarball contents; install it into a scratch DSH profile and confirm the boot graph contains `dsh-image-zoom`.
4. Commit, tag `v<version>`, push.
5. Create a GitHub Release with the generated `.tgz` attached and the changelog section as notes.
6. `npm publish` (requires the owner's npm session; 2FA).
7. For marketplace changes, update `data/plugins/bingomu__dsh-image-zoom.yml` in `awesome-dsh-plugin` (one file, one PR).
8. Verify the marketplace entry, npm version and release download after publishing.

## 6. Brand and writing rules

- **Name:** `dsh-image-zoom` (package/repo), 图片缩放查看器 (Chinese display name).
- **Tagline (EN):** A real image viewer for DeepSeek Harness.
- **Tagline (ZH):** 给 DeepSeek Harness 的图片查看器。
- **Colours:** ink `#1A1917`, paper `#F7F2E9`, rust accent `#A4552F`.
- **Assets:** `assets/icon-180.png` / `assets/icon-512.png` (marketplace + repo), `assets/icon.svg` (plugin manager), `assets/banner.png` (README/social), `assets/screenshots/01…04.png` (storefront order).
- **Tone:** describe what the plugin does, with no superlatives or marketing claims. Marketplace reviewers check every sentence against the code; an inaccurate description is the usual reason a submission is sent back.
- **Screenshots:** 16:10, 1600×1000, dark theme, real DSH UI, no fake windows. `screenshots.json` lists them in storefront order.

## 7. Marketplace listing identity

| Field | Value |
| --- | --- |
| Registry entry | `data/plugins/bingomu__dsh-image-zoom.yml` in `awesome-dsh-plugin/awesome-dsh-plugin` |
| Category | `ui` |
| Description (EN) | In-chat image viewer for DeepSeek Harness: wheel and trackpad pinch zoom at the pointer, two-finger and drag panning, gallery navigation, downloads named from the image description and timestamp, and opening workspace originals in the system default app. |
| Description (ZH) | DeepSeek Harness 的聊天图片查看器：滚轮 / 触控板捏合以指针为中心缩放，双指 / 拖动平移，支持图集切换、下载按图片说明与时间戳自动命名，以及用系统默认应用打开工作区原图。 |
| Icon | `https://raw.githubusercontent.com/bingomu/dsh-image-zoom/main/assets/icon-180.png` |
