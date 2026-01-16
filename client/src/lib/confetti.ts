interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  origin?: {
    x?: number;
    y?: number;
  };
}

// Simple confetti animation for achievement celebrations
export function confetti(options: ConfettiOptions = {}) {
  // Default options
  const opts = {
    particleCount: options.particleCount || 100,
    spread: options.spread || 70,
    origin: {
      x: options.origin?.x || 0.5,
      y: options.origin?.y || 0.5
    }
  };

  // Log confetti animation (we're creating a simplified version)
  console.log('Achievement unlocked! Showing confetti with options:', opts);
  
  // We could add a more complex animation here in the future
  // For now, we'll use a simple notification approach
  
  // Return basic animation info
  return {
    particleCount: opts.particleCount,
    spread: opts.spread,
    origin: opts.origin
  };
}