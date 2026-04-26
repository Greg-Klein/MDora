import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import mermaid from "mermaid";
import {
  BookOpen,
  PencilSimple,
  Sun,
  Moon,
  FolderOpen,
  FloppyDisk,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { MarkdownView } from "./components/MarkdownView";
import { EmptyState } from "./components/EmptyState";
import { SAMPLE_MARKDOWN } from "./sample";

type Theme = "light" | "dark";
type Mode = "read" | "edit";

function basename(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

function loadInitialTheme(): Theme {
  const stored = localStorage.getItem("mdora.theme");
  if (stored === "light" || stored === "dark") return stored;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

function loadInitialMode(): Mode {
  const stored = localStorage.getItem("mdora.mode");
  return stored === "edit" ? "edit" : "read";
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(loadInitialTheme);
  const [mode, setMode] = useState<Mode>(loadInitialMode);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  // Apply theme class + initialize mermaid for the current theme
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("mdora.theme", theme);
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === "dark" ? "dark" : "default",
      securityLevel: "loose",
      fontFamily: '"Geist", ui-sans-serif, system-ui, sans-serif',
    });
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("mdora.mode", mode);
  }, [mode]);

  const handleOpen = useCallback(async () => {
    setErrorMsg(null);
    try {
      const selected = await openDialog({
        multiple: false,
        directory: false,
        filters: [
          { name: "Markdown", extensions: ["md", "markdown", "mdx"] },
          { name: "All", extensions: ["*"] },
        ],
      });
      if (!selected || Array.isArray(selected)) return;
      const path = typeof selected === "string" ? selected : (selected as { path: string }).path;
      const text = await readTextFile(path);
      setFilePath(path);
      setContent(text);
      setOriginalContent(text);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const handleSave = useCallback(async () => {
    setErrorMsg(null);
    try {
      let target = filePath;
      if (!target) {
        const chosen = await saveDialog({
          filters: [{ name: "Markdown", extensions: ["md"] }],
          defaultPath: "untitled.md",
        });
        if (!chosen) return;
        target = typeof chosen === "string" ? chosen : (chosen as { path: string }).path;
      }
      await writeTextFile(target, content);
      setFilePath(target);
      setOriginalContent(content);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }, [content, filePath]);

  const handleReload = useCallback(async () => {
    if (!filePath) return;
    try {
      const text = await readTextFile(filePath);
      setContent(text);
      setOriginalContent(text);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }, [filePath]);

  const handleSample = useCallback(() => {
    setFilePath(null);
    setContent(SAMPLE_MARKDOWN);
    setOriginalContent(SAMPLE_MARKDOWN);
    setErrorMsg(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "o") { e.preventDefault(); handleOpen(); }
      else if (k === "s") { e.preventDefault(); handleSave(); }
      else if (k === "e") {
        e.preventDefault();
        setMode((m) => (m === "read" ? "edit" : "read"));
      }
      else if (k === "d") {
        e.preventDefault();
        setTheme((t) => (t === "light" ? "dark" : "light"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleOpen, handleSave]);

  const dirty = content !== originalContent;
  const hasContent = content.length > 0;
  const wordCount = useMemo(() => {
    if (!hasContent) return 0;
    return content.trim().split(/\s+/).filter(Boolean).length;
  }, [content, hasContent]);

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Toolbar */}
      <header className="toolbar sticky top-0 z-30 flex items-center px-4 gap-3 select-none">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            aria-hidden
            style={{
              width: 22, height: 22, borderRadius: 6,
              background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18), 0 1px 0 rgba(0,0,0,0.04)",
            }}
          >
            <span style={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: 11, fontWeight: 700,
              color: "#06281f",
            }}>m</span>
          </div>
          <span style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>mdora</span>
          <span style={{
            color: "var(--text-faint)",
            fontFamily: '"Geist Mono", monospace',
            fontSize: 12,
            marginLeft: 8,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {filePath ? basename(filePath) : hasContent ? "untitled.md" : ""}
            {dirty ? <span style={{ color: "var(--accent)", marginLeft: 6 }}>●</span> : null}
          </span>
        </div>

        <div className="segmented" role="tablist" aria-label="Mode">
          <button
            role="tab"
            data-active={mode === "read"}
            onClick={() => setMode("read")}
            aria-label="Read mode"
          >
            <BookOpen size={13} weight="bold" />
            Read
          </button>
          <button
            role="tab"
            data-active={mode === "edit"}
            onClick={() => setMode("edit")}
            aria-label="Edit mode"
          >
            <PencilSimple size={13} weight="bold" />
            Edit
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button className="btn-ghost" onClick={handleOpen} title="Open file (Cmd/Ctrl+O)" aria-label="Open file">
            <FolderOpen size={17} weight="regular" />
          </button>
          <button
            className="btn-ghost"
            onClick={handleSave}
            disabled={!hasContent}
            style={!hasContent ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
            title="Save (Cmd/Ctrl+S)"
            aria-label="Save"
          >
            <FloppyDisk size={17} weight="regular" />
          </button>
          <button
            className="btn-ghost"
            onClick={handleReload}
            disabled={!filePath}
            style={!filePath ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
            title="Reload from disk"
            aria-label="Reload from disk"
          >
            <ArrowsClockwise size={16} weight="regular" />
          </button>
          <span style={{ width: 1, height: 18, background: "var(--border)", margin: "0 4px" }} />
          <button
            className="btn-ghost"
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            title="Toggle theme (Cmd/Ctrl+D)"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 min-h-0 flex flex-col">
        {!hasContent ? (
          <EmptyState onOpen={handleOpen} onSample={handleSample} />
        ) : mode === "read" ? (
          <ReadPane content={content} themeKey={theme} />
        ) : (
          <EditPane
            content={content}
            onChange={setContent}
            themeKey={theme}
            editorRef={editorRef}
          />
        )}
      </main>

      {/* Status bar */}
      <footer className="statusbar flex items-center px-4 gap-4 select-none">
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {filePath ?? "no file"}
        </span>
        {errorMsg ? (
          <span style={{ color: "var(--hl-number)" }}>{errorMsg}</span>
        ) : null}
        <span>{wordCount.toLocaleString()} words</span>
        <span>{content.length.toLocaleString()} chars</span>
        <span style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {mode}
        </span>
      </footer>
    </div>
  );
}

function ReadPane({ content, themeKey }: { content: string; themeKey: Theme }) {
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="mx-auto py-12 px-8 rise" style={{ maxWidth: "min(72ch, 100%)" }}>
        <MarkdownView source={content} themeKey={themeKey} />
      </div>
    </div>
  );
}

function EditPane({
  content,
  onChange,
  themeKey,
  editorRef,
}: {
  content: string;
  onChange: (s: string) => void;
  themeKey: Theme;
  editorRef: React.MutableRefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2"
         style={{ borderTop: "1px solid var(--border)" }}>
      <div className="min-h-0 overflow-auto" style={{ borderRight: "1px solid var(--border)" }}>
        <textarea
          ref={editorRef}
          className="editor-pane"
          value={content}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoFocus
          placeholder="Write some markdown..."
        />
      </div>
      <div className="min-h-0 overflow-auto" style={{ background: "var(--bg)" }}>
        <div className="mx-auto py-10 px-8" style={{ maxWidth: "min(70ch, 100%)" }}>
          <MarkdownView source={content} themeKey={themeKey} />
        </div>
      </div>
    </div>
  );
}
