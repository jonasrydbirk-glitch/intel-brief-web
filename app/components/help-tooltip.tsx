"use client";

/**
 * HelpTooltip — "?" icon with examples popover.
 *
 * Works on both desktop (hover) and mobile (tap to open, tap-outside to close).
 * Previously was pure CSS hover (group-hover) which was invisible on touch devices.
 *
 * Fix: click/tap toggle via useState + useEffect click-outside-to-dismiss.
 * Desktop keeps hover-open behaviour via onMouseEnter/onMouseLeave on both
 * the trigger button and the popover (small delay prevents flicker mid-transit).
 */

import { useState, useEffect, useRef, useCallback } from "react";

interface HelpTooltipProps {
  examples: string[];
}

export function HelpTooltip({ examples }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Desktop hover helpers (with flicker-prevention delay on leave) ---
  const show = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    hideTimer.current = setTimeout(() => setOpen(false), 80);
  }, []);

  // --- Touch: click-outside-to-dismiss ---
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <span className="relative inline-flex ml-1.5" style={{ verticalAlign: "middle" }}>
      {/* Trigger button — click for mobile, hover for desktop */}
      <button
        type="button"
        aria-label="Show examples"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation(); // prevent immediate close via document listener
          setOpen((v) => !v);
        }}
        onMouseEnter={show}
        onMouseLeave={hide}
        className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center text-[10px] font-bold cursor-help transition-colors select-none ${
          open
            ? "border-[var(--accent)] text-[var(--accent)]"
            : "border-[var(--muted-foreground)]/40 text-[var(--muted-foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        }`}
      >
        ?
      </button>

      {/* Popover — conditional render so it's fully removed when hidden */}
      {open && (
        <span
          role="tooltip"
          onMouseEnter={show}
          onMouseLeave={hide}
          onClick={(e) => e.stopPropagation()} // keep open when clicking inside
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 rounded-lg bg-[var(--navy-700)] border border-[var(--border)] px-3.5 py-2.5 text-xs leading-relaxed text-[var(--slate-100)] z-50 shadow-lg"
          style={{ pointerEvents: "auto" }}
        >
          <span className="font-semibold text-[var(--accent)] block mb-1">Examples:</span>
          <ul className="space-y-0.5 list-disc list-inside marker:text-[var(--accent)]">
            {examples.map((ex, i) => (
              <li key={i}>{ex}</li>
            ))}
          </ul>
        </span>
      )}
    </span>
  );
}
