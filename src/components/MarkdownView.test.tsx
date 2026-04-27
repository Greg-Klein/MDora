import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownView } from "./MarkdownView";

vi.mock("./MermaidBlock", () => ({
  MermaidBlock: ({ chart }: { chart: string }) => (
    <div data-testid="mermaid-stub">{chart}</div>
  ),
}));

describe("MarkdownView", () => {
  it("renders basic markdown as semantic HTML", () => {
    render(<MarkdownView source={"# Title\n\nHello **world**"} themeKey="light" />);
    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByText("world").tagName.toLowerCase()).toBe("strong");
  });

  it("renders GFM tables via remark-gfm", () => {
    const md = "| a | b |\n|---|---|\n| 1 | 2 |";
    render(<MarkdownView source={md} themeKey="light" />);
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "a" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "1" })).toBeInTheDocument();
  });

  it("dispatches mermaid fences to MermaidBlock", () => {
    const md = "```mermaid\ngraph TD; A-->B\n```";
    render(<MarkdownView source={md} themeKey="dark" />);
    expect(screen.getByTestId("mermaid-stub")).toHaveTextContent("graph TD; A-->B");
  });

  it("renders non-mermaid code blocks as plain code", () => {
    const md = "```js\nconst x = 1;\n```";
    render(<MarkdownView source={md} themeKey="light" />);
    expect(screen.queryByTestId("mermaid-stub")).not.toBeInTheDocument();
    expect(document.querySelector("code")).toHaveTextContent("const x = 1;");
  });

  it("does not render raw HTML as live DOM (no rehype-raw)", () => {
    const md = "<script>window.__pwn = 1</script>\n\nhello";
    render(<MarkdownView source={md} themeKey="light" />);
    expect(document.querySelector("script")).toBeNull();
    expect(screen.getByText("hello")).toBeInTheDocument();
  });
});
