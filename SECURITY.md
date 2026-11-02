# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 1.0.x | ✅ |
| < 1.0.0 | ❌ |

Security fixes are shipped in the latest patch of the current minor line whenever possible.

## Reporting a vulnerability

**Do not open a public issue for a security problem.** Use GitHub's private vulnerability reporting:
<https://github.com/bingomu/dsh-image-zoom/security/advisories/new>

If GitHub advisories are unavailable, email **robinham@gmail.com** with `SECURITY` in the subject; do not include working exploits in a public channel.

Please include:

- affected version(s) and DSH version;
- what an attacker could do and what they need (local user? a crafted image? a page?)
- reproduction steps or a proof of concept;
- any suggested fix.

You can expect an acknowledgement within about a week and a coordinated disclosure plan. Credit is given in the advisory unless you prefer otherwise.

## Scope

`dsh-image-zoom` is a **client-only** plugin. Relevant security surface:

- the capture-phase click listener that takes over content images;
- the viewer dialog and its DOM (no `innerHTML`, no `eval`, no `new Function`);
- image sources (`http(s)`, `blob:`, `data:`) fetched only to display/download them;
- the Host call `remote.session.openWorkspacePath`, used only for the Open-original button and only with a path derived from a same-origin `/api/file?path=` image;
- clipboard writes, initiated by the user;
- the `screenshots.json` / docs files, which are static.

Out of scope: vulnerabilities in DeepSeek Harness itself, in the images you open, or in third-party software used to view a downloaded file. Please report those upstream. The plugin writes no session data and stores only the wheel-mode preference in `localStorage`.
