// The vendored html2pdf.js/type.d.ts wraps all its members inside a single
// `declare module "html2pdf.js" { ... }` block that also contains an
// `export default`. That combination makes every non-exported interface in
// that block (Html2PdfOptions, Html2PdfWorker, ...) private to that one
// file: TypeScript will not merge declarations for them from an augmenting
// `declare module "html2pdf.js" { ... }` block anywhere else (verified: the
// merge silently produces two disjoint `Html2PdfOptions` types instead of
// combining them, so an augmentation-based fix for the missing `pagebreak`
// option is not possible here).
//
// The published `@types/html2pdf.js` package fixes this but uses
// `export =`, which needs `esModuleInterop` (not enabled in this project's
// tsconfig) to work with the `import html2pdf from "html2pdf.js"` style
// already used everywhere else here. Flipping that flag project-wide was
// judged riskier than a small local shim.
//
// This file is wired in via tsconfig.json's `paths` so `tsc` type-checks
// against it instead of the vendored declaration. It only affects
// type-checking: Vite/vitest resolve the real package at runtime as usual.
declare module "html2pdf.js" {
  interface Html2PdfOptions {
    margin?: number | [number, number] | [number, number, number, number];
    filename?: string;
    image?: {
      type?: "jpeg" | "png" | "webp";
      quality?: number;
    };
    enableLinks?: boolean;
    html2canvas?: Record<string, unknown>;
    jsPDF?: {
      unit?: string;
      format?: string | [number, number];
      orientation?: "portrait" | "landscape";
    };
    pagebreak?: {
      mode?: string | string[];
      before?: string | string[];
      after?: string | string[];
      avoid?: string | string[];
    };
  }

  interface Html2PdfWorker {
    from(src: HTMLElement | string): this;
    to(target: "container" | "canvas" | "img" | "pdf"): this;
    toContainer(): this;
    toCanvas(): this;
    toImg(): this;
    toPdf(): this;
    outputPdf(type: "arraybuffer"): Promise<ArrayBuffer>;
    outputPdf(type?: string, options?: unknown): Promise<unknown>;
    save(filename?: string): Promise<void>;
    set(options: Html2PdfOptions): this;
  }

  interface Html2PdfStatic {
    (): Html2PdfWorker;
  }

  const html2pdf: Html2PdfStatic;
  export default html2pdf;
}
