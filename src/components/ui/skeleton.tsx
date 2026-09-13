import { cn } from "@/lib/utils";

function Skeleton({
  className,
  variant = "laser",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "laser" | "shimmer" | "pulse";
}) {
  return (
    <div
      className={cn(
        "rounded-md bg-white/[0.06] relative overflow-hidden",
        variant === "laser" && "laser-skeleton",
        variant === "shimmer" && "skeleton",
        variant === "pulse" && "animate-pulse",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
