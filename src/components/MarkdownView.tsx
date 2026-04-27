import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { convertFileSrc } from "@tauri-apps/api/core";
import { MermaidBlock } from "./MermaidBlock";
import { resolveImagePath } from "../lib/paths";

interface Props {
  source: string;
  themeKey: string;
  filePath?: string | null;
}

const PASSTHROUGH_RE = /^(https?:|data:|blob:|asset:)/i;

function imageSafeUrlTransform(value: string): string {
  if (!value) return value;
  if (PASSTHROUGH_RE.test(value)) return value;
  const colon = value.indexOf(":");
  const slash = value.indexOf("/");
  const question = value.indexOf("?");
  const hash = value.indexOf("#");
  if (
    colon === -1 ||
    (slash !== -1 && colon > slash) ||
    (question !== -1 && colon > question) ||
    (hash !== -1 && colon > hash)
  ) {
    return value;
  }
  return "";
}

export function MarkdownView({ source, themeKey, filePath = null }: Props) {
  return (
    <article className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        urlTransform={imageSafeUrlTransform}
        components={{
          code({ className, children, ...props }) {
            const lang = /language-(\w+)/.exec(className || "")?.[1];
            if (lang === "mermaid") {
              const text = String(children ?? "").replace(/\n$/, "");
              return <MermaidBlock chart={text} themeKey={themeKey} />;
            }
            return <code className={className} {...props}>{children}</code>;
          },
          img({ src, ...rest }) {
            if (!src || typeof src !== "string") {
              return <img src={src} {...rest} />;
            }
            if (PASSTHROUGH_RE.test(src)) {
              return <img src={src} {...rest} />;
            }
            if (!filePath) {
              return <img src={src} {...rest} />;
            }
            const resolved = convertFileSrc(resolveImagePath(filePath, src));
            return <img src={resolved} {...rest} />;
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </article>
  );
}
