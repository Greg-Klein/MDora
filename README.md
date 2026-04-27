# MDora

[![License: MIT](https://img.shields.io/badge/License-MIT-brown.svg)](./LICENSE)
[![StackLint grade](https://stacklint.app/api/badge/github/Greg-Klein/MDora.svg)](https://stacklint.app/analyze?repo=https%3A%2F%2Fgithub.com%2FGreg-Klein%2FMDora)

A markdown file viewer that doesn't feel like a Word doc or like an IDE. Just a quiet place to read `.md` files, with Mermaid graphs that actually work and code highlighting that doesn't hurt your eyes.

Cross-platform desktop app built with [Tauri v2](https://v2.tauri.app/), so it ships as a native ~10 MB binary that starts instantly on macOS, Windows and Linux.

## Features

- Open `.md` / `.markdown` / `.mdx` files via native dialog, drag-and-drop, or as the OS-registered handler (Finder "Open With", Windows / Linux file association)
- GitHub Flavored Markdown rendering: tables, task lists, strikethrough, autolinks, footnotes
- Image rendering: local files relative to the markdown (via Tauri's asset protocol), absolute filesystem paths, and remote `https:` / `http:` / `data:` sources
- Live Mermaid graphs: flowcharts, sequence, class, ER, gantt, journey, C4, state, gitGraph
- Syntax highlighting via highlight.js
- In-document search (`Cmd/Ctrl+F`): case-insensitive, current/total counter, Enter / Shift+Enter to navigate, Esc to close
- Light / dark toggle, theme persisted to local storage
- Read / edit toggle with split-pane live preview and proportional scroll sync between the source and the rendered view
- Direct save or Save As (toolbar button)
- Keyboard shortcuts: `Cmd/Ctrl+O` open, `Cmd/Ctrl+S` save, `Cmd/Ctrl+E` toggle edit, `Cmd/Ctrl+F` find, `Cmd/Ctrl+D` toggle theme
- Update detection: checks GitHub Releases at startup and shows a non-blocking banner when a newer version is available

## Stack

| Layer           | Choice                               |
| --------------- | ------------------------------------ |
| Desktop shell   | Tauri v2                             |
| Backend         | Rust 1.95 + `tauri-plugin-fs/dialog` |
| Frontend        | Vite 8 + React 18 + TypeScript 5.6   |
| Markdown engine | `react-markdown` + `remark-gfm`      |
| Code highlight  | `rehype-highlight` (highlight.js 11) |
| Diagrams        | `mermaid` 11                         |
| Styling         | Tailwind v3 + custom CSS variables   |
| Icons           | `@phosphor-icons/react`              |
| Tests           | Vitest 4 + Testing Library + jsdom   |

## Install

Prerequisites:

- Node 20.19+ or 22.12+ (Vite 8 requirement) and npm
- Rust stable (`rustup` recommended)
- macOS: Xcode Command Line Tools

```bash
git clone <repo> mdora && cd mdora
npm install
```

## Test

```bash
npm test           # one-shot
npm run test:watch # watch mode
```

Vitest + Testing Library + jsdom. Behavioural tests live next to the components (`*.test.tsx`).

## Run in dev

```bash
npm run tauri dev
```

This starts Vite on `localhost:1420` and opens a Tauri window pointing to it. Frontend hot-reloads, Rust recompiles automatically on change.

## Production build

```bash
npm run tauri build
```

Generates a macOS `.app` and `.dmg`, a Windows `.exe`, or a Linux `AppImage` depending on the platform. For just the raw binary without the installer:

```bash
npm run tauri build -- --no-bundle
```

The binary lands in `src-tauri/target/release/mdora` (~10 MB).

## Project structure

```
mdora/
├── src/
│   ├── App.tsx                  Shell, toolbar, shortcuts, search
│   ├── App.test.tsx             Shell behaviour (Tauri APIs mocked)
│   ├── components/
│   │   ├── MarkdownView.tsx     Markdown rendering pipeline + image resolver
│   │   ├── MermaidBlock.tsx     Mermaid render + theme reactivity
│   │   ├── SearchBar.tsx        Find-in-document overlay
│   │   ├── EmptyState.tsx       Welcome screen
│   │   └── *.test.tsx           Per-component behavioural tests
│   ├── lib/
│   │   ├── paths.ts             Cross-platform dirname + image path resolution
│   │   └── paths.test.ts
│   ├── test/setup.ts            Vitest setup (jest-dom matchers, cleanup)
│   ├── styles.css               Theme tokens + prose CSS + search highlights
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs               Tauri builder + native menu
│   │   └── main.rs
│   ├── capabilities/
│   │   └── default.json         ACL: dialog + scoped fs
│   ├── icons/
│   │   ├── source/              SVG + 1024px master, regenerate platform set with `npx tauri icon`
│   │   └── ...                  generated PNG / ICO / ICNS / iOS / Android assets
│   ├── tauri.conf.json
│   └── Cargo.toml
├── tailwind.config.js
└── vite.config.ts
```

## Notes

Mermaid runs with `securityLevel: "strict"` and the rendered SVG is parsed in an isolated document via `DOMParser` before being attached to the live tree, so a malicious `.md` file cannot inject script through node labels, tooltips, or `foreignObject`. `react-markdown` is configured **without** `rehype-raw` so raw HTML inside markdown is rendered as text, not live DOM. A strict `Content-Security-Policy` is enforced at the Tauri level (`default-src 'self'`, no remote `connect-src`).

Mermaid is re-initialized on every theme switch so existing SVGs are regenerated with the right palette. Mermaid blocks are identified by the ` ```mermaid ` fence, so you can freely mix code and diagrams in the same document.

Images are resolved through a custom `img` renderer in `MarkdownView`. Remote sources (`https:`, `http:`, `data:`, `blob:`, `asset:`) pass through unchanged. Anything else is treated as a filesystem path: the renderer strips any query string or fragment, decodes any percent-encoded characters once, resolves the path against the directory of the open markdown file, then passes the absolute path through Tauri's `convertFileSrc` so it loads via the asset protocol (`asset://localhost/...` on macOS / Linux, `https://asset.localhost/...` on Windows). The `assetProtocol` scope is `**`, matching the existing `fs:scope`. The CSP `img-src` allows `'self' data: blob: https: http: asset: https://asset.localhost`. A custom `urlTransform` keeps `data:` and `asset:` URLs from being blanked by react-markdown's default sanitizer while still blocking `javascript:`, `vbscript:`, `file:`, `mailto:` and similar schemes whose first colon precedes any slash, query, or fragment.

In-document search uses the [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API) (`CSS.highlights` + `Highlight` ranges) instead of mutating the DOM. No fight with React's reconciler, no extra wrapper elements injected into the rendered Markdown. Requires WebKit 17.2+ / Chromium 105+, which is well within Tauri's modern WebView baseline.

The filesystem `fs:scope` is set to `**` so files can be opened from any folder (Finder "Open With", drag-and-drop, CLI argument, OS file association). Markdown is rendered with `securityLevel: "strict"` and without `rehype-raw`, so a malicious `.md` file still cannot run script in the webview, but the broad scope means MDora can read or write any file the user account itself can read or write. If you want to lock it down, narrow `allow` in `src-tauri/capabilities/default.json` (e.g. `$HOME/**`, `$DOCUMENT/**`).

Update detection runs at startup from the Rust side (`src-tauri/src/updater.rs`), so the frontend CSP stays `default-src 'self'` with no remote `connect-src`. It hits `api.github.com/repos/Greg-Klein/MDora/releases/latest`, compares `tag_name` to the bundled `package_info().version` via `semver`, and emits an `UpdateInfo` payload only when a strictly greater version exists (drafts and prereleases ignored). The banner uses `tauri-plugin-opener` with a permission scoped to `github.com/Greg-Klein/MDora/releases/*`, so it cannot open arbitrary URLs. Dismissals are remembered per-version in `localStorage` so the same release does not nag twice.

MDora declares a file association for `.md` / `.markdown` / `.mdx` (`bundle.fileAssociations` in `tauri.conf.json`, `LSHandlerRank: Alternate`). After installing the bundled `.app` / `.exe` / `AppImage`, the OS lists MDora in the "Open With" menu, and you can set it as default through Finder / Explorer. On macOS, file paths arrive via `RunEvent::Opened`; on Windows / Linux, via `argv`. In both cases the backend buffers them in app state and emits a `mdora://open-file` event, which `App.tsx` drains on mount and listens to while running. Dev (`npm run tauri dev`) launches an unbundled binary so the OS won't route files to it; test associations against a `npm run tauri build` artifact.

## Releasing

Maintainer-only. Full procedure (version bump, git flow merge, signed DMG build, GitHub release, asset upload) is documented in [`docs/RELEASING.md`](./docs/RELEASING.md).

## License

MIT. See [`LICENSE`](./LICENSE).
