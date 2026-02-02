export type EmbedStatus = "embedded" | "fallback";

export interface EmbedModule {
  type: "video" | "audio" | "notation" | "pdf" | "external";
  provider: "groovescribe" | "youtube" | "spotify" | "apple" | "external" | "unknown";
  status: EmbedStatus;
  embed: {
    embed_url: string | null;
    raw: string;
  };
  fallback?: {
    label: string;
    url: string;
  };
  meta?: Record<string, unknown>;
}
