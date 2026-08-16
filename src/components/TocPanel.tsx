import { useCallback, useEffect, useRef, useState } from "react";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6";
const REFRESH_DEBOUNCE_MS = 200;

function extractHeadings(container: HTMLElement): TocItem[] {
  const nodes = container.querySelectorAll<HTMLHeadingElement>(HEADING_SELECTOR);
  const out: TocItem[] = [];
  nodes.forEach((node) => {
    if (!node.id) return;
    const level = parseInt(node.tagName.slice(1), 10);
    const text = (node.textContent ?? "").trim();
    if (!text) return;
    out.push({ id: node.id, text, level });
  });
  return out;
}

function listKey(items: TocItem[]): string {
  return items.map((it) => `${it.id}|${it.level}`).join("\n");
}

export function useHeadings(
  contentRef: React.MutableRefObject<HTMLDivElement | null>,
  content: string,
  modeKey: string,
): TocItem[] {
  const [items, setItems] = useState<TocItem[]>([]);
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    const container = contentRef.current;
    if (!container) {
      lastKeyRef.current = "";
      setItems([]);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      const next = extractHeadings(container);
      const key = listKey(next);
      if (key === lastKeyRef.current) return;
      lastKeyRef.current = key;
      setItems(next);
    };

    refresh();

    const observer = new MutationObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(refresh, REFRESH_DEBOUNCE_MS);
    });
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [contentRef, content, modeKey]);

  return items;
}

interface Props {
  items: TocItem[];
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
  modeKey: string;
}

export function TocPanel({ items, contentRef, modeKey }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      setActiveId(null);
      return;
    }
    setActiveId((prev) => {
      if (prev !== null && items.some((it) => it.id === prev)) return prev;
      return items[0].id;
    });
  }, [items]);

  useEffect(() => {
    if (items.length === 0) return;
    const container = contentRef.current;
    if (!container) return;
    const root = container.parentElement;
    if (!root) return;
    if (typeof IntersectionObserver === "undefined") return;

    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        if (visible.size === 0) return;
        let bestId: string | null = null;
        let bestTop = Number.POSITIVE_INFINITY;
        visible.forEach((id) => {
          const el = document.getElementById(id);
          if (!el) return;
          const top = el.getBoundingClientRect().top;
          if (top < bestTop) {
            bestTop = top;
            bestId = id;
          }
        });
        if (bestId !== null) setActiveId(bestId);
      },
      {
        root,
        rootMargin: "0px 0px -70% 0px",
        threshold: 0,
      },
    );

    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items, contentRef, modeKey]);

  const onClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  }, []);

  if (items.length < 2) return null;

  return (
    <nav className="toc-panel" aria-label="Table of contents">
      <h2 className="toc-title">Contents</h2>
      <ul className="toc-list">
        {items.map((it) => {
          const isActive = it.id === activeId;
          return (
            <li key={it.id}>
              <button
                type="button"
                className={`toc-item${isActive ? " toc-item--active" : ""}`}
                style={{ paddingLeft: `${(it.level - 1) * 10 + 8}px` }}
                onClick={() => onClick(it.id)}
                title={it.text}
                aria-current={isActive ? "location" : undefined}
              >
                {it.text}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
