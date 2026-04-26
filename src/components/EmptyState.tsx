import { FileText, FolderOpen } from "@phosphor-icons/react";

interface Props {
  onOpen: () => void;
}

export function EmptyState({ onOpen }: Props) {
  return (
    <div className="relative flex-1 flex items-center justify-center overflow-hidden">
      <div className="dotgrid absolute inset-0 pointer-events-none" />
      <div className="empty-content relative z-10 max-w-[520px] text-center px-8 rise">
        <div className="empty-icon">
          <FileText size={26} weight="duotone" color="var(--accent)" />
        </div>
        <h1 className="empty-title">A quiet place for markdown</h1>
        <p className="empty-lead">
          Open any <code>.md</code> file to read it with proper typography, syntax highlighting and Mermaid graphs. Drag-and-drop a file works too.
        </p>
        <div className="flex items-center justify-center">
          <button className="btn" data-variant="primary" onClick={onOpen}>
            <FolderOpen size={15} weight="bold" />
            Open file
          </button>
        </div>
        <p className="empty-shortcuts">
          ⌘O OPEN · ⌘S SAVE · ⌘E TOGGLE EDIT · ⌘F FIND · ⌘D TOGGLE THEME
        </p>
      </div>
    </div>
  );
}
