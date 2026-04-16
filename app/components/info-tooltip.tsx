"use client";

/**
 * InfoTooltip — Phase 2 Part B, Build 4
 *
 * A small ⓘ icon that reveals a description on hover (desktop) or click
 * (touch devices). Used throughout the Intel Health dashboard to explain
 * what each metric means without cluttering the data display.
 *
 * Design: inline element that fits tightly after a metric label, dark admin
 * theme colours. The popover is positioned above the icon by default;
 * falls back gracefully if there is no room.
 *
 * Usage:
 *   <span className="text-xs text-muted-foreground">Dead link rate</span>
 *   <InfoTooltip text="Percentage of source URLs in the last 24h that returned a 4xx response." />
 */

import { useState, useRef, useCallback } from "react";

interface InfoTooltipProps {
  /** The description text shown in the popover. */
  text: string;
  /** Optional extra className for the wrapper span. */
  className?: string;
}

export function InfoTooltip({ text, className = "" }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    // Small delay prevents flicker when moving between the icon and popover
    hideTimer.current = setTimeout(() => setVisible(false), 80);
  }, []);

  const toggle = useCallback(() => {
    setVisible((v) => !v);
  }, []);

  return (
    <span
      className={`relative inline-flex items-center ${className}`}
      style={{ verticalAlign: "middle" }}
    >
      {/* ⓘ icon button */}
      <button
        type="button"
        aria-label="More information"
        aria-expanded={visible}
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={toggle}
        className="ml-1 flex items-center justify-center rounded-full text-[var(--muted-foreground)] hover:text-[var(--slate-300)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--teal-500)] transition-colors"
        style={{ width: 14, height: 14, flexShrink: 0 }}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          width={13}
          height={13}
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="7" />
          <line x1="8" y1="7" x2="8" y2="11" />
          <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      </button>

      {/* Popover */}
      {visible && (
        <span
          role="tooltip"
          onMouseEnter={show}
          onMouseLeave={hide}
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            minWidth: 200,
            maxWidth: 280,
            pointerEvents: "auto",
          }}
          className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--navy-900)] shadow-lg text-[11px] text-[var(--slate-300)] font-[family-name:var(--font-geist-mono)] leading-relaxed whitespace-normal"
        >
          {text}
          {/* Arrow pointing down */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: -5,
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
              width: 8,
              height: 8,
              background: "var(--navy-900)",
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
            }}
          />
        </span>
      )}
    </span>
  );
}
