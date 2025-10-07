"use client";
import * as React from "react";
import { cn } from "@/lib/cn";

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary"|"ghost" }>(
  ({ className, variant="primary", ...props }, ref) => (
    <button ref={ref} className={cn("btn", variant==="primary" ? "btn-primary" : "btn-ghost", className)} {...props} />
  )
);
Button.displayName = "Button";
