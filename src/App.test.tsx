import { createElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  openDialog: vi.fn<(...a: unknown[]) => unknown>(),
  saveDialog: vi.fn<(...a: unknown[]) => unknown>(),
  readTextFile: vi.fn<(...a: unknown[]) => unknown>(),
  writeTextFile: vi.fn<(...a: unknown[]) => unknown>(),
  writeFile: vi.fn<(...a: unknown[]) => unknown>(),
  invoke: vi.fn<(...a: unknown[]) => unknown>(),
  listen: vi.fn<(...a: unknown[]) => Promise<() => void>>(async () => () => {}),
  onDragDropEvent: vi.fn<(...a: unknown[]) => Promise<() => void>>(async () => () => {}),
}));
const { openDialog, saveDialog, readTextFile, writeTextFile, writeFile, invoke } = mocks;

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: mocks.openDialog,
  save: mocks.saveDialog,
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: mocks.readTextFile,
  writeTextFile: mocks.writeTextFile,
  writeFile: mocks.writeFile,
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mocks.invoke,
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: mocks.listen,
}));

vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({ onDragDropEvent: mocks.onDragDropEvent }),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn(),
}));

vi.mock("mermaid", () => ({
  default: { initialize: vi.fn(), render: vi.fn() },
}));

const html2pdfMocks = vi.hoisted(() => ({
  outputPdf: vi.fn<(...a: unknown[]) => unknown>(async () => new ArrayBuffer(8)),
}));

vi.mock("html2pdf.js", () => {
  const worker: Record<string, unknown> = {};
  worker.set = vi.fn(() => worker);
  worker.from = vi.fn(() => worker);
  worker.toPdf = vi.fn(() => worker);
  worker.outputPdf = html2pdfMocks.outputPdf;
  const html2pdf = vi.fn(() => worker);
  return { default: html2pdf };
});

