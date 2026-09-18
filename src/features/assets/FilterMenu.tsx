import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  label: string;
  // What's chosen, shown on the button so the filter is readable while closed.
  summary: string;
  children: ReactNode;
}

// A dropdown holding checkboxes. Used on narrow screens, where a row of boxes
// per filter costs more height than the grid can spare.
export function FilterMenu({ label, summary, children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Clicking away or pressing Escape closes it, like a native select.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="filter-menu" ref={ref}>
      <button
        className="filter-menu__button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="muted">{label}</span> {summary}
      </button>
      {open && <div className="filter-menu__panel">{children}</div>}
    </div>
  );
}

// "All" reads better than "none chosen": an empty filter shows everything.
export function summarize<T>(selected: T[], label: (value: T) => string): string {
  const [first] = selected;
  if (first === undefined) return "All";
  if (selected.length === 1) return label(first);
  return `${selected.length} selected`;
}
