import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";

// Exported for unit testing
export function buildCacheKey(targetLang: string, text: string): string {
  return `${targetLang}:${text}`;
}

export function shouldSkipTranslation(text: string | null | undefined): boolean {
  return !text || text.trim().length === 0;
}

// Client-side cache to avoid duplicate API calls within a session
const clientCache = new Map<string, string>();

const TARGET_LANG: Record<Language, "EN" | "NL"> = {
  en: "EN",
  nl: "NL",
};

/**
 * Translates a text string into the current app language via /api/translate.
 * Falls back to original text on error. Cancels in-flight requests on language
 * change or component unmount using AbortController.
 */
export function useTranslateText(text: string | null | undefined): {
  translatedText: string;
  isTranslating: boolean;
} {
  const { language } = useTranslation();
  const [translatedText, setTranslatedText] = useState<string>(text ?? "");
  const [isTranslating, setIsTranslating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const original = text ?? "";

    if (shouldSkipTranslation(text)) {
      setTranslatedText(original);
      return;
    }

    const targetLang = TARGET_LANG[language];
    const cacheKey = buildCacheKey(targetLang, original);

    if (clientCache.has(cacheKey)) {
      setTranslatedText(clientCache.get(cacheKey)!);
      return;
    }

    // Cancel any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsTranslating(true);

    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: original, targetLang }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        const result: string = data.translatedText ?? original;
        clientCache.set(cacheKey, result);
        setTranslatedText(result);
      })
      .catch(() => {
        // AbortError or network error — fall back to original text
        setTranslatedText(original);
      })
      .finally(() => {
        setIsTranslating(false);
      });

    return () => {
      controller.abort();
    };
  }, [text, language]);

  return { translatedText, isTranslating };
}
