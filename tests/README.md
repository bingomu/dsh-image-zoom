# Tests

Two layers:

1. **`harness.html`** — a minimal fake DSH host: it fakes `window.__ModuleLoader__`,
   supplies a stub Cordis `ctx`, renders a conversation with images (wide / tall /
   square / linked / remote / broken / SVG-without-intrinsic-size) and a 24 px icon.
   `run-e2e.mjs` drives it through the Chrome DevTools Protocol with **real** input
   events (wheel, pointer drag, keyboard, double click) and real downloads.
2. **Live app smoke** — run by the Lead against the running desktop app (reload the
   page, open an image, check wheel/pan/download/keyboard). It is not part of the
   checked-in suite because it needs the local auth cookie.

## Run

```bash
./tests/chrome.sh            # headless Chrome with CDP on 127.0.0.1:9333
node tests/run-e2e.mjs       # 88 assertions; exits non-zero on the first failure set
./tests/chrome.sh stop
```

- **One suite at a time.** The suite now opens a fresh top-level page
  (`/json/new`) so leftover tabs cannot interfere; still, another CDP script driving
  the same Chrome can make runs flaky — let the suite own the browser.
- The suite serves the plugin over `http://127.0.0.1:<random>` so `/api/file?path=`
  is a real same-origin route (that branch cannot be exercised from `file://`).
- Downloads are captured under `tests/downloads/` (git-ignored) through
  `Browser.setDownloadBehavior`. That browser-level setting must stay connected for
  the whole download, which is why `run-e2e.mjs` keeps its browser WebSocket open.
- `--no-sandbox` is required when Chrome runs inside another sandbox (the DSH agent's
  file sandbox) and in most CI containers; `chrome.sh` already passes it.
- `chrome.sh` detects Chrome/Chromium on macOS and Linux; override with `CHROME_PATH`.
- In CI (Ubuntu) the same two commands run after `npm run check`; see `.github/workflows/ci.yml`.
