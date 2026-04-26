import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { MermaidBlock } from "./MermaidBlock";

interface Props {
  source: string;
  themeKey: string;
}

export function MarkdownView({ source, themeKey }: Props) {
  return (
    <article className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          code({ className, children, ...props }) {
            const text = String(children ?? "").replace(/\n$/, "");
            const lang = /language-(\w+)/.exec(className || "")?.[1];
            const isInline = !className || !className.startsWith("language-");

            if (lang === "mermaid") {
              return <MermaidBlock chart={text} themeKey={themeKey} />;
            }
            if (isInline) {
              return <code className={className} {...props}>{children}</code>;
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </article>
  );
}
