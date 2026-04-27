import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MermaidBlock } from "./MermaidBlock";

const renderMock = vi.fn();
vi.mock("mermaid", () => ({
  default: {
    render: (...args: unknown[]) => renderMock(...args),
  },
}));

describe("MermaidBlock", () => {
  beforeEach(() => {
    renderMock.mockReset();
  });

  it("renders the mermaid SVG into the live DOM via DOMParser (no innerHTML)", async () => {
    renderMock.mockResolvedValueOnce({
      svg: '<svg xmlns="http://www.w3.org/2000/svg" data-mdora-test="ok"><g></g></svg>',
    });
    render(<MermaidBlock chart="graph TD; A-->B" themeKey="light" />);

    await waitFor(() => {
      expect(document.querySelector("svg[data-mdora-test='ok']")).toBeInTheDocument();
    });
    expect(renderMock).toHaveBeenCalledTimes(1);
    const [, source] = renderMock.mock.calls[0];
    expect(source).toBe("graph TD; A-->B");
  });

  it("re-renders when chart or themeKey changes (fresh id each time)", async () => {
    renderMock.mockResolvedValue({
      svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    });
    const { rerender } = render(<MermaidBlock chart="A" themeKey="light" />);
    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(1));

    rerender(<MermaidBlock chart="B" themeKey="light" />);
    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(2));

    rerender(<MermaidBlock chart="B" themeKey="dark" />);
    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(3));

    const ids = renderMock.mock.calls.map((c) => c[0]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("surfaces a friendly error when mermaid throws", async () => {
    renderMock.mockRejectedValueOnce(new Error("Parse error: bad syntax"));
    render(<MermaidBlock chart="not a chart" themeKey="light" />);

    await waitFor(() => {
      expect(screen.getByText(/Mermaid error: Parse error: bad syntax/i)).toBeInTheDocument();
    });
  });
});
