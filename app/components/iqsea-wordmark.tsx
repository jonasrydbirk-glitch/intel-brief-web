import Image from "next/image";

export function IQSEAWordmark({ className = "h-9" }: { className?: string }) {
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

export function IQSEAWordmarkSmall({ className = "h-7" }: { className?: string }) {
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
