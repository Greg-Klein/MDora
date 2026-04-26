import { FileText, FolderOpen, Lightning } from "@phosphor-icons/react";

interface Props {
  onOpen: () => void;
  onSample: () => void;
}

export function EmptyState({ onOpen, onSample }: Props) {
  return (
    <div className="relative flex-1 flex items-center justify-center overflow-hidden">
      <div className="dotgrid absolute inset-0 pointer-events-none" />
      <div className="relative z-10 max-w-[520px] text-center px-8 rise">
        <div className="inline-flex items-center justify-center mb-6"
             style={{
               width: 56, height: 56, borderRadius: 14,
               background: "var(--surface)",
               border: "1px solid var(--border)",
               boxShadow: "0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -10px rgba(0,0,0,0.06)",
             }}>
          <FileText size={26} weight="duotone" color="var(--accent)" />
        </div>
        <h1 style={{
          fontSize: "1.85rem",
          fontWeight: 600,
          letterSpacing: "-0.022em",
          marginBottom: "0.5rem",
        }}>
          A quiet place for markdown
        </h1>
        <p style={{
          color: "var(--text-muted)",
          lineHeight: 1.6,
          marginBottom: "1.6rem",
          fontSize: 15,
        }}>
          Open any <code style={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: "0.88em",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            padding: "0.05em 0.4em",
            borderRadius: 4,
          }}>.md</code> file to read it with proper typography, syntax highlighting and Mermaid graphs.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button className="btn" data-variant="primary" onClick={onOpen}>
            <FolderOpen size={15} weight="bold" />
            Open file
          </button>
          <button className="btn" onClick={onSample}>
            <Lightning size={15} weight="bold" />
            Load sample
          </button>
        </div>
        <p style={{
          marginTop: "2rem",
          fontFamily: '"Geist Mono", monospace',
          fontSize: 11.5,
          color: "var(--text-faint)",
          letterSpacing: "0.04em",
        }}>
          ⌘O OPEN · ⌘E TOGGLE EDIT · ⌘D TOGGLE THEME
        </p>
      </div>
    </div>
  );
}
