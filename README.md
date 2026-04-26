# mdora

A markdown file viewer that doesn't feel like a Word doc or like an IDE. Just a quiet place to read `.md` files, with Mermaid graphs that actually work and code highlighting that doesn't hurt your eyes.

Cross-platform desktop app built with [Tauri v2](https://v2.tauri.app/), so it ships as a native ~10 MB binary that starts instantly on macOS, Windows and Linux.

## Features

- Open `.md` / `.markdown` files via native dialog (Tauri `plugin-dialog`)
- GitHub Flavored Markdown rendering: tables, task lists, strikethrough, autolinks, footnotes
- Live Mermaid graphs: flowcharts, sequence, class, ER, gantt, journey, C4, state, gitGraph
- Syntax highlighting via highlight.js
- Light / dark toggle, theme persisted to local storage
- Read / edit toggle with split-pane live preview
- Direct save or Save As (toolbar button)

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
│   ├── App.tsx                  Shell, toolbar, shortcuts
│   ├── components/
│   │   ├── MarkdownView.tsx     Markdown rendering pipeline
│   │   ├── MermaidBlock.tsx     Mermaid render + theme reactivity
│   │   └── EmptyState.tsx       Welcome screen
│   ├── sample.ts                Sample markdown
│   ├── styles.css               Theme tokens + prose CSS
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs               Tauri builder + Rust commands
│   │   └── main.rs
│   ├── capabilities/
│   │   └── default.json         ACL: dialog + scoped fs
│   ├── tauri.conf.json
│   └── Cargo.toml
├── tailwind.config.js
└── vite.config.ts
```

## Notes

Mermaid is re-initialized on every theme switch so existing SVGs are regenerated with the right palette. Mermaid blocks are identified by the ` ```mermaid ` fence, so you can freely mix code and diagrams in the same document.

The filesystem scope is limited to `$HOME`, `$DESKTOP`, `$DOCUMENT`, `$DOWNLOAD` and any `.md` / `.markdown` file. If you need to widen it, edit `src-tauri/capabilities/default.json`.

## Roadmap

- [ ] Drag-and-drop a file onto the window
- [ ] Folder tree in a side panel
- [ ] Export to PDF / HTML
- [ ] In-file search (`Cmd+F`)
- [ ] Obsidian-style wiki links (`[[wiki links]]`)
