"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        localStorage.removeItem("iqsea_subscriber_id");
        localStorage.removeItem("iqsea_email");
        router.push("/login");
      }}
      className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-sm"
    >
      Sign Out
    </button>
  );
}
