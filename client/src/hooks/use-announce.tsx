import { useCallback, useEffect, useRef } from "react";

/**
 * Politeness level for announcements
 * - assertive: interrupt the user's current task immediately (for critical information)
 * - polite: announce when the user is idle (for non-critical information)
 */
type PolitenessLevel = "assertive" | "polite";

/**
 * useAnnounce hook
 * 
 * A hook that provides screen reader announcements using ARIA live regions.
 * This is useful for announcing dynamic changes that might not be apparent to screen reader users.
 * 
 * @returns A function to announce messages to screen readers
 */
export function useAnnounce() {
  const assertiveRef = useRef<HTMLDivElement | null>(null);
  const politeRef = useRef<HTMLDivElement | null>(null);

  // Create the live regions if they don't already exist
  useEffect(() => {
    // Check if the regions already exist
    if (!document.getElementById("aria-live-assertive")) {
      const assertiveRegion = document.createElement("div");
      assertiveRegion.id = "aria-live-assertive";
      assertiveRegion.className = "sr-only";
      assertiveRegion.setAttribute("aria-live", "assertive");
      assertiveRegion.setAttribute("aria-atomic", "true");
      document.body.appendChild(assertiveRegion);
      assertiveRef.current = assertiveRegion;
    } else {
      assertiveRef.current = document.getElementById("aria-live-assertive") as HTMLDivElement;
    }

    if (!document.getElementById("aria-live-polite")) {
      const politeRegion = document.createElement("div");
      politeRegion.id = "aria-live-polite";
      politeRegion.className = "sr-only";
      politeRegion.setAttribute("aria-live", "polite");
      politeRegion.setAttribute("aria-atomic", "true");
      document.body.appendChild(politeRegion);
      politeRef.current = politeRegion;
    } else {
      politeRef.current = document.getElementById("aria-live-polite") as HTMLDivElement;
    }

    // Cleanup
    return () => {
      // We don't remove these because they might be used by other components
      // Instead we just clear them
      if (assertiveRef.current) assertiveRef.current.textContent = "";
      if (politeRef.current) politeRef.current.textContent = "";
    };
  }, []);

  /**
   * Announce a message to screen readers
   * 
   * @param message The message to announce
   * @param politeness The politeness level of the announcement (default: polite)
   */
  const announce = useCallback((message: string, politeness: PolitenessLevel = "polite") => {
    const region = politeness === "assertive" ? assertiveRef.current : politeRef.current;
    
    if (region) {
      // Clear the region first to ensure announcement even if message is the same
      region.textContent = "";
      
      // Use setTimeout to ensure the clearing has taken effect before setting the new message
      setTimeout(() => {
        if (region) region.textContent = message;
      }, 50);
    }
  }, []);

  return announce;
}