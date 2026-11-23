"use client";

import { useEffect, useRef, useState } from "react";

interface YearSelectProps {
  value: number | "";
  onChange: (year: number) => void;
  options: readonly number[];
  placeholder?: string;
  id?: string;
}

/**
 * Themed dropdown for picking a year.
 * - Click / tap to open, click outside or Esc to close
 * - Keyboard: ArrowUp/Down, Home/End, Enter/Space to select, Tab closes
 * - Selected year shown in gold with a check mark
 */
export function YearSelect({
  value,
  onChange,
  options,
  placeholder = "Select year",
  id = "year-select",
}: YearSelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedIndex = options.findIndex((y) => y === value);
  const listId = `${id}-listbox`;

  function openList() {
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function choose(index: number) {
    const year = options[index];
    if (year !== undefined) onChange(year);
    setOpen(false);
    buttonRef.current?.focus();
  }

  // Close when clicking / tapping outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  // Keep the highlighted option scrolled into view
  useEffect(() => {
    if (!open || active < 0) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(i + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (active >= 0) choose(active);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        className={`auth-input flex w-full cursor-pointer items-center justify-between gap-3 text-left transition-colors duration-200 ${
          open ? "border-gold/70" : ""
        }`}
      >
        <span className={value ? "text-parchment" : "text-parchment/40"}>
          {value || placeholder}
        </span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className={`h-3.5 w-3.5 shrink-0 text-gold/70 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-activedescendant={
            active >= 0 ? `${id}-opt-${active}` : undefined
          }
          className="absolute left-0 right-0 z-30 mt-1.5 max-h-56 overflow-y-auto border border-gold/30 bg-[#0b0b0b]/95 py-1 shadow-[0_14px_36px_rgba(0,0,0,0.65)] backdrop-blur-md animate-fadeIn [scrollbar-color:rgba(217,164,65,0.4)_transparent] scrollbar-thin"
        >
          {options.map((yr, i) => {
            const isSelected = yr === value;
            const isActive = i === active;
            return (
              <li
                key={yr}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center justify-between px-3.5 py-2 font-sans text-[14px] transition-colors duration-100 ${
                  isActive ? "bg-gold/10" : ""
                } ${isSelected ? "text-gold" : "text-parchment/80"}`}
              >
                <span>{yr}</span>
                {isSelected && (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
