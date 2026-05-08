import { createElement, useRef } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TocPanel, useHeadings, type TocItem } from "./TocPanel";

function Harness({ items }: { items: TocItem[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <div>
      <div ref={ref} data-testid="content">
        {items.map((it) =>
          createElement(`h${it.level}`, { key: it.id, id: it.id }, it.text),
        )}
      </div>
      <TocPanel
        items={items}
        contentRef={ref as React.MutableRefObject<HTMLDivElement | null>}
        modeKey="read"
      />
    </div>
  );
}

const sampleItems: TocItem[] = [
  { id: "intro", text: "Intro", level: 1 },
  { id: "section-1", text: "Section 1", level: 2 },
  { id: "subsection-a", text: "Subsection A", level: 3 },
];

describe("TocPanel", () => {
  it("renders nothing when there are fewer than 2 headings", () => {
    const { container } = render(<Harness items={[sampleItems[0]]} />);
    expect(container.querySelector(".toc-panel")).toBeNull();
  });

  it("renders one button per heading with correct text", () => {
    render(<Harness items={sampleItems} />);
    expect(screen.getByRole("button", { name: /^Intro$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Section 1$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Subsection A$/ })).toBeInTheDocument();
  });

  it("wraps the list in a nav with aria-label Table of contents", () => {
    render(<Harness items={sampleItems} />);
    expect(screen.getByRole("navigation", { name: /table of contents/i })).toBeInTheDocument();
  });

  it("applies indentation based on heading level", () => {
    render(<Harness items={sampleItems} />);
    const h1Btn = screen.getByRole("button", { name: /^Intro$/ });
    const h2Btn = screen.getByRole("button", { name: /^Section 1$/ });
    const h3Btn = screen.getByRole("button", { name: /^Subsection A$/ });
    expect(h1Btn.style.paddingLeft).toBe("8px");
    expect(h2Btn.style.paddingLeft).toBe("18px");
    expect(h3Btn.style.paddingLeft).toBe("28px");
  });

  it("marks the first item active by default with aria-current location", () => {
    render(<Harness items={sampleItems} />);
    const first = screen.getByRole("button", { name: /^Intro$/ });
    expect(first).toHaveClass("toc-item--active");
    expect(first).toHaveAttribute("aria-current", "location");
  });

  it("calls scrollIntoView on the target heading and updates active state on click", async () => {
    const spy = vi.spyOn(Element.prototype, "scrollIntoView");
    render(<Harness items={sampleItems} />);
    const target = screen.getByRole("button", { name: /^Section 1$/ });
    await userEvent.click(target);
    expect(spy).toHaveBeenCalled();
    expect(target).toHaveClass("toc-item--active");
    expect(target).toHaveAttribute("aria-current", "location");
  });

  it("assigns title attribute equal to heading text for ellipsis tooltip", () => {
    render(<Harness items={sampleItems} />);
    expect(screen.getByRole("button", { name: /^Intro$/ })).toHaveAttribute("title", "Intro");
    expect(screen.getByRole("button", { name: /^Subsection A$/ })).toHaveAttribute(
      "title",
      "Subsection A",
    );
  });

  it("does not render heading entries that lack an id (defensive)", () => {
    const items: TocItem[] = [
      { id: "with-id", text: "Has id", level: 1 },
      { id: "second", text: "Second", level: 2 },
    ];
    render(<Harness items={items} />);
    expect(screen.getByRole("button", { name: /^Has id$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Second$/ })).toBeInTheDocument();
  });
});

function HookHarness({ html, modeKey = "read" }: { html: string; modeKey?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const items = useHeadings(ref, html, modeKey);
  return (
    <div>
      <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
      <output data-testid="count">{items.length}</output>
      <ul data-testid="items">
        {items.map((it) => (
          <li key={it.id}>{`${it.level}:${it.id}:${it.text}`}</li>
        ))}
      </ul>
    </div>
  );
}

describe("useHeadings", () => {
  it("extracts headings with ids and levels from the container", () => {
    const html = `<h1 id="title">Title</h1><h2 id="sec">Sec</h2><h3 id="sub">Sub</h3>`;
    render(<HookHarness html={html} />);
    const li = screen.getAllByRole("listitem").map((el) => el.textContent);
    expect(li).toEqual(["1:title:Title", "2:sec:Sec", "3:sub:Sub"]);
  });

  it("ignores headings without an id", () => {
    const html = `<h1>NoId</h1><h2 id="ok">Ok</h2>`;
    render(<HookHarness html={html} />);
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByRole("listitem").textContent).toBe("2:ok:Ok");
  });

  it("returns empty array when there are no headings", () => {
    render(<HookHarness html={`<p>plain paragraph</p>`} />);
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("extracts text from headings with inline markup", () => {
    const html = `<h1 id="bold"><strong>Bold</strong> heading</h1><h2 id="b">B</h2>`;
    render(<HookHarness html={html} />);
    expect(screen.getByText("1:bold:Bold heading")).toBeInTheDocument();
  });

  it("re-extracts headings when content prop changes", async () => {
    const { rerender } = render(<HookHarness html={`<h1 id="a">A</h1><h2 id="b">B</h2>`} />);
    expect(screen.getByTestId("count").textContent).toBe("2");
    await act(async () => {
      rerender(<HookHarness html={`<h1 id="x">X</h1>`} />);
    });
    expect(screen.getByTestId("count").textContent).toBe("1");
  });
});
