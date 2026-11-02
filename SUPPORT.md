# Support

`dsh-image-zoom` is maintained by **Genzo** ([@bingomu](https://github.com/bingomu) · [@robinham](https://x.com/robinham)) on a best-effort basis. There is no SLA; the target is to answer new issues within about a week.

## Where to go

| You need… | Go to | Notes |
| --- | --- | --- |
| Report a bug or regression | [Issues → Bug report](https://github.com/bingomu/dsh-image-zoom/issues/new?template=bug_report.yml) | Include DSH version, OS, image source type and reproduction steps |
| Ask for a feature | [Issues → Feature request](https://github.com/bingomu/dsh-image-zoom/issues/new?template=feature_request.yml) | Describe the workflow, not just the button |
| Ask how to use it | [Discussions → Q&A](https://github.com/bingomu/dsh-image-zoom/discussions) (when enabled) | Otherwise open an issue |
| Report a security problem | [Private advisory](https://github.com/bingomu/dsh-image-zoom/security/advisories/new) or robinham@gmail.com | Never a public issue; see [SECURITY.md](SECURITY.md) |
| Fix it yourself | [CONTRIBUTING.md](CONTRIBUTING.md) | PRs are welcome |

## Before opening an issue

1. Check the [README](README.md) — especially the three wheel modes **Auto / Zoom / Pan** in the footer, which resolve most mouse/trackpad differences.
2. Try the latest release; `CHANGELOG.md` says what changed.
3. Confirm the DSH version is inside the supported range (`engines.dsh` in `package.json`).
4. If the viewer does not open at all, check that the plugin is enabled in **Plugins** and that the page was reloaded after installing.

## What to include

- **DSH version** and how you run it (Desktop app or `dsh web`).
- **OS and input device** (macOS trackpad / Magic Mouse / Windows wheel / touch).
- **Where the image comes from**: Markdown image, attachment (`blob:`), tool result, or a workspace file (`/api/file?path=…`).
- **Reproduction**: what you clicked, what you expected, what happened.
- **Evidence**: a screenshot or screen recording is worth a lot; console errors if the viewer does not appear.
- **Version**: the plugin version from `package.json` or the Plugins page.

## What this project does not promise

- Support for DSH versions outside `engines.dsh`.
- Support for non-image artifacts (PDF, video, HTML previews) — that needs a different viewer.
- Fixes for third-party sync/IO tools that rename or move files mid-session.
