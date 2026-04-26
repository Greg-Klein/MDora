# mdora

[![License: MIT](https://img.shields.io/badge/License-MIT-brown.svg)](./LICENSE)
[![StackLint grade](https://stacklint.app/api/badge/github/Greg-Klein/MDora.svg)](https://stacklint.app/analyze?repo=https%3A%2F%2Fgithub.com%2FGreg-Klein%2FMDora)

A markdown file viewer that doesn't feel like a Word doc or like an IDE. Just a quiet place to read `.md` files, with Mermaid graphs that actually work and code highlighting that doesn't hurt your eyes.

Cross-platform desktop app built with [Tauri v2](https://v2.tauri.app/), so it ships as a native ~10 MB binary that starts instantly on macOS, Windows and Linux.

## Features

- Open `.md` / `.markdown` / `.mdx` files via native dialog or drag-and-drop on the window
- GitHub Flavored Markdown rendering: tables, task lists, strikethrough, autolinks, footnotes
- Live Mermaid graphs: flowcharts, sequence, class, ER, gantt, journey, C4, state, gitGraph
- Syntax highlighting via highlight.js
- In-document search (`Cmd/Ctrl+F`): case-insensitive, current/total counter, Enter / Shift+Enter to navigate, Esc to close
- Light / dark toggle, theme persisted to local storage
- Read / edit toggle with split-pane live preview
- Direct save or Save As (toolbar button)
- Keyboard shortcuts: `Cmd/Ctrl+O` open, `Cmd/Ctrl+S` save, `Cmd/Ctrl+E` toggle edit, `Cmd/Ctrl+F` find, `Cmd/Ctrl+D` toggle theme

## Stack

| Layer           | Choice                                 |
| --------------- | -------------------------------------- |
| Desktop shell   | Tauri v2                               |
| Backend         | Rust 1.95 + `tauri-plugin-fs/dialog`   |
| Frontend        | Vite 5 + React 18 + TypeScript 5.6     |
| Markdown engine | `react-markdown` + `remark-gfm`        |
| Code highlight  | `rehype-highlight` (highlight.js 11)   |
| Diagrams        | `mermaid` 11                           |
| Styling         | Tailwind v3 + custom CSS variables     |
| Icons           | `@phosphor-icons/react`                |

## Install

Prerequisites:

- Node 18+ and npm
- Rust stable (`rustup` recommended)
- macOS: Xcode Command Line Tools

```bash
git clone <repo> mdora && cd mdora
npm install
```

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
│   ├── components/
│   │   ├── MarkdownView.tsx     Markdown rendering pipeline
│   │   ├── MermaidBlock.tsx     Mermaid render + theme reactivity
│   │   ├── SearchBar.tsx        Find-in-document overlay
│   │   └── EmptyState.tsx       Welcome screen
│   ├── styles.css               Theme tokens + prose CSS + search highlights
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs               Tauri builder + native menu
│   │   └── main.rs
│   ├── capabilities/
│   │   └── default.json         ACL: dialog + scoped fs
│   ├── tauri.conf.json
│   └── Cargo.toml
├── tailwind.config.js
└── vite.config.ts
```

## Notes

Mermaid runs with `securityLevel: "strict"` and the rendered SVG is parsed in an isolated document via `DOMParser` before being attached to the live tree, so a malicious `.md` file cannot inject script through node labels, tooltips, or `foreignObject`. `react-markdown` is configured **without** `rehype-raw` so raw HTML inside markdown is rendered as text, not live DOM. A strict `Content-Security-Policy` is enforced at the Tauri level (`default-src 'self'`, no remote `connect-src`).

Mermaid is re-initialized on every theme switch so existing SVGs are regenerated with the right palette. Mermaid blocks are identified by the ` ```mermaid ` fence, so you can freely mix code and diagrams in the same document.

In-document search uses the [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API) (`CSS.highlights` + `Highlight` ranges) instead of mutating the DOM. No fight with React's reconciler, no extra wrapper elements injected into the rendered Markdown. Requires WebKit 17.2+ / Chromium 105+, which is well within Tauri's modern WebView baseline.

The filesystem scope is limited to paths the user explicitly picks via the open / save dialog (Tauri grants ephemeral scopes for those). The static `fs:scope` is intentionally empty so a malicious `.md` file cannot reach anything else. If you need to widen it, edit `src-tauri/capabilities/default.json`.

## License

MIT. See [`LICENSE`](./LICENSE).
