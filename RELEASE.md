# Release — dsh-image-zoom 1.0.1

First public release. Client-only image viewer for DeepSeek Harness. Maintained by Genzo (@bingomu · @robinham).

- **Package:** `dsh-image-zoom` (npm), MIT
- **Repository / issues:** <https://github.com/bingomu/dsh-image-zoom> · <https://github.com/bingomu/dsh-image-zoom/issues>
- **Marketplace entry:** `data/plugins/bingomu__dsh-image-zoom.yml` in `awesome-dsh-plugin` (category `ui`)
- **DSH compatibility:** `>=0.2.1-rc.2 <0.3.0-0`; developed and verified on DSH Desktop `0.2.1-rc.5`
- **Release date:** 2026-11-01

## Artifacts

| Artifact | Where |
| --- | --- |
| GitHub release tarball (primary) | `dsh-image-zoom-1.0.1.tgz` on tag `v1.0.1` |
| npm package | optional follow-up; not required for the marketplace listing |
| GitHub release tarball | `dsh-image-zoom-1.0.1.tgz` attached to tag `v1.0.1` |
| Storefront screenshots | `assets/screenshots/01…04.png` via `screenshots.json` |
| Marketplace icon | `assets/icon-180.png` |

## Verification

| Check | Result |
| --- | --- |
| Syntax | `npm run check` ✅ |
| Interaction suite (real Chrome, CDP input, real downloads) | **88 / 88** — `tests/last-run.txt` |
| Tarball install into a scratch DSH profile | pnpm install, bundle row added, `--dump-config` contains `dsh-image-zoom`, web boot combo serves `dsh-image-zoom/client.js` ✅ |
| Installed-state smoke (DSH Desktop) | viewer opens, wheel/pinch/pan, auto-named download, default-app open bridge answers, Esc closes, no page errors |
| Static review | no `innerHTML` / `eval` / `new Function` / debug output; i18n keys all used |

## Manual acceptance (3 minutes)

1. Reload the page (⌘R / Ctrl+R) after installing.
2. Open a chat image: fit view, wheel/pinch zoom, two-finger/drag pan, double-click 1:1, `←`/`→` gallery.
3. Footer **Auto / Zoom / Pan**: choose Zoom, relaunch, the choice persists.
4. Download: the save dialog is prefilled with `<description>-<YYYYMMDD-HHmmss>.<ext>`.
5. Open original on a workspace image: it opens in the system default app; an attachment (`blob:`) explains the download/copy route instead.
6. `Esc` closes; the page scrolls normally afterwards.

## Known limitations

- Browsers do not expose whether a wheel event came from a mouse or a trackpad. Auto mode guesses from timing: an isolated event zooms, a continuous stream pans. Some smooth-scroll drivers split one notch into a stream — use the **Zoom** mode (persisted) or pinch.
- Pointer-anchored zoom after a 90°/270° rotation is an approximation.
- Touch-screen pinch is implemented with Pointer Events but has not been verified on real touch hardware.
- Images only. PDF, video and HTML artifacts need a different viewer.
- Copy image and clipboard writes depend on the browser clipboard permission; a cross-origin image may fail to re-encode.

## Upgrade / uninstall / rollback

- Upgrade: `dsh plugin --profile <profile> add dsh-image-zoom@latest`, then restart or reload.
- Uninstall: remove it from **Plugins**, or `dsh plugin --profile <profile> remove dsh-image-zoom`.
- Rollback: install the previous version (`dsh-image-zoom@1.0.0` if published; otherwise the release tarball) and restart.
- The plugin writes no session data; uninstalling leaves only the viewer's `localStorage` wheel-mode preference, which is harmless.

## Checksums

```text
SHA-256 (client.js)  83c48e5d6cbbe2507db0e3793d1c76b311ff1109d61e84f4d4b56dc80df2bd5b
SHA-256 (index.js)   ac6cc05c0c068f235578aaefee37d2d32d37eb3c74eecf7bb8dd81c5e7a40b63
SHA-256 (tarball)    455313758c7e8f19a4ea0bf1357eff577c9b881261563a3123266c5562a49f9f
```
