import React, { useEffect, useRef } from "react";

interface FocusTrapProps {
  children: React.ReactNode;
  isActive: boolean;
  onEscape?: () => void;
}

/**
 * FocusTrap component
 * Traps focus within a component, such as a modal dialog, preventing focus from
 * moving outside the component while it's active. This is an accessibility requirement
 * for modal components.
 */
export default function FocusTrap({ children, isActive, onEscape }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isActive) {
      // Store the element that had focus before the trap was activated
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Set focus to the first focusable element inside the trap
      const focusableElements = containerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements?.length) {
        (focusableElements[0] as HTMLElement).focus();
      }
    } else if (previousFocusRef.current) {
      // Restore focus when the trap is deactivated
      previousFocusRef.current.focus();
    }
  }, [isActive]);

  // Handle keyboard events to keep focus trapped inside
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isActive) return;

    // Handle escape key
    if (e.key === "Escape" && onEscape) {
      e.preventDefault();
      onEscape();
      return;
    }

    // Handle tab and shift+tab to cycle through focusable elements
    if (e.key === "Tab" && containerRef.current) {
      const focusableElements = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (!focusableElements.length) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      // If shift+tab on the first element, move to the last element
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } 
      // If tab on the last element, move to the first element
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
}