import { LogoMark } from "@/components/site/logo";

/**
 * GaadiGrid's minimal loading state: the mark over a short stretch of road with an emerald segment
 * passing along it. It only becomes visible after ~180ms (see .gg-loader in globals.css), so quick
 * loads never flash it, and it is just a calm placeholder — never a splash.
 */
export function GaadiGridLoader({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`gg-loader flex flex-col items-center justify-center gap-5 py-16${className ? ` ${className}` : ""}`}
    >
      <LogoMark className="size-12" />
      <span className="gg-loader-road relative block h-[3px] w-20 overflow-hidden rounded-full bg-border" />
    </div>
  );
}
