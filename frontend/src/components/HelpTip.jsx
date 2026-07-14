import { useState } from "react";

export default function HelpTip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Help"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        className="ml-1 h-4 w-4 rounded-full border border-muted/40 text-muted text-[10px] leading-none flex items-center justify-center hover:bg-command hover:text-white hover:border-command transition-colors"
      >
        ?
      </button>
      {open && (
        <span className="absolute left-5 top-0 z-20 w-56 rounded-md bg-command text-white text-xs leading-relaxed px-3 py-2 shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}
