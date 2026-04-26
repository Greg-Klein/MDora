export const SAMPLE_MARKDOWN = `# mdora

A quiet, fast markdown viewer with **Mermaid** graphs, syntax highlighting, and a built-in editor.

> Open any \`.md\` file. Toggle between read and edit. Switch theme.
> That's it. No accounts, no uploads, no servers.

## Why

Most markdown previewers feel either like a Word doc or like an IDE. \`mdora\` aims for the middle: a calm reading surface with the technical bits done right.

### Features

- GitHub Flavored Markdown (tables, task lists, strikethrough, autolinks)
- Mermaid diagrams rendered live
- Syntax highlighting via highlight.js
- Light and dark mode
- Read / Edit toggle with split preview

### Task list

- [x] File picker via Tauri \`plugin-dialog\`
- [x] Light / dark theme
- [x] Mermaid block renderer
- [ ] Folder navigation tree
- [ ] Drag-and-drop file open

## Code blocks

\`\`\`typescript
import { open } from "@tauri-apps/plugin-dialog";

const path = await open({
  multiple: false,
  filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
});
\`\`\`

## Mermaid

\`\`\`mermaid
flowchart LR
  A[Open file] --> B{Has Mermaid?}
  B -- yes --> C[Render SVG]
  B -- no --> D[Render markdown]
  C --> E[Done]
  D --> E[Done]
\`\`\`

## Sequence

\`\`\`mermaid
sequenceDiagram
  participant U as User
  participant A as App
  participant FS as File System
  U->>A: Cmd+O
  A->>FS: read_to_string(path)
  FS-->>A: contents
  A->>U: Render preview
\`\`\`

## Table

| Feature        | Status        | Notes                  |
| -------------- | ------------- | ---------------------- |
| Open file      | shipped       | Tauri dialog           |
| Save changes   | shipped       | Tauri fs               |
| Mermaid        | shipped       | mermaid 11             |
| Folder tree    | not yet       | future                 |

## Inline bits

You can press <kbd>Cmd</kbd>+<kbd>E</kbd> to switch modes. Inline code looks like \`array.map(x => x * 2)\`. Links go to [the project](https://github.com/).

---

That's the whole tour.
`;