vi.mock("./components/MarkdownView", () => ({
  MarkdownView: ({ source }: { source: string }) => {
    const lines = source.split("\n");
    return (
      <div data-testid="markdown-stub">
        {lines.map((line, i) => {
          const m = /^(#{1,6})\s+(.+)$/.exec(line);
          if (m) {
            const level = m[1].length;
            const text = m[2];
            const id = text.toLowerCase().replace(/\s+/g, "-");
            return createElement(`h${level}`, { key: i, id }, text);
          }
          return line ? <p key={i}>{line}</p> : null;
        })}
      </div>
    );
  },
}));

import App from "./App";

describe("App shell", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    openDialog.mockReset();
    saveDialog.mockReset();
    readTextFile.mockReset();
    writeTextFile.mockReset();
    writeFile.mockReset();
    invoke.mockReset();
    invoke.mockResolvedValue(null);
    html2pdfMocks.outputPdf.mockClear();
    html2pdfMocks.outputPdf.mockImplementation(async () => new ArrayBuffer(8));
  });

  it("shows the empty state when no file is loaded", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /quiet place for markdown/i })).toBeInTheDocument();
  });

  it("disables save and reload while empty", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /^save$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /reload from disk/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /toggle edit/i })).toBeDisabled();
  });

  it("disables the export as PDF button while empty", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /export as pdf/i })).toBeDisabled();
  });

  it("opens a save dialog with PDF filters when the export as PDF button is clicked", async () => {
    openDialog.mockResolvedValueOnce("/tmp/notes.md");
    readTextFile.mockResolvedValueOnce("# Hello");
    saveDialog.mockResolvedValueOnce("/tmp/notes.pdf");
    render(<App />);
    await userEvent.click(screen.getAllByRole("button", { name: /open file/i })[0]);
    await screen.findByTestId("markdown-stub");

    const exportButton = screen.getByRole("button", { name: /export as pdf/i });
    expect(exportButton).not.toBeDisabled();
    await userEvent.click(exportButton);

    expect(saveDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ name: "PDF", extensions: ["pdf"] }],
        defaultPath: "notes.pdf",
      }),
    );
  });

  it("does not write a PDF when the save dialog is cancelled", async () => {
    openDialog.mockResolvedValueOnce("/tmp/notes.md");
    readTextFile.mockResolvedValueOnce("# Hello");
    saveDialog.mockResolvedValueOnce(null);
    render(<App />);
    await userEvent.click(screen.getAllByRole("button", { name: /open file/i })[0]);
    await screen.findByTestId("markdown-stub");

    await userEvent.click(screen.getByRole("button", { name: /export as pdf/i }));

    expect(writeFile).not.toHaveBeenCalled();
  });

  it("writes the generated PDF bytes to the chosen path", async () => {
    openDialog.mockResolvedValueOnce("/tmp/notes.md");
    readTextFile.mockResolvedValueOnce("# Hello");
    saveDialog.mockResolvedValueOnce("/tmp/notes.pdf");
    render(<App />);
    await userEvent.click(screen.getAllByRole("button", { name: /open file/i })[0]);
    await screen.findByTestId("markdown-stub");

    await userEvent.click(screen.getByRole("button", { name: /export as pdf/i }));

    expect(writeFile).toHaveBeenCalledTimes(1);
    const [path, data] = writeFile.mock.calls[0];
    expect(path).toBe("/tmp/notes.pdf");
    expect(data).toBeInstanceOf(Uint8Array);
  });

  it("shows an error and re-enables export when writing the PDF fails", async () => {
    openDialog.mockResolvedValueOnce("/tmp/notes.md");
    readTextFile.mockResolvedValueOnce("# Hello");
    saveDialog.mockResolvedValueOnce("/tmp/notes.pdf");
    writeFile.mockRejectedValueOnce(new Error("disk full"));
    render(<App />);
    await userEvent.click(screen.getAllByRole("button", { name: /open file/i })[0]);
    await screen.findByTestId("markdown-stub");

    const exportButton = screen.getByRole("button", { name: /export as pdf/i });
    await userEvent.click(exportButton);

    expect(await screen.findByText("disk full")).toBeInTheDocument();
    expect(exportButton).not.toBeDisabled();
    expect(document.querySelector(".pdf-export-mode")).toBeNull();
  });

  it("shows an error and re-enables export when PDF generation fails", async () => {
    openDialog.mockResolvedValueOnce("/tmp/notes.md");
    readTextFile.mockResolvedValueOnce("# Hello");
    saveDialog.mockResolvedValueOnce("/tmp/notes.pdf");
    html2pdfMocks.outputPdf.mockRejectedValueOnce(new Error("render failed"));
    render(<App />);
    await userEvent.click(screen.getAllByRole("button", { name: /open file/i })[0]);
    await screen.findByTestId("markdown-stub");

    const exportButton = screen.getByRole("button", { name: /export as pdf/i });
    await userEvent.click(exportButton);

    expect(await screen.findByText("render failed")).toBeInTheDocument();
    expect(exportButton).not.toBeDisabled();
    expect(writeFile).not.toHaveBeenCalled();
    expect(document.querySelector(".pdf-export-mode")).toBeNull();
    expect(document.querySelector(".pdf-export-mode-scroll")).toBeNull();
  });

  it("toggles dark class on the html root when the theme button is clicked", async () => {
    render(<App />);
    const before = document.documentElement.classList.contains("dark");
    await userEvent.click(screen.getByRole("button", { name: /toggle theme/i }));
    expect(document.documentElement.classList.contains("dark")).toBe(!before);
    expect(localStorage.getItem("mdora.theme")).toBe(before ? "light" : "dark");
  });

  it("loads a file picked from the dialog and renders its content", async () => {
    openDialog.mockResolvedValueOnce("/tmp/notes.md");
    readTextFile.mockResolvedValueOnce("# Hello");
    render(<App />);

    await userEvent.click(screen.getAllByRole("button", { name: /open file/i })[0]);

    expect(openDialog).toHaveBeenCalledTimes(1);
    expect(readTextFile).toHaveBeenCalledWith("/tmp/notes.md");
    expect(await screen.findByTestId("markdown-stub")).toHaveTextContent("Hello");
    expect(screen.getByText("notes.md")).toBeInTheDocument();
  });

  it("ignores a dialog cancel without erroring", async () => {
    openDialog.mockResolvedValueOnce(null);
    render(<App />);
    await userEvent.click(screen.getAllByRole("button", { name: /open file/i })[0]);
    expect(readTextFile).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: /quiet place for markdown/i })).toBeInTheDocument();
  });
});

