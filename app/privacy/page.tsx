import Link from "next/link";
import { IQseaLogoSmall } from "../components/iqsea-logo";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="mb-8">
        <IQseaLogoSmall className="h-7 opacity-70 hover:opacity-100 transition-opacity" />
      </Link>

      <div className="w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
        <h1 className="text-xl font-semibold text-[var(--foreground)] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[var(--muted-foreground)] mb-6">
          Coming soon. For privacy questions in the meantime, email{" "}
          <a href="mailto:admin@iqsea.io" className="text-[var(--accent)] hover:underline">
            admin@iqsea.io
          </a>
          .
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 rounded-full border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          Back to homepage
        </Link>
      </div>
    </div>
  );
}
