import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "./SearchBar";

const baseProps = {
  open: true,
  query: "",
  onQueryChange: () => {},
  count: 0,
  current: 0,
  onPrev: () => {},
  onNext: () => {},
  onClose: () => {},
  focusToken: 0,
};

describe("SearchBar", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<SearchBar {...baseProps} open={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("focuses the input on open", () => {
    render(<SearchBar {...baseProps} />);
    expect(screen.getByLabelText(/find in document/i)).toHaveFocus();
  });

  it("emits onQueryChange while typing", async () => {
    const onQueryChange = vi.fn();
    render(<SearchBar {...baseProps} onQueryChange={onQueryChange} />);
    await userEvent.type(screen.getByLabelText(/find in document/i), "abc");
    expect(onQueryChange).toHaveBeenCalledTimes(3);
    expect(onQueryChange).toHaveBeenLastCalledWith("c");
  });

  it("shows the match counter when there are hits", () => {
    render(<SearchBar {...baseProps} query="foo" count={5} current={2} />);
    expect(screen.getByText("3/5")).toBeInTheDocument();
  });

  it("disables nav buttons when there are no matches", () => {
    render(<SearchBar {...baseProps} query="foo" count={0} />);
    expect(screen.getByRole("button", { name: /previous match/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next match/i })).toBeDisabled();
  });

  it("triggers onNext on Enter and onPrev on Shift+Enter", async () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(<SearchBar {...baseProps} onPrev={onPrev} onNext={onNext} count={3} />);
    const input = screen.getByLabelText(/find in document/i);
    await userEvent.type(input, "{Enter}");
    expect(onNext).toHaveBeenCalledTimes(1);
    await userEvent.type(input, "{Shift>}{Enter}{/Shift}");
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    render(<SearchBar {...baseProps} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /close search/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
