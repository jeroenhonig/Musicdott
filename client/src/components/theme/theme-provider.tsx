import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import type { SchoolBranding } from '@shared/schema';

/**
 * ThemeProvider Context for School Branding
 * Provides global access to school branding and theme management
 */

interface ThemeContextType {
  branding: SchoolBranding | null;
  isLoading: boolean;
  error: Error | null;
  applyPreviewBranding: (previewBranding: Partial<SchoolBranding>) => void;
  clearPreviewBranding: () => void;
  isPreviewMode: boolean;
  refreshBranding: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

const DEFAULT_BRANDING: SchoolBranding = {
  primaryColor: '#3b82f6',
  secondaryColor: '#64748b',
  accentColor: '#10b981',
  fontFamily: 'Inter',
  brandingEnabled: false
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [previewBranding, setPreviewBranding] = useState<Partial<SchoolBranding> | null>(null);
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set(['Inter'])); // Default font

  // Fetch school branding
  const { 
    data: branding, 
    isLoading, 
    error, 
    refetch: refreshBranding 
  } = useQuery({
    queryKey: ['/api/schools', user?.schoolId, 'branding'],
    enabled: !!user?.schoolId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  // Determine effective branding (preview overrides actual)
  const effectiveBranding = React.useMemo(() => {
    const base = branding || DEFAULT_BRANDING;
    return previewBranding ? { ...base, ...previewBranding } : base;
  }, [branding, previewBranding]);

  // Apply preview branding for live preview
  const applyPreviewBranding = useCallback((preview: Partial<SchoolBranding>) => {
    setPreviewBranding(preview);
  }, []);

  // Clear preview branding
  const clearPreviewBranding = useCallback(() => {
    setPreviewBranding(null);
  }, []);

  // Load custom fonts dynamically
  const loadFont = useCallback(async (fontFamily: string) => {
    if (!fontFamily || loadedFonts.has(fontFamily) || fontFamily === 'Inter') {
      return;
    }

    try {
      // Create Google Fonts link
      const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`;
      
      // Check if font link already exists
      const existingLink = document.querySelector(`link[href*="${fontFamily.replace(/\s+/g, '+')}"]`);
      if (existingLink) {
        setLoadedFonts(prev => new Set([...prev, fontFamily]));
        return;
      }

      // Create and inject font link
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = googleFontsUrl;
      
      // Wait for font to load
      await new Promise((resolve, reject) => {
        link.onload = resolve;
        link.onerror = reject;
        document.head.appendChild(link);
      });

      setLoadedFonts(prev => new Set([...prev, fontFamily]));
    } catch (error) {
      console.warn(`Failed to load font: ${fontFamily}`, error);
    }
  }, [loadedFonts]);

  // Apply CSS variables for theming
  useEffect(() => {
    if (!effectiveBranding || !effectiveBranding.brandingEnabled) {
      // Reset to default theme
      applyThemeVariables(DEFAULT_BRANDING, user?.schoolId);
      return;
    }

    // Load custom font if specified
    if (effectiveBranding.fontFamily && effectiveBranding.fontFamily !== 'Inter') {
      loadFont(effectiveBranding.fontFamily);
    }

    // Apply theme variables
    applyThemeVariables(effectiveBranding, user?.schoolId);
    
    // Apply custom CSS if provided
    if (effectiveBranding.customCss) {
      applyCustomCSS(effectiveBranding.customCss, user?.schoolId);
    } else {
      removeCustomCSS(user?.schoolId);
    }

  }, [effectiveBranding, user?.schoolId, loadFont]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (user?.schoolId) {
        removeCustomCSS(user.schoolId);
        removeSchoolScope(user.schoolId);
      }
    };
  }, [user?.schoolId]);

  const contextValue: ThemeContextType = {
    branding: effectiveBranding,
    isLoading,
    error: error as Error | null,
    applyPreviewBranding,
    clearPreviewBranding,
    isPreviewMode: previewBranding !== null,
    refreshBranding
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <div 
        data-school-id={user?.schoolId} 
        className={effectiveBranding?.brandingEnabled ? 'themed-app' : ''}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

/**
 * Apply CSS variables for school branding
 */
function applyThemeVariables(branding: SchoolBranding, schoolId?: number) {
  const root = document.documentElement;
  
  if (!branding.brandingEnabled) {
    // Reset to default values
    root.style.removeProperty('--school-primary');
    root.style.removeProperty('--school-secondary');
    root.style.removeProperty('--school-accent');
    root.style.removeProperty('--school-font-family');
    return;
  }

  // Apply color variables
  if (branding.primaryColor) {
    root.style.setProperty('--school-primary', branding.primaryColor);
    root.style.setProperty('--school-primary-rgb', hexToRgb(branding.primaryColor));
  }

  if (branding.secondaryColor) {
    root.style.setProperty('--school-secondary', branding.secondaryColor);
    root.style.setProperty('--school-secondary-rgb', hexToRgb(branding.secondaryColor));
  }

  if (branding.accentColor) {
    root.style.setProperty('--school-accent', branding.accentColor);
    root.style.setProperty('--school-accent-rgb', hexToRgb(branding.accentColor));
  }

  // Apply font family
  if (branding.fontFamily) {
    root.style.setProperty('--school-font-family', `"${branding.fontFamily}", Inter, system-ui, sans-serif`);
  }

  // Apply background image if provided
  if (branding.backgroundImage) {
    root.style.setProperty('--school-background-image', `url(${branding.backgroundImage})`);
  } else {
    root.style.removeProperty('--school-background-image');
  }
}

/**
 * Apply custom CSS with school scoping
 */
function applyCustomCSS(css: string, schoolId?: number) {
  if (!schoolId || !css.trim()) return;

  const styleId = `school-custom-css-${schoolId}`;
  
  // Remove existing custom CSS
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = css;
  
  document.head.appendChild(style);
}

/**
 * Remove custom CSS for a school
 */
function removeCustomCSS(schoolId: number) {
  const styleId = `school-custom-css-${schoolId}`;
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }
}

/**
 * Remove school scope attributes
 */
function removeSchoolScope(schoolId: number) {
  const elements = document.querySelectorAll(`[data-school-id="${schoolId}"]`);
  elements.forEach(element => {
    element.removeAttribute('data-school-id');
  });
}

/**
 * Convert hex color to RGB string
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `${r}, ${g}, ${b}`;
}

/**
 * Hook for components that need to react to theme changes
 */
export const useThemeVariables = () => {
  const { branding } = useTheme();
  
  return React.useMemo(() => {
    if (!branding?.brandingEnabled) {
      return {
        primaryColor: DEFAULT_BRANDING.primaryColor,
        secondaryColor: DEFAULT_BRANDING.secondaryColor,
        accentColor: DEFAULT_BRANDING.accentColor,
        fontFamily: DEFAULT_BRANDING.fontFamily
      };
    }

    return {
      primaryColor: branding.primaryColor || DEFAULT_BRANDING.primaryColor,
      secondaryColor: branding.secondaryColor || DEFAULT_BRANDING.secondaryColor,
      accentColor: branding.accentColor || DEFAULT_BRANDING.accentColor,
      fontFamily: branding.fontFamily || DEFAULT_BRANDING.fontFamily
    };
  }, [branding]);
};

export default ThemeProvider;