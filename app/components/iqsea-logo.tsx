import Image from "next/image";

export function IQseaLogo({ className = "h-8" }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-white-wave.png"
      alt="IQSEA"
      width={2172}
      height={724}
      className={className}
      style={{ width: "auto" }}
      priority
    />
  );
}

export function IQseaLogoSmall({ className = "h-6" }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-white-wave.png"
      alt="IQSEA"
      width={2172}
      height={724}
      className={className}
      style={{ width: "auto" }}
    />
  );
}
