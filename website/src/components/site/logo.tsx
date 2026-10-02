import { cn } from "@/lib/utils";

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      className={cn("size-8", className)}
      role="img"
      aria-hidden="true"
    >
      <path
        d="M512,140 C 654,140 764,251 764,392 C 764,520 640,700 560,830 C 542,858 527,884 512,924 C 497,884 482,858 464,830 C 384,700 260,520 260,392 C 260,251 370,140 512,140 Z"
        fill="currentColor"
        className="text-foreground"
      />
      <g transform="translate(512,340)">
        <rect x="-96" y="34" width="192" height="46" rx="23" fill="var(--brand-green)" />
        <rect x="-72" y="46" width="40" height="10" rx="5" fill="var(--background)" />
        <rect x="-8" y="46" width="40" height="10" rx="5" fill="var(--background)" />
        <rect x="56" y="46" width="40" height="10" rx="5" fill="var(--background)" />
        <g transform="translate(-48,-94) rotate(-28)" fill="var(--brand-orange)">
          <rect x="-40" y="-70" width="80" height="50" rx="20" />
          <rect x="0" y="-26" width="16" height="34" rx="8" />
          <rect x="-16" y="0" width="32" height="130" rx="16" />
          <circle cx="0" cy="138" r="11" />
        </g>
        <path
          d="M108,-158 L124,-118 L164,-102 L124,-86 L108,-46 L92,-86 L52,-102 L92,-118 Z"
          fill="var(--brand-green)"
        />
      </g>
    </svg>
  );
}

export function Logo({ className, wordmarkClassName }: { className?: string; wordmarkClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className={cn("text-lg font-extrabold tracking-tight text-foreground", wordmarkClassName)}>
        GaadiGrid
      </span>
    </span>
  );
}
