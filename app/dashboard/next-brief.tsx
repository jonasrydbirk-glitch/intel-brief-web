const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Every day",
  business: "Mon – Fri",
  "3x": "Mon, Wed, Fri",
  weekly: "Mondays",
};

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return time24;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

export function NextBriefSchedule({
  deliveryTime,
  timezone,
  frequency,
}: {
  deliveryTime: string;
  timezone: string;
  frequency: string;
}) {
  if (!deliveryTime || !timezone) {
    return (
      <div>
        <div className="text-lg font-semibold text-[var(--muted-foreground)]">
          --:--
        </div>
        <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
          Set delivery time in Settings
        </div>
      </div>
    );
  }

  const schedule = FREQUENCY_LABELS[frequency] || frequency;
  const time = formatTime12h(deliveryTime);

  return (
    <div>
      <div className="text-lg font-semibold">{time}</div>
      <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
        Scheduled: {schedule}
      </div>
    </div>
  );
}
