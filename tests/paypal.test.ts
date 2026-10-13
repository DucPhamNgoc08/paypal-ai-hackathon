import { afterEach, describe, expect, it, vi } from "vitest";
import { importWithEnv, queueFetch } from "./helpers";

type PayPalModule = typeof import("@/lib/paypal");

const SANDBOX = { PAYPAL_CLIENT_ID: "test-id", PAYPAL_CLIENT_SECRET: "test-secret" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("PayPal client in mock mode (no credentials)", () => {
  it("creates an order whose approve URL points back to the return route", async () => {
    const { createOrder } = await importWithEnv<PayPalModule>("@/lib/paypal", {});
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const order = await createOrder({
      amount: "1.00",
      returnUrl: "http://localhost:3000/api/paypal/return",
      cancelUrl: "http://localhost:3000/",
    });

    expect(order.mock).toBe(true);
    expect(order.id).toMatch(/^MOCK-/);
    expect(new URL(order.approveUrl).searchParams.get("token")).toBe(order.id);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("captures a mock order as COMPLETED without network calls", async () => {
    const { captureOrder } = await importWithEnv<PayPalModule>("@/lib/paypal", {});
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await captureOrder("MOCK-123");

    expect(result).toMatchObject({ id: "MOCK-123", status: "COMPLETED", mock: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("PayPal client with sandbox credentials", () => {
  it("authenticates, creates an order and returns the payer-action link", async () => {
    const { createOrder } = await importWithEnv<PayPalModule>("@/lib/paypal", SANDBOX);
    const fetchMock = queueFetch(
      { body: { access_token: "tok", expires_in: 3600 } },
      {
        body: {
          id: "ORDER-1",
          status: "PAYER_ACTION_REQUIRED",
          links: [{ rel: "payer-action", href: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1" }],
        },
      },
    );

    const order = await createOrder({
      amount: "4.20",
      currency: "USD",
      returnUrl: "http://localhost:3000/api/paypal/return",
      cancelUrl: "http://localhost:3000/",
    });

    expect(order).toEqual({
      id: "ORDER-1",
      status: "PAYER_ACTION_REQUIRED",
      approveUrl: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1",
      mock: false,
    });

    const [authUrl] = fetchMock.mock.calls[0] as unknown as [string];
    expect(authUrl).toBe("https://api-m.sandbox.paypal.com/v1/oauth2/token");

    const [orderUrl, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(orderUrl).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders");
    const body = JSON.parse(init.body as string);
    expect(body.intent).toBe("CAPTURE");
    expect(body.purchase_units[0].amount).toEqual({ currency_code: "USD", value: "4.20" });
  });

  it("surfaces PayPal errors instead of failing silently", async () => {
    const { createOrder } = await importWithEnv<PayPalModule>("@/lib/paypal", SANDBOX);
    queueFetch({ status: 401, body: { error: "invalid_client" } });

    await expect(
      createOrder({ amount: "1.00", returnUrl: "http://x/r", cancelUrl: "http://x/c" }),
    ).rejects.toThrow(/PayPal auth failed \(401\)/);
  });
});
