import { useEffect, useRef } from "react";
import { CaretUp, CaretDown, X } from "@phosphor-icons/react";

interface Props {
  open: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  count: number;
  current: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  focusToken: number;
}

export function SearchBar({
  open,
  query,
  onQueryChange,
  count,
  current,
  onPrev,
  onNext,
  onClose,
  focusToken,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [open, focusToken]);

  if (!open) return null;

  const counter = query ? (count > 0 ? `${current + 1}/${count}` : "0/0") : "";

  return (
    <div className="search-bar rise" role="search">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Find in document"
        spellCheck={false}
        aria-label="Find in document"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
          }
        }}
      />
      <span className="search-count">{counter}</span>
      <button
        type="button"
        onClick={onPrev}
        disabled={count === 0}
        aria-label="Previous match"
        title="Previous (Shift+Enter)"
      >
        <CaretUp size={13} weight="bold" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={count === 0}
        aria-label="Next match"
        title="Next (Enter)"
      >
        <CaretDown size={13} weight="bold" />
      </button>
      <button type="button" onClick={onClose} aria-label="Close search" title="Close (Esc)">
        <X size={13} weight="bold" />
      </button>
    </div>
  );
}
