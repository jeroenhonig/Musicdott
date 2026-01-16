import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * ScreenReaderOnly component
 * Used to provide text content that is only visible to screen readers
 * but hidden visually from sighted users.
 */
interface ScreenReaderOnlyProps extends HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

export default function ScreenReaderOnly({
  children,
  className,
  ...props
}: ScreenReaderOnlyProps) {
  return (
    <span
      className={cn(
        "absolute w-1 h-1 p-0 -m-1 overflow-hidden whitespace-nowrap border-0",
        className
      )}
      style={{ clip: "rect(0, 0, 0, 0)" }}
      {...props}
    >
      {children}
    </span>
  );
}