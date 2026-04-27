import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownView } from "./MarkdownView";

vi.mock("./MermaidBlock", () => ({
  MermaidBlock: ({ chart }: { chart: string }) => (
    <div data-testid="mermaid-stub">{chart}</div>
  ),
}));

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (p: string) => {
    const prefix = p.startsWith("/") ? "" : "/";
    return "asset://localhost" + prefix + encodeURI(p);
  },
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

  it("passes through https image sources unchanged", () => {
    const { container } = render(
      <MarkdownView
        source={"![remote](https://example.com/x.png)"}
        themeKey="light"
        filePath="/Users/g/notes/doc.md"
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://example.com/x.png");
  });

  it("passes through http image sources unchanged", () => {
    const { container } = render(
      <MarkdownView
        source={"![remote](http://example.com/x.png)"}
        themeKey="light"
        filePath="/Users/g/notes/doc.md"
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("http://example.com/x.png");
  });

  it("passes through data: image sources unchanged", () => {
    const md = "![inline](data:image/png;base64,xxx)";
    const { container } = render(
      <MarkdownView source={md} themeKey="light" filePath="/Users/g/notes/doc.md" />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("data:image/png;base64,xxx");
  });

  it("rewrites a sibling relative image to an asset URL", () => {
    const { container } = render(
      <MarkdownView
        source={"![local](./photo.png)"}
        themeKey="light"
        filePath="/Users/g/notes/doc.md"
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe(
      "asset://localhost/Users/g/notes/photo.png",
    );
  });

  it("rewrites a parent-directory relative image to an asset URL", () => {
    const { container } = render(
      <MarkdownView
        source={"![logo](../shared/logo.svg)"}
        themeKey="light"
        filePath="/Users/g/notes/doc.md"
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe(
      "asset://localhost/Users/g/shared/logo.svg",
    );
  });

  it("rewrites an absolute filesystem image to an asset URL", () => {
    const { container } = render(
      <MarkdownView
        source={"![abs](/abs/img.png)"}
        themeKey="light"
        filePath="/Users/g/notes/doc.md"
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("asset://localhost/abs/img.png");
  });

  it("leaves relative images untouched when filePath is null", () => {
    const { container } = render(
      <MarkdownView
        source={"![local](./photo.png)"}
        themeKey="light"
        filePath={null}
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("./photo.png");
  });

  it("strips query strings on relative image paths before resolving", () => {
    const { container } = render(
      <MarkdownView
        source={"![v](./photo.png?v=2)"}
        themeKey="light"
        filePath="/Users/g/notes/doc.md"
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe(
      "asset://localhost/Users/g/notes/photo.png",
    );
  });

  it("strips fragment on relative image paths before resolving", () => {
    const { container } = render(
      <MarkdownView
        source={"![v](./photo.png#anchor)"}
        themeKey="light"
        filePath="/Users/g/notes/doc.md"
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe(
      "asset://localhost/Users/g/notes/photo.png",
    );
  });

  it("decodes percent-encoded characters before resolving", () => {
    const { container } = render(
      <MarkdownView
        source={"![v](./my%20image.png)"}
        themeKey="light"
        filePath="/Users/g/notes/doc.md"
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe(
      "asset://localhost/Users/g/notes/my%20image.png",
    );
  });

  it("decodes multi-byte percent-encoded characters", () => {
    const { container } = render(
      <MarkdownView
        source={"![v](./caf%C3%A9.png)"}
        themeKey="light"
        filePath="/Users/g/notes/doc.md"
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe(
      "asset://localhost/Users/g/notes/caf%C3%A9.png",
    );
  });

  it("blanks out javascript: image sources", () => {
    const { container } = render(
      <MarkdownView
        source={"![x](javascript:alert(1))"}
        themeKey="light"
        filePath="/Users/g/notes/doc.md"
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src") || "").toBe("");
  });

  it("blanks out vbscript: image sources", () => {
    const { container } = render(
      <MarkdownView
        source={"![x](vbscript:msgbox(1))"}
        themeKey="light"
        filePath="/Users/g/notes/doc.md"
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src") || "").toBe("");
  });

  it("blanks out file:// image sources", () => {
    const { container } = render(
      <MarkdownView
        source={"![x](file:///etc/passwd)"}
        themeKey="light"
        filePath="/Users/g/notes/doc.md"
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src") || "").toBe("");
  });

  it("blanks out mailto: image sources", () => {
    const { container } = render(
      <MarkdownView
        source={"![x](mailto:victim@example.com)"}
        themeKey="light"
        filePath="/Users/g/notes/doc.md"
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src") || "").toBe("");
  });
});
