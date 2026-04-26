import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

let counter = 0;
const nextId = () => `mdora-mmd-${++counter}`;

interface Props {
  chart: string;
  themeKey: string;
}

export function MermaidBlock({ chart, themeKey }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef<string>(nextId());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { svg } = await mermaid.render(idRef.current, chart);
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = svg;
        setError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setError(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, themeKey]);

  if (error) {
    return (
      <pre className="mermaid-card" style={{ color: "var(--hl-number)", fontSize: "0.85em" }}>
        Mermaid error: {error}
      </pre>
    );
  }

  return <div className="mermaid-card" ref={containerRef} />;
}
