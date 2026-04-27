import { describe, it, expect } from "vitest";
import { dirname, resolveImagePath } from "./paths";

describe("dirname", () => {
  it("returns parent directory for POSIX paths", () => {
    expect(dirname("/Users/g/notes/doc.md")).toBe("/Users/g/notes");
  });

  it("returns empty string for a bare filename", () => {
    expect(dirname("doc.md")).toBe("");
  });

  it("returns root for paths with separator at index 0 only", () => {
    expect(dirname("/foo")).toBe("/");
  });

  it("returns parent directory for Windows paths", () => {
    expect(dirname("C:\\Users\\g\\doc.md")).toBe("C:\\Users\\g");
  });
});

describe("resolveImagePath", () => {
  it("resolves ./photo.png next to a POSIX markdown file", () => {
    expect(resolveImagePath("/Users/g/notes/doc.md", "./photo.png")).toBe(
      "/Users/g/notes/photo.png",
    );
  });

  it("resolves a bare filename next to a POSIX markdown file", () => {
    expect(resolveImagePath("/Users/g/notes/doc.md", "photo.png")).toBe(
      "/Users/g/notes/photo.png",
    );
  });

  it("resolves ../shared/logo.svg by walking up the tree", () => {
    expect(resolveImagePath("/Users/g/notes/doc.md", "../shared/logo.svg")).toBe(
      "/Users/g/shared/logo.svg",
    );
  });

  it("returns absolute POSIX paths normalized", () => {
    expect(resolveImagePath("/Users/g/notes/doc.md", "/abs/img.png")).toBe(
      "/abs/img.png",
    );
  });

  it("resolves ./photo.png next to a Windows markdown file", () => {
    expect(
      resolveImagePath("C:\\Users\\g\\notes\\doc.md", "./photo.png"),
    ).toBe("C:\\Users\\g\\notes\\photo.png");
  });

  it("returns absolute Windows paths normalized", () => {
    expect(resolveImagePath("C:\\Users\\g\\doc.md", "C:\\abs.png")).toBe(
      "C:\\abs.png",
    );
  });

  it("returns the bare relative src when the markdown path has no directory", () => {
    expect(resolveImagePath("doc.md", "./img.png")).toBe("img.png");
  });

  it("strips a query string from the src before resolving", () => {
    expect(resolveImagePath("/Users/g/notes/doc.md", "./photo.png?v=2")).toBe(
      "/Users/g/notes/photo.png",
    );
  });

  it("strips a fragment from the src before resolving", () => {
    expect(resolveImagePath("/Users/g/notes/doc.md", "./photo.png#anchor")).toBe(
      "/Users/g/notes/photo.png",
    );
  });

  it("strips both query and fragment from the src", () => {
    expect(
      resolveImagePath("/Users/g/notes/doc.md", "./photo.png?v=2#anchor"),
    ).toBe("/Users/g/notes/photo.png");
  });

  it("decodes percent-encoded spaces in the src", () => {
    expect(resolveImagePath("/Users/g/notes/doc.md", "./my%20image.png")).toBe(
      "/Users/g/notes/my image.png",
    );
  });

  it("decodes multi-byte percent-encoded characters in the src", () => {
    expect(resolveImagePath("/Users/g/notes/doc.md", "./caf%C3%A9.png")).toBe(
      "/Users/g/notes/café.png",
    );
  });

  it("preserves a malformed percent sequence rather than throwing", () => {
    expect(resolveImagePath("/Users/g/notes/doc.md", "./bad%ZZ.png")).toBe(
      "/Users/g/notes/bad%ZZ.png",
    );
  });
});
