import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

describe("rate limiter", () => {
  it("allows up to the limit per window, then blocks until the window resets", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 1000 });

    expect(check("a", 0).ok).toBe(true);
    expect(check("a", 10).ok).toBe(true);
    const blocked = check("a", 20);
    expect(blocked).toEqual({ ok: false, retryAfterSec: 1 });
    expect(check("b", 20).ok).toBe(true); // other clients unaffected
    expect(check("a", 1001).ok).toBe(true); // new window
  });

  it("reads the first IP from x-forwarded-for", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } });
    expect(clientKey(req)).toBe("1.2.3.4");
  });
});
