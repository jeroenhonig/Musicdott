import { useEffect } from "react";

type AlternateLink = {
  hreflang: string;
  href: string;
};

type JsonLdValue = Record<string, unknown> | Array<Record<string, unknown>>;

interface RouteSeoProps {
  title: string;
  description: string;
  canonical: string;
  robots?: string;
  alternates?: AlternateLink[];
  jsonLd?: JsonLdValue;
}

type MetaSelector =
  | { name: string; content: string }
  | { property: string; content: string };

function upsertMeta(config: MetaSelector) {
  const selector = "name" in config ? `meta[name=\"${config.name}\"]` : `meta[property=\"${config.property}\"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  const created = !el;
  if (!el) {
    el = document.createElement("meta");
    if ("name" in config) el.setAttribute("name", config.name);
    if ("property" in config) el.setAttribute("property", config.property);
    document.head.appendChild(el);
  }
  const previous = el.getAttribute("content");
  el.setAttribute("content", config.content);
  return { el, created, previous };
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const created = !el;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  const previous = el.getAttribute("href");
  el.setAttribute("href", href);
  return { el, created, previous };
}

function upsertAlternate(link: AlternateLink) {
  let el = document.head.querySelector<HTMLLinkElement>(
    `link[rel=\"alternate\"][hreflang=\"${link.hreflang}\"]`,
  );
  const created = !el;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "alternate");
    el.setAttribute("hreflang", link.hreflang);
    document.head.appendChild(el);
  }
  const previous = el.getAttribute("href");
  el.setAttribute("href", link.href);
  return { el, created, previous };
}

export function RouteSeo({
  title,
  description,
  canonical,
  robots = "index, follow",
  alternates = [],
  jsonLd,
}: RouteSeoProps) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const updates = [
      upsertMeta({ name: "description", content: description }),
      upsertMeta({ name: "robots", content: robots }),
      upsertMeta({ name: "googlebot", content: robots }),
      upsertMeta({ property: "og:title", content: title }),
      upsertMeta({ property: "og:description", content: description }),
      upsertMeta({ property: "og:url", content: canonical }),
      upsertMeta({ name: "twitter:title", content: title }),
      upsertMeta({ name: "twitter:description", content: description }),
    ];

    const canonicalUpdate = upsertCanonical(canonical);
    const alternateUpdates = alternates.map(upsertAlternate);

    let jsonLdScript = document.getElementById("route-seo-jsonld") as HTMLScriptElement | null;
    const jsonLdCreated = !jsonLdScript;
    const previousJsonLd = jsonLdScript?.textContent ?? null;
    if (jsonLd) {
      if (!jsonLdScript) {
        jsonLdScript = document.createElement("script");
        jsonLdScript.id = "route-seo-jsonld";
        jsonLdScript.type = "application/ld+json";
        document.head.appendChild(jsonLdScript);
      }
      jsonLdScript.textContent = JSON.stringify(jsonLd);
    }

    return () => {
      document.title = previousTitle;
      for (const update of updates) {
        if (update.created) {
          update.el.remove();
        } else if (update.previous !== null) {
          update.el.setAttribute("content", update.previous);
        }
      }

      if (canonicalUpdate.created) {
        canonicalUpdate.el.remove();
      } else if (canonicalUpdate.previous !== null) {
        canonicalUpdate.el.setAttribute("href", canonicalUpdate.previous);
      }

      for (const update of alternateUpdates) {
        if (update.created) {
          update.el.remove();
        } else if (update.previous !== null) {
          update.el.setAttribute("href", update.previous);
        }
      }

      if (jsonLdScript) {
        if (!jsonLd) return;
        if (jsonLdCreated) {
          jsonLdScript.remove();
        } else {
          jsonLdScript.textContent = previousJsonLd;
        }
      }
    };
  }, [title, description, canonical, robots, jsonLd, alternates]);

  return null;
}

export default RouteSeo;
