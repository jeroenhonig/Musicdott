import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";

const router = Router();

const translateSchema = z.object({
  text: z.string().min(1).max(5000),
  targetLang: z.enum(["EN", "NL"]),
});

// Singleton in-memory cache: key = "LANG:raw text"
// Known limitation: no eviction/TTL — acceptable for MVP
let _cache: Map<string, string> | null = null;
export function buildTranslateCache(): Map<string, string> {
  if (!_cache) _cache = new Map();
  return _cache;
}

export async function translateText(
  text: string,
  targetLang: "EN" | "NL",
  apiKey: string
): Promise<string> {
  const cacheKey = `${targetLang}:${text}`;
  const cache = buildTranslateCache();

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  try {
    const response = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [text],
        target_lang: targetLang,
        // source_lang omitted — DeepL auto-detects
      }),
    });

    if (!response.ok) {
      return text;
    }

    const data = await response.json();
    const translated: string = data.translations[0].text;
    cache.set(cacheKey, translated);
    return translated;
  } catch {
    return text;
  }
}

router.post("/", requireAuth, async (req, res) => {
  const parsed = translateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const { text, targetLang } = parsed.data;
  const apiKey = process.env.DEEPL_API_KEY;

  if (!apiKey) {
    return res.json({ translatedText: text });
  }

  const translatedText = await translateText(text, targetLang, apiKey);
  res.json({ translatedText });
});

export default router;
