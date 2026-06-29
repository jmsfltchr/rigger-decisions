import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { anthropicDiagnostics, normalizeApiKey } from "./anthropic";

describe("normalizeApiKey", () => {
  it("returns a clean key unchanged", () => {
    expect(normalizeApiKey("sk-ant-abc123")).toBe("sk-ant-abc123");
  });

  it("trims surrounding whitespace and a trailing newline", () => {
    expect(normalizeApiKey("  sk-ant-abc123\n")).toBe("sk-ant-abc123");
  });

  it("strips a single pair of wrapping double or single quotes", () => {
    expect(normalizeApiKey('"sk-ant-abc123"')).toBe("sk-ant-abc123");
    expect(normalizeApiKey("'sk-ant-abc123'")).toBe("sk-ant-abc123");
  });

  it("treats missing, empty, and the placeholder as not configured", () => {
    expect(normalizeApiKey(undefined)).toBe("");
    expect(normalizeApiKey("   ")).toBe("");
    expect(normalizeApiKey("sk-ant-...")).toBe("");
  });
});

describe("anthropicDiagnostics", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_BASE_URL;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("reports a not-configured state when the key is absent", () => {
    const d = anthropicDiagnostics();
    expect(d.apiKey.present).toBe(false);
    expect(d.apiKey.length).toBe(0);
    expect(d.baseUrl.set).toBe(false);
    expect(d.baseUrl.host).toBe("api.anthropic.com");
    expect(d.authTokenSet).toBe(false);
  });

  it("flags a quoted/whitespaced key and reports masked shape", () => {
    process.env.ANTHROPIC_API_KEY = '  "sk-ant-secret-value"  ';
    const d = anthropicDiagnostics();
    expect(d.apiKey.present).toBe(true);
    expect(d.apiKey.looksValid).toBe(true);
    expect(d.apiKey.prefix).toBe("sk-ant-");
    expect(d.apiKey.hadQuotes).toBe(true);
    expect(d.apiKey.hadWhitespace).toBe(true);
    expect(d.apiKey.length).toBe("sk-ant-secret-value".length);
  });

  it("surfaces a shadowing base URL host and auth token", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-ok";
    process.env.ANTHROPIC_BASE_URL = "https://proxy.example.com/anthropic";
    process.env.ANTHROPIC_AUTH_TOKEN = "tok";
    const d = anthropicDiagnostics();
    expect(d.baseUrl.set).toBe(true);
    expect(d.baseUrl.host).toBe("proxy.example.com");
    expect(d.authTokenSet).toBe(true);
  });

  it("flags a non-sk-ant key as not looking valid", () => {
    process.env.ANTHROPIC_API_KEY = "oauth-token-not-an-api-key";
    const d = anthropicDiagnostics();
    expect(d.apiKey.present).toBe(true);
    expect(d.apiKey.looksValid).toBe(false);
  });
});
