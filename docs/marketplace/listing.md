# Marketplace listing copy

Use this text in the `awesome-dsh-plugin` entry, the repository description, and anywhere the plugin is announced. Keep it factual; reviewers verify every claim.

## One-liners

- **EN (75 chars-ish):** A real image viewer for DeepSeek Harness: zoom, pan, gallery, named downloads.
- **ZH:** 给 DeepSeek Harness 的图片查看器：缩放、平移、图集、自动命名下载。
- **Long EN (marketplace `description.en`):** In-chat image viewer for DeepSeek Harness: wheel and trackpad pinch zoom at the pointer, two-finger and drag panning, gallery navigation, downloads named from the image description and timestamp, and opening workspace originals in the system default app.
- **Long ZH:** DeepSeek Harness 的聊天图片查看器：滚轮 / 触控板捏合以指针为中心缩放，双指 / 拖动平移，支持图集切换、下载按图片说明与时间戳自动命名，以及用系统默认应用打开工作区原图。

## Repository description (GitHub, 350 chars max)

> In-chat image viewer for DeepSeek Harness: wheel / trackpad-pinch zoom at the pointer, two-finger and drag panning, gallery browsing, auto-named downloads, and open-with-default-app for workspace images. 88 interaction tests.

## Storefront screenshots (order matters)

`screenshots.json` lists eight images: the **English set first**, then the **Chinese set** (the market allows 1–8).

| # | File | Caption |
| --- | --- | --- |
| 1 | `assets/screenshots/en/01-overview.png` | “Click any image, get a viewer that fits it to the window.” |
| 2 | `assets/screenshots/en/02-detail.png` | “Zoom to 260% at the pointer; the percentage is editable.” |
| 3 | `assets/screenshots/en/03-download.png` | “Downloads arrive as `description-YYYYMMDD-HHmmss.ext`.” |
| 4 | `assets/screenshots/en/04-gallery.png` | “`←` / `→` moves through the images in the conversation.” |
| 5–8 | `assets/screenshots/01…04.png` | The same four scenes with Chinese UI copy, for Chinese readers. |

## Feature bullets (short form)

- Wheel notch zooms at the pointer (Windows 100 / Chrome 120); smooth-scroll and precise mouse deltas are handled too.
- Trackpad pinch zooms; two-finger scroll pans both axes; drag pans; `Shift`+wheel pans sideways.
- Fit / 1:1 / double-click, `+`/`-`, typed percentage, 5%–4000%, 90° rotation.
- Gallery with `←`/`→` and `n / total`; footer wheel modes **Auto / Zoom / Pan** persist.
- Download names from the image description + local timestamp; Windows-safe characters and reserved names; extension follows the real format.
- Workspace originals open in the system default app via the Host bridge; external images open in a new window; `blob:`/`data:` images explain the download/copy route.
- Loading indicator and inline error state; keyboard scroll keys do not leak to the page behind; toast is a polite live region.
- Client-only, no `innerHTML`/`eval`, writes only one `localStorage` preference.

## Do not say

- “best / fastest / the only” image viewer.
- “works with every DSH version” — it declares `engines.dsh`.
- “supports PDF/video” — it is images only.
- Any number of features that is not literally in the code.

## Links to include

- Repository: https://github.com/bingomu/dsh-image-zoom
- Issues: https://github.com/bingomu/dsh-image-zoom/issues
- Changelog: https://github.com/bingomu/dsh-image-zoom/blob/main/CHANGELOG.md
- Support: https://github.com/bingomu/dsh-image-zoom/blob/main/SUPPORT.md
- Security: https://github.com/bingomu/dsh-image-zoom/security/advisories/new
