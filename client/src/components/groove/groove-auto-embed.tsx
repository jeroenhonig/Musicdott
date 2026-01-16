/**
 * GrooveScribe Auto-Embed Component with Paste Detection
 * Comprehensive implementation from canvas files
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Music, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// --------------
// Configuration
// --------------
const ALLOWED_HOSTS = new Set([
  'teacher.musicdott.com',
  'www.mikeslessons.com', 
  'mikeslessons.com'
]);

const DEFAULT_HOST = "teacher.musicdott.com";
const DEFAULT_EMBED_PATH = "/groovescribe/GrooveEmbed.html";

const OPTIONAL_PARAMS = ['A', 'V', 'Notes', 'Title', 'CountIn', 'Swing', 'Layout'];

// --------------
// Utils
// --------------
function buildSrcFromParams(host: string, params: URLSearchParams) {
  const NEED = ["TimeSig", "Div", "Tempo", "Measures", "H", "S", "K"] as const;

  // Normalize case-insensitive keys
  for (const k of NEED) {
    if (!params.has(k)) {
      const lower = k.toLowerCase();
      if (params.has(lower)) params.set(k, params.get(lower)!);
    }
    if (!params.has(k)) throw new Error(`Missing parameter: ${k}`);
  }

  // Safe encode (pipes -> %7C)
  const safe = (v: string) => {
    try { return encodeURIComponent(decodeURIComponent(v)); }
    catch { return encodeURIComponent(v); }
  };

  const out = new URLSearchParams();
  out.set("TimeSig", params.get("TimeSig")!);
  out.set("Div", params.get("Div")!);
  out.set("Tempo", params.get("Tempo")!);
  out.set("Measures", params.get("Measures")!);
  out.set("H", safe(params.get("H")!));
  out.set("S", safe(params.get("S")!));
  out.set("K", safe(params.get("K")!));

  // Optional extras
  OPTIONAL_PARAMS.forEach((key) => {
    if (params.has(key)) out.set(key, safe(params.get(key)!));
  });

  return `https://${host}${DEFAULT_EMBED_PATH}?${out.toString()}`;
}

export function toEmbedSrc(link: string): string {
  if (!link) throw new Error("Empty input");
  const raw = link.trim();

  // CASE A: bare query like "?TimeSig=..." or "TimeSig=..."
  if (raw.startsWith("?") || /^\s*TimeSig=/i.test(raw)) {
    const qp = raw.startsWith("?") ? raw.slice(1) : raw;
    const params = new URLSearchParams(qp);
    return buildSrcFromParams(DEFAULT_HOST, params);
  }

  // CASE B: full URL
  let url: URL;
  try { url = new URL(raw); }
  catch { throw new Error("Invalid URL or query"); }

  if (!ALLOWED_HOSTS.has(url.host)) {
    throw new Error("Unsupported host: " + url.host);
  }
  const params = new URLSearchParams(url.search);
  return buildSrcFromParams(url.host, params);
}

// --------------
// React Components
// --------------
interface GrooveAutoEmbedProps {
  link: string;
  height?: number;
  className?: string;
}

export function GrooveAutoEmbed({ link, height = 240, className }: GrooveAutoEmbedProps) {
  const { src, error } = useMemo(() => {
    try { return { src: toEmbedSrc(link), error: null }; }
    catch (e: any) { return { src: '', error: e.message as string }; }
  }, [link]);

  if (error) return <div className="text-red-600 text-sm">{error}</div>;
  
  return (
    <div className={`groove-embed-container ${className || ''}`}>
      <iframe
        title="Groove Embed"
        src={src}
        width="100%"
        height={height}
        frameBorder={0}
        allow="autoplay"
        className="rounded-lg border"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>Interactive GrooveScribe Pattern</span>
        <a 
          href={src} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-blue-600"
        >
          <ExternalLink className="w-3 h-3" />
          Open Full
        </a>
      </div>
    </div>
  );
}

// Hook: paste auto-embed for any contentEditable/textarea
export function useGroovePasteAutoEmbed<T extends HTMLElement>(options?: { height?: number }) {
  const ref = useRef<T | null>(null);
  const height = options?.height ?? 240;

  const onPaste = useCallback((e: ClipboardEvent) => {
    if (!ref.current) return;
    const text = e.clipboardData?.getData("text/plain")?.trim();
    if (!text) return;

    // Detect URL or bare query
    const looksLikeGroove = /mikeslessons\.com|teacher\.musicdott\.com|(^\??\s*TimeSig=)/i.test(text);
    if (!looksLikeGroove) return;

    try {
      const src = toEmbedSrc(text);
      e.preventDefault();

      if ((ref.current as HTMLElement).isContentEditable) {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        const wrapper = document.createElement("div");
        wrapper.innerHTML = `
          <div class="groove-embed" contenteditable="false" style="margin:12px 0;border:1px solid #eee;border-radius:12px;overflow:hidden;">
            <iframe src="${src}" width="100%" height="${height}" frameborder="0" allow="autoplay"></iframe>
            <div style="padding:6px 10px;background:#fafafa;border-top:1px solid #eee;">
              <a href="${src}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:#555;">Open in GrooveScribe</a>
            </div>
          </div>`;
        range.deleteContents();
        range.insertNode(wrapper);
        range.setStartAfter(wrapper);
        range.setEndAfter(wrapper);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        const el = ref.current as unknown as HTMLTextAreaElement;
        const iframeHtml = `<iframe src="${src}" width="100%" height="${height}" frameborder="0" allow="autoplay"></iframe>`;
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        el.setRangeText(iframeHtml, start, end, "end");
      }
    } catch {
      // Allow normal paste on parse error
    }
  }, [height]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: Event) => onPaste(e as ClipboardEvent);
    el.addEventListener("paste", handler as EventListener);
    return () => el.removeEventListener("paste", handler as EventListener);
  }, [onPaste]);

  return ref;
}

// Interactive converter component
export function GrooveConverter() {
  const [input, setInput] = React.useState("");
  const [result, setResult] = React.useState<{ src: string; error: string | null }>({ src: '', error: null });
  const { toast } = useToast();

  const handleConvert = useCallback(() => {
    try {
      const src = toEmbedSrc(input);
      setResult({ src, error: null });
    } catch (e: any) {
      setResult({ src: '', error: e.message });
    }
  }, [input]);

  const copyIframeCode = useCallback(() => {
    if (result.src) {
      const iframeCode = `<iframe src="${result.src}" width="100%" height="240" frameborder="0" allow="autoplay"></iframe>`;
      navigator.clipboard.writeText(iframeCode);
      toast({ title: "Copied!", description: "Iframe code copied to clipboard" });
    }
  }, [result.src, toast]);

  useEffect(() => {
    if (input.trim()) {
      const timer = setTimeout(handleConvert, 300);
      return () => clearTimeout(timer);
    } else {
      setResult({ src: '', error: null });
    }
  }, [input, handleConvert]);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="w-5 h-5" />
          GrooveScribe Auto-Embed Converter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Paste GrooveScribe Link or Query String
          </label>
          <Input
            placeholder="https://teacher.musicdott.com/groovescribe/?TimeSig=4/4&... or ?TimeSig=4/4&..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="font-mono text-sm"
          />
        </div>

        {result.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{result.error}</p>
          </div>
        )}

        {result.src && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="default" className="flex items-center gap-1">
                <Music className="w-3 h-3" />
                Live Preview
              </Badge>
              <Button onClick={copyIframeCode} size="sm" variant="outline">
                <Copy className="w-4 h-4 mr-1" />
                Copy Iframe Code
              </Button>
            </div>
            
            <GrooveAutoEmbed link={input} />
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600 mb-2">Generated iframe code:</p>
              <code className="text-xs bg-white p-2 rounded border block overflow-x-auto">
                {`<iframe src="${result.src}" width="100%" height="240" frameborder="0" allow="autoplay"></iframe>`}
              </code>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Supported inputs:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Full URLs: https://teacher.musicdott.com/groovescribe/?TimeSig=...</li>
            <li>Full URLs: https://www.mikeslessons.com/groove/?TimeSig=...</li>
            <li>Query strings: ?TimeSig=4/4&Div=16&Tempo=80&...</li>
            <li>Bare queries: TimeSig=4/4&Div=16&Tempo=80&...</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}