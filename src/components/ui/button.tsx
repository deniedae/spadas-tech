import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 shadow-md shadow-cyan-500/20",
        outline: "border border-white/10 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08] hover:border-white/20",
        ghost: "text-zinc-300 hover:text-white hover:bg-white/[0.06]",
        destructive: "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 shadow-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
);

Button.displayName = "Button";

export { Button, buttonVariants };