import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * SkipLink component
 * Provides a link that allows keyboard users to skip to the main content,
 * bypassing repetitive navigation elements.
 * The link is visually hidden until it receives focus.
 */
interface SkipLinkProps extends HTMLAttributes<HTMLAnchorElement> {
  targetId: string;
  children?: React.ReactNode;
}

export default function SkipLink({
  targetId,
  children = "Skip to main content",
  className,
  ...props
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50",
        "focus:bg-background focus:text-foreground focus:p-4 focus:rounded focus:shadow-md",
        "focus:outline-2 focus:outline-primary",
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}