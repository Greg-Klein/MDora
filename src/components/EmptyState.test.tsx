import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the welcome copy and the open button", () => {
    render(<EmptyState onOpen={() => {}} />);
    expect(screen.getByRole("heading", { name: /quiet place for markdown/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open file/i })).toBeInTheDocument();
  });

  it("calls onOpen when the open button is clicked", async () => {
    const onOpen = vi.fn();
    render(<EmptyState onOpen={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: /open file/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
