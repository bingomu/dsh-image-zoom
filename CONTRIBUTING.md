# Contributing

Thanks for taking a look. This is a small, single-file client plugin; the goal is to keep it predictable and reviewable rather than large.

## Development setup

Requirements: Node ≥ 22, a Chrome/Chromium for the tests.

```sh
git clone https://github.com/bingomu/dsh-image-zoom
cd dsh-image-zoom
npm run check            # node --check on the two entry files
./tests/chrome.sh        # headless Chrome with CDP on 127.0.0.1:9333
node tests/run-e2e.mjs   # 88 assertions, real input events + real downloads
./tests/chrome.sh stop
```

- No build step: `client.js` is served as-is. `index.js` is the (empty) Host half.
- `tests/harness.html` fakes the DSH module loader and Cordis context, serves the plugin over `http://127.0.0.1` so `/api/file?path=` is a real same-origin route, and drives the viewer through the Chrome DevTools Protocol.
- Run one test suite at a time: the driver owns the Chrome page target.

## Code conventions

- Plain browser JavaScript, `'use strict'`, no framework dependency.
- No `innerHTML` / `eval` / `new Function`; DOM is built with `document.createElement` and `textContent`.
- Prefer small named helpers over long inline expressions; comments explain **why**, not what.
- User-visible strings go into the `TEXTS` table for both `zh` and `en`; keep them accurate.
- Any change to gestures, naming, or actions needs a test in `tests/run-e2e.mjs`.

## Pull request checklist

- [ ] `npm run check` passes.
- [ ] `node tests/run-e2e.mjs` passes (attach the summary line to the PR).
- [ ] `CHANGELOG.md` has an entry for user-visible changes.
- [ ] README/README.zh and `docs/marketplace/listing.md` stay accurate if behaviour changed.
- [ ] No new network calls, no storage of user data, no changes to `engines.dsh` without a compatibility note.
- [ ] Screenshots are regenerated only when the UI actually changed.

## Commit and version style

- Imperative subject line, ≤ 72 characters, English or Chinese is fine.
- Reference the issue number when there is one (`Fix #12: ...`).
- The maintainer handles version bumps and releases; see `docs/identity-and-release.md`.

## Marketplace description accuracy

`awesome-dsh-plugin` reviewers check every sentence of the listing against the code. If a PR changes what the plugin does, update the entry in `docs/marketplace/entry.yml` and the listing paragraph at the same time. Do not add comparison or marketing language ("best", "unlike …", "46 tools") unless it is literally true and verifiable.
