import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useAnnounce } from "@/hooks/use-announce"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants> & {
      // Additional accessibility props
      required?: boolean;
      optional?: boolean;
    }
>(({ className, required, optional, children, ...props }, ref) => {
  const announce = useAnnounce();
  
  // Skip the focus event handling as it's causing type issues
  // Instead, we'll use a better approach to convey required status to screen readers
  
  // When component mounts, check if it's required and announce to screen readers
  React.useEffect(() => {
    if (required && typeof children === 'string') {
      // Short delay to ensure screen readers pick it up after page loads
      const timer = setTimeout(() => {
        announce(`${children} field is required`, "polite");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [required, children, announce]);

  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(labelVariants(), className)}
      {...props}
      // Add aria attributes for better accessibility
      aria-required={required ? "true" : undefined}
    >
      {children}
      {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
      {optional && <span className="text-muted-foreground text-xs ml-1">(optional)</span>}
    </LabelPrimitive.Root>
  );
})
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
