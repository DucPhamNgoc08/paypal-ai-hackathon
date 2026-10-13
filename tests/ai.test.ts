import { afterEach, describe, expect, it, vi } from "vitest";
import { importWithEnv, queueFetch } from "./helpers";

type AiModule = typeof import("@/lib/ai");

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("AI client", () => {
  it("returns a canned reply when no key is set", async () => {
    const { chat } = await importWithEnv<AiModule>("@/lib/ai", {});
    const reply = await chat([{ role: "user", content: "hello" }]);

    expect(reply.mock).toBe(true);
    expect(reply.text).toContain("hello");
  });

  it("calls the configured OpenAI-compatible endpoint when a key is set", async () => {
    const { chat } = await importWithEnv<AiModule>("@/lib/ai", {
      AI_API_KEY: "sk-test",
      AI_BASE_URL: "https://example.test/v1/",
      AI_MODEL: "some-model",
    });
    const fetchMock = queueFetch({ body: { choices: [{ message: { content: "hi there" } }] } });

    const reply = await chat([{ role: "user", content: "hello" }]);

    expect(reply).toEqual({ text: "hi there", mock: false });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://example.test/v1/chat/completions");
    expect(JSON.parse(init.body as string).model).toBe("some-model");
  });
});
