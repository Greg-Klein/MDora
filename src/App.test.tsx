import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  openDialog: vi.fn<(...a: unknown[]) => unknown>(),
  saveDialog: vi.fn<(...a: unknown[]) => unknown>(),
  readTextFile: vi.fn<(...a: unknown[]) => unknown>(),
  writeTextFile: vi.fn<(...a: unknown[]) => unknown>(),
  invoke: vi.fn<(...a: unknown[]) => unknown>(),
  listen: vi.fn<(...a: unknown[]) => Promise<() => void>>(async () => () => {}),
  onDragDropEvent: vi.fn<(...a: unknown[]) => Promise<() => void>>(async () => () => {}),
}));
const { openDialog, saveDialog, readTextFile, writeTextFile, invoke } = mocks;

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: mocks.openDialog,
  save: mocks.saveDialog,
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: mocks.readTextFile,
  writeTextFile: mocks.writeTextFile,
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

vi.mock("./components/MarkdownView", () => ({
  MarkdownView: ({ source }: { source: string }) => (
    <div data-testid="markdown-stub">{source}</div>
  ),
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
    invoke.mockReset();
    invoke.mockResolvedValue(null);
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
    expect(await screen.findByTestId("markdown-stub")).toHaveTextContent("# Hello");
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
