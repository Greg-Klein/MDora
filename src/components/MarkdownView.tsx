import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
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
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ className, children, ...props }) {
            const lang = /language-(\w+)/.exec(className || "")?.[1];
            if (lang === "mermaid") {
              const text = String(children ?? "").replace(/\n$/, "");
              return <MermaidBlock chart={text} themeKey={themeKey} />;
            }
            return <code className={className} {...props}>{children}</code>;
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </article>
  );
}
