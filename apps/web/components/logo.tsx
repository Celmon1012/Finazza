import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string; mark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img src="/finazza-logo.jpg" alt="FINAZZA" className="h-9 w-auto sm:h-12" />
    </span>
  );
}
