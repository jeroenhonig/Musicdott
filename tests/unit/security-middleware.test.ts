import { describe, expect, it, vi } from "vitest";
import {
  getContentSecurityPolicyDirectives,
  sanitizeRequestBody,
  sanitizeRequestMetadata,
  verifySameOrigin,
} from "../../server/middleware/security";
import { sanitizeRichHtml } from "../../client/src/utils/sanitize-rich-html";

function createMockRequest(overrides: Record<string, any> = {}) {
  const headers = Object.fromEntries(
    Object.entries(overrides.headers || {}).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    method: "GET",
    originalUrl: "/api/test",
    url: "/api/test",
    path: "/api/test",
    protocol: "http",
    secure: false,
    body: {},
    query: {},
    params: {},
    headers,
    header(name: string) {
      return headers[name.toLowerCase()] ?? null;
    },
    get(name: string) {
      return headers[name.toLowerCase()] ?? null;
    },
    ...overrides,
  };
}

function createMockResponse() {
  return {
    statusCode: 200,
    jsonBody: undefined as any,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.jsonBody = payload;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
  };
}

describe("security middleware", () => {
  it("sanitizes query and params metadata", () => {
    const req = createMockRequest({
      query: { search: "<script>boom</script>" },
      params: { slug: "<script>alert(1)</script>" },
    });
    const res = createMockResponse();
    const next = vi.fn();

    sanitizeRequestMetadata(req as any, res as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect((req.params as any).slug).not.toContain("<script");
    expect((req.query as any).search).not.toContain("<script");
  });

  it("preserves trusted iframe embeds in request bodies while stripping active content", () => {
    const req = createMockRequest({
      body: {
        html: [
          `<script>alert("xss")</script>`,
          `<iframe src="https://www.youtube.com/embed/abc123XYZ89" onload="alert(1)" allowfullscreen></iframe>`,
          `<iframe src="https://evil.example/embed/123"></iframe>`,
          `<a href="javascript:alert(1)">bad</a>`,
        ].join(""),
      },
    });
    const res = createMockResponse();
    const next = vi.fn();

    sanitizeRequestBody(req as any, res as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect((req.body as any).html).toContain("https://www.youtube.com/embed/abc123XYZ89");
    expect((req.body as any).html).not.toContain("<script");
    expect((req.body as any).html).not.toContain("onload=");
    expect((req.body as any).html).not.toContain("javascript:");
    expect((req.body as any).html).not.toContain("https://evil.example/embed/123");
  });

  it("blocks authenticated cross-site state-changing requests", () => {
    const req = createMockRequest({
      method: "POST",
      originalUrl: "/api/logout",
      url: "/api/logout",
      path: "/api/logout",
      headers: {
        cookie: "musicdott.sid=test-session",
        origin: "https://evil.example",
      },
      isAuthenticated: () => true,
    });
    const res = createMockResponse();
    const next = vi.fn();

    verifySameOrigin(req as any, res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.jsonBody).toEqual(expect.objectContaining({
      message: expect.stringMatching(/cross-site|origin/i),
    }));
  });

  it("allows authenticated same-site state-changing requests from local app origins", () => {
    const req = createMockRequest({
      method: "POST",
      originalUrl: "/api/logout",
      url: "/api/logout",
      path: "/api/logout",
      headers: {
        cookie: "musicdott.sid=test-session",
        origin: "http://127.0.0.1:3000",
      },
      isAuthenticated: () => true,
    });
    const res = createMockResponse();
    const next = vi.fn();

    verifySameOrigin(req as any, res as any, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it("skips csrf checks for webhook endpoints", () => {
    const req = createMockRequest({
      method: "POST",
      originalUrl: "/api/webhooks/stripe",
      url: "/api/webhooks/stripe",
      path: "/api/webhooks/stripe",
      headers: {
        cookie: "musicdott.sid=test-session",
      },
      isAuthenticated: () => true,
    });
    const res = createMockResponse();
    const next = vi.fn();

    verifySameOrigin(req as any, res as any, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("exposes CSP directives for supported embed providers", () => {
    const directives = getContentSecurityPolicyDirectives();

    expect(directives.frameSrc).toEqual(
      expect.arrayContaining([
        "blob:",
        "data:",
        "https://www.youtube.com",
        "https://open.spotify.com",
        "https://embed.music.apple.com",
        "https://sync.musicdott.app",
        "https://musicdott.app",
      ]),
    );
  });
});

describe("sanitizeRichHtml", () => {
  it("keeps trusted iframe embeds and strips executable HTML", () => {
    const sanitized = sanitizeRichHtml(
      `<script>alert("xss")</script><iframe src="https://www.youtube.com/embed/abc123XYZ89" onload="alert(1)" allowfullscreen></iframe>`,
    );

    expect(sanitized).toContain("https://www.youtube.com/embed/abc123XYZ89");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("onload=");
  });

  it("removes untrusted embeds and object/embed tags from rendered HTML", () => {
    const sanitized = sanitizeRichHtml(
      `<iframe src="https://evil.example/embed/123"></iframe><object data="https://evil.example/file"></object><embed src="https://evil.example/file" />`,
    );

    expect(sanitized).toBe("");
  });
});
