import { afterEach, describe, expect, it, vi } from "vitest";
import { importWithEnv } from "./helpers";

type OrdersRoute = typeof import("@/app/api/paypal/orders/route");
type ReturnRoute = typeof import("@/app/api/paypal/return/route");

afterEach(() => {
  vi.unstubAllEnvs();
});

function post(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/paypal/orders", () => {
  it("rejects malformed amounts", async () => {
    const { POST } = await importWithEnv<OrdersRoute>("@/app/api/paypal/orders/route", {});
    const res = await POST(post("http://localhost:3000/api/paypal/orders", { amount: "abc" }));
    expect(res.status).toBe(400);
  });

  it("returns an approve URL on the same origin in mock mode", async () => {
    const { POST } = await importWithEnv<OrdersRoute>("@/app/api/paypal/orders/route", {});
    const res = await POST(post("http://localhost:3000/api/paypal/orders", { amount: "2.50" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.approveUrl).toMatch(/^http:\/\/localhost:3000\/api\/paypal\/return\?token=MOCK-/);
  });
});

describe("GET /api/paypal/return", () => {
  it("captures the order and redirects home with the result", async () => {
    const { GET } = await importWithEnv<ReturnRoute>("@/app/api/paypal/return/route", {});
    const res = await GET(new Request("http://localhost:3000/api/paypal/return?token=MOCK-9"));

    expect(res.status).toBe(303);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/");
    expect(location.searchParams.get("payment")).toBe("completed");
    expect(location.searchParams.get("order")).toBe("MOCK-9");
  });

  it("handles a missing token", async () => {
    const { GET } = await importWithEnv<ReturnRoute>("@/app/api/paypal/return/route", {});
    const res = await GET(new Request("http://localhost:3000/api/paypal/return"));

    expect(new URL(res.headers.get("location")!).searchParams.get("payment")).toBe("missing-order");
  });
});

describe("input hardening", () => {
  it("rejects zero, huge or non-numeric amounts and bad currencies", async () => {
    const { POST } = await importWithEnv<OrdersRoute>("@/app/api/paypal/orders/route", {});
    const url = "http://localhost:3000/api/paypal/orders";

    for (const body of [{ amount: "0" }, { amount: "99999" }, { amount: { x: 1 } }, { currency: "dollars" }]) {
      const res = await POST(post(url, body));
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
  });

  it("rejects non-string and oversized AI prompts", async () => {
    const { POST } = await importWithEnv<typeof import("@/app/api/ai/route")>("@/app/api/ai/route", {});
    const url = "http://localhost:3000/api/ai";

    expect((await POST(post(url, { prompt: 123 }))).status).toBe(400);
    expect((await POST(post(url, { prompt: "x".repeat(2001) }))).status).toBe(400);
  });
});
