import { useEffect, useId, useRef, useState } from "react";
import mermaid from "mermaid";

interface Props {
  chart: string;
  themeKey: string;
}

export function MermaidBlock({ chart, themeKey }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const renderCount = useRef(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        renderCount.current += 1;
        const id = `mdora-mmd-${baseId}-${renderCount.current}`;
        const { svg } = await mermaid.render(id, chart);
        if (cancelled || !containerRef.current) return;
        // Parse the SVG in an isolated document so any inert markup never executes,
        // then import the node into the live document. Defense-in-depth on top of
        // mermaid's strict securityLevel.
        const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
        const node = document.importNode(doc.documentElement, true);
        containerRef.current.replaceChildren(node);
        setError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setError(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, themeKey, baseId]);

  if (error) {
    return <pre className="mermaid-card mermaid-error">Mermaid error: {error}</pre>;
  }

  return <div className="mermaid-card" ref={containerRef} />;
}
