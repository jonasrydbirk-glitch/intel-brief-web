export function HelpTooltip({ examples }: { examples: string[] }) {
  return (
    <span className="relative group inline-flex ml-1.5">
      <span className="w-4.5 h-4.5 rounded-full border border-[var(--muted-foreground)]/40 flex items-center justify-center text-[10px] font-bold text-[var(--muted-foreground)] cursor-help hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
        ?
      </span>
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 rounded-lg bg-[var(--navy-700)] border border-[var(--border)] px-3.5 py-2.5 text-xs leading-relaxed text-[var(--slate-100)] opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
        <span className="font-semibold text-[var(--accent)] block mb-1">Examples:</span>
        <ul className="space-y-0.5 list-disc list-inside marker:text-[var(--accent)]">
          {examples.map((ex, i) => <li key={i}>{ex}</li>)}
        </ul>
      </span>
    </span>
  );
}
