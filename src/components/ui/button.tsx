import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[13px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-accent text-white shadow-[0_4px_16px_-6px_var(--accent-glow)] hover:brightness-110 hover:shadow-[0_6px_20px_-6px_var(--accent-glow)]",
        secondary:
          "bg-white/[0.06] text-foreground border border-border hover:bg-white/[0.09] hover:border-border-strong",
        outline:
          "border border-border text-foreground hover:bg-white/[0.04] hover:border-border-strong",
        ghost: "text-muted hover:bg-white/[0.05] hover:text-foreground",
        positive:
          "bg-positive/15 text-positive border border-positive/25 hover:bg-positive/22 hover:border-positive/40",
        negative:
          "bg-negative/15 text-negative border border-negative/25 hover:bg-negative/22 hover:border-negative/40",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-sm",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
