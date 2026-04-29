import Image from "next/image";

export function IQseaLogo({ className = "h-8" }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-white-compact.png"
      alt="IQSEA"
      width={2508}
      height={627}
      className={className}
      style={{ width: "auto" }}
      priority
    />
  );
}

export function IQseaLogoSmall({ className = "h-6" }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-white-compact.png"
      alt="IQSEA"
      width={2508}
      height={627}
      className={className}
      style={{ width: "auto" }}
    />
  );
}