async function loadMarkdown(content: string) {
  openDialog.mockResolvedValueOnce("/tmp/doc.md");
  readTextFile.mockResolvedValueOnce(content);
  render(<App />);
  await userEvent.click(screen.getAllByRole("button", { name: /open file/i })[0]);
  await screen.findByTestId("markdown-stub");
}

describe("App TOC", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    openDialog.mockReset();
    saveDialog.mockReset();
    readTextFile.mockReset();
    writeTextFile.mockReset();
    writeFile.mockReset();
    invoke.mockReset();
    invoke.mockResolvedValue(null);
  });

  it("renders the TOC toggle button in the toolbar", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /toggle table of contents/i })).toBeInTheDocument();
  });

  it("disables the TOC button when there is no content", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /toggle table of contents/i })).toBeDisabled();
  });

  it("disables the TOC button when the document has fewer than 2 headings", async () => {
    await loadMarkdown("# Only one\n\nsome text");
    expect(screen.getByRole("button", { name: /toggle table of contents/i })).toBeDisabled();
  });

  it("renders the TOC panel when the document has at least 2 headings", async () => {
    await loadMarkdown("# A\n\n## B\n\nbody");
    expect(screen.getByRole("navigation", { name: /table of contents/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^A$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^B$/ })).toBeInTheDocument();
  });

  it("toggles TOC visibility on button click and persists state to localStorage", async () => {
    await loadMarkdown("# A\n\n## B");
    const toggle = screen.getByRole("button", { name: /toggle table of contents/i });
    expect(screen.queryByRole("navigation", { name: /table of contents/i })).toBeInTheDocument();
    await userEvent.click(toggle);
    expect(screen.queryByRole("navigation", { name: /table of contents/i })).not.toBeInTheDocument();
    expect(localStorage.getItem("mdora.toc.open")).toBe("false");
    await userEvent.click(toggle);
    expect(screen.queryByRole("navigation", { name: /table of contents/i })).toBeInTheDocument();
    expect(localStorage.getItem("mdora.toc.open")).toBe("true");
  });

  it("restores TOC closed state from localStorage on mount", async () => {
    localStorage.setItem("mdora.toc.open", "false");
    await loadMarkdown("# A\n\n## B");
    expect(screen.queryByRole("navigation", { name: /table of contents/i })).not.toBeInTheDocument();
  });

  it("toggles the TOC via Cmd+\\ keyboard shortcut", async () => {
    await loadMarkdown("# A\n\n## B");
    expect(screen.queryByRole("navigation", { name: /table of contents/i })).toBeInTheDocument();
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "\\", metaKey: true, bubbles: true }),
      );
    });
    expect(screen.queryByRole("navigation", { name: /table of contents/i })).not.toBeInTheDocument();
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "\\", ctrlKey: true, bubbles: true }),
      );
    });
    expect(screen.queryByRole("navigation", { name: /table of contents/i })).toBeInTheDocument();
  });

  it("keeps the TOC visible when switching from read to edit mode", async () => {
    await loadMarkdown("# A\n\n## B");
    expect(screen.queryByRole("navigation", { name: /table of contents/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /toggle edit/i }));
    expect(screen.queryByRole("navigation", { name: /table of contents/i })).toBeInTheDocument();
  });
});
