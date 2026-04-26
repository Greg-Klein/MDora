import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import mermaid from "mermaid";
import {
  PencilSimple,
  Sun,
  Moon,
  FolderOpen,
  FloppyDisk,
  ArrowsClockwise,
  FileText,
} from "@phosphor-icons/react";
import { MarkdownView } from "./components/MarkdownView";
import { EmptyState } from "./components/EmptyState";
import { SearchBar } from "./components/SearchBar";

type Theme = "light" | "dark";
type Mode = "read" | "edit";

const MD_RE = /\.(md|markdown|mdx)$/i;

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

export default function App() {
  const [theme, setTheme] = useState<Theme>(loadInitialTheme);
  const [mode, setMode] = useState<Mode>("read");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);
  const [searchCount, setSearchCount] = useState(0);
  const [searchFocusToken, setSearchFocusToken] = useState(0);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

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

  const loadFromPath = useCallback(async (path: string) => {
    try {
      const text = await readTextFile(path);
      setFilePath(path);
      setContent(text);
      setOriginalContent(text);
      setErrorMsg(null);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);

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
      await loadFromPath(path);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }, [loadFromPath]);

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
    await loadFromPath(filePath);
  }, [filePath, loadFromPath]);

  // Tauri drag-and-drop file handler
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    (async () => {
      try {
        unlisten = await getCurrentWebview().onDragDropEvent(async (event) => {
          const p = event.payload;
          if (p.type === "enter" || p.type === "over") {
            setIsDragging(true);
          } else if (p.type === "leave") {
            setIsDragging(false);
          } else if (p.type === "drop") {
            setIsDragging(false);
            const path = p.paths?.[0];
            if (!path) return;
            if (!MD_RE.test(path)) {
              setErrorMsg("Only .md / .markdown / .mdx files are supported");
              return;
            }
            await loadFromPath(path);
          }
        });
      } catch {
        // Not running under Tauri (e.g. plain browser dev). Silently ignore.
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, [loadFromPath]);

  const openSearch = useCallback(() => {
    if (!content) return;
    setSearchOpen(true);
    setSearchFocusToken((t) => t + 1);
  }, [content]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && searchOpen) {
        e.preventDefault();
        setSearchOpen(false);
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "o") { e.preventDefault(); handleOpen(); }
      else if (k === "s") { e.preventDefault(); handleSave(); }
      else if (k === "f") { e.preventDefault(); openSearch(); }
      else if (k === "e") {
        e.preventDefault();
        setMode((m) => (m === "edit" ? "read" : "edit"));
      }
      else if (k === "d") {
        e.preventDefault();
        setTheme((t) => (t === "light" ? "dark" : "light"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleOpen, handleSave, openSearch, searchOpen]);

  // Reset match index when query changes
  useEffect(() => {
    setSearchIndex(0);
  }, [searchQuery]);

  // Highlight search matches via CSS Custom Highlight API
  useEffect(() => {
    const container = contentRef.current;
    const registry = (CSS as unknown as { highlights?: HighlightRegistry }).highlights;
    if (!registry || typeof Highlight === "undefined") return;

    registry.delete("mdora-search-hit");
    registry.delete("mdora-search-current");

    if (!searchOpen || !searchQuery || !container) {
      setSearchCount(0);
      return;
    }

    const q = searchQuery.toLowerCase();
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        const parent = (node as Text).parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest("script, style")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const ranges: Range[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const text = n.nodeValue ?? "";
      const lower = text.toLowerCase();
      let idx = lower.indexOf(q);
      while (idx !== -1) {
        const r = new Range();
        r.setStart(n, idx);
        r.setEnd(n, idx + q.length);
        ranges.push(r);
        idx = lower.indexOf(q, idx + q.length);
      }
    }

    setSearchCount(ranges.length);
    if (ranges.length === 0) return;

    const safeIdx = ((searchIndex % ranges.length) + ranges.length) % ranges.length;
    const currentRange = ranges[safeIdx];
    const others = ranges.filter((_, i) => i !== safeIdx);

    if (others.length > 0) registry.set("mdora-search-hit", new Highlight(...others));
    registry.set("mdora-search-current", new Highlight(currentRange));

    const parentEl = currentRange.startContainer.parentElement;
    parentEl?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [searchOpen, searchQuery, searchIndex, content, mode, theme]);

  const stepSearch = useCallback((delta: number) => {
    setSearchIndex((i) => {
      if (searchCount === 0) return 0;
      return ((i + delta) % searchCount + searchCount) % searchCount;
    });
  }, [searchCount]);

  const dirty = content !== originalContent;
  const hasContent = content.length > 0;
  const wordCount = useMemo(() => {
    if (!hasContent) return 0;
    return content.trim().split(/\s+/).filter(Boolean).length;
  }, [content, hasContent]);

  return (
    <div className="h-full flex flex-col relative" style={{ background: "var(--bg)" }}>
      {/* Toolbar */}
      <header className="toolbar sticky top-0 z-30 flex items-center px-4 gap-3 select-none">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span style={{
            color: "var(--text-faint)",
            fontFamily: '"Geist Mono", monospace',
            fontSize: 12,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {filePath ? basename(filePath) : hasContent ? "untitled.md" : ""}
            {dirty ? <span style={{ color: "var(--accent)", marginLeft: 6 }}>●</span> : null}
          </span>
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
            onClick={() => setMode((m) => (m === "edit" ? "read" : "edit"))}
            disabled={!hasContent}
            style={!hasContent ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
            title="Toggle edit (Cmd/Ctrl+E)"
            aria-label="Toggle edit"
            data-active={mode === "edit"}
            aria-pressed={mode === "edit"}
          >
            <PencilSimple size={17} weight={mode === "edit" ? "fill" : "regular"} />
          </button>
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
      <main className="flex-1 min-h-0 flex flex-col relative">
        {!hasContent ? (
          <EmptyState onOpen={handleOpen} />
        ) : mode === "read" ? (
          <ReadPane content={content} themeKey={theme} contentRef={contentRef} />
        ) : (
          <EditPane
            content={content}
            onChange={setContent}
            themeKey={theme}
            editorRef={editorRef}
            contentRef={contentRef}
          />
        )}
        <SearchBar
          open={searchOpen && hasContent}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          count={searchCount}
          current={searchIndex}
          onPrev={() => stepSearch(-1)}
          onNext={() => stepSearch(1)}
          onClose={() => setSearchOpen(false)}
          focusToken={searchFocusToken}
        />
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

      {/* Drag-and-drop overlay */}
      {isDragging ? (
        <div className="drop-overlay" aria-hidden>
          <div className="drop-card">
            <FileText size={28} weight="duotone" color="var(--accent)" />
            <span>Drop a markdown file to open</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReadPane({
  content,
  themeKey,
  contentRef,
}: {
  content: string;
  themeKey: Theme;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div ref={contentRef} className="mx-auto py-12 px-8 rise" style={{ maxWidth: "min(72ch, 100%)" }}>
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
  contentRef,
}: {
  content: string;
  onChange: (s: string) => void;
  themeKey: Theme;
  editorRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
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
        <div ref={contentRef} className="mx-auto py-10 px-8" style={{ maxWidth: "min(70ch, 100%)" }}>
          <MarkdownView source={content} themeKey={themeKey} />
        </div>
      </div>
    </div>
  );
}
