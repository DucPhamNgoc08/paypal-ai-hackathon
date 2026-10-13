// Thin wrapper over the PayPal REST API (sandbox).
// Falls back to a mock when credentials are missing, so the app still runs for judges without keys.

import { env, paypalConfigured } from "./env";

export type CreatedOrder = {
  id: string;
  status: string;
  approveUrl: string;
  mock: boolean;
};

export type CapturedOrder = {
  id: string;
  status: string;
  amount?: { currency_code: string; value: string };
  payerEmail?: string;
  mock: boolean;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const basic = Buffer.from(`${env.paypal.clientId}:${env.paypal.clientSecret}`).toString("base64");
  const res = await fetch(`${env.paypal.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`PayPal auth failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function paypalFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${env.paypal.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`PayPal ${init.method ?? "GET"} ${path} failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

type PayPalLink = { href: string; rel: string };

export async function createOrder(input: {
  amount: string;
  currency?: string;
  description?: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<CreatedOrder> {
  const currency = input.currency ?? "USD";

  if (!paypalConfigured) {
    const id = `MOCK-${Date.now()}`;
    const url = new URL(input.returnUrl);
    url.searchParams.set("token", id);
    return { id, status: "PAYER_ACTION_REQUIRED", approveUrl: url.toString(), mock: true };
  }

  const order = await paypalFetch<{ id: string; status: string; links: PayPalLink[] }>(
    "/v2/checkout/orders",
    {
      method: "POST",
      headers: { "PayPal-Request-Id": crypto.randomUUID() },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: currency, value: input.amount },
            description: input.description,
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              return_url: input.returnUrl,
              cancel_url: input.cancelUrl,
              user_action: "PAY_NOW",
              shipping_preference: "NO_SHIPPING",
            },
          },
        },
      }),
    },
  );

  const approve = order.links.find((l) => l.rel === "payer-action" || l.rel === "approve");
  if (!approve) throw new Error(`PayPal order ${order.id} has no approval link`);

  return { id: order.id, status: order.status, approveUrl: approve.href, mock: false };
}

export async function captureOrder(orderId: string): Promise<CapturedOrder> {
  if (!paypalConfigured || orderId.startsWith("MOCK-")) {
    return {
      id: orderId,
      status: "COMPLETED",
      amount: { currency_code: "USD", value: "1.00" },
      payerEmail: "buyer@example.com",
      mock: true,
    };
  }

  const data = await paypalFetch<{
    id: string;
    status: string;
    payer?: { email_address?: string };
    purchase_units?: { payments?: { captures?: { amount: { currency_code: string; value: string } }[] } }[];
  }>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: { "PayPal-Request-Id": `capture-${orderId}` },
  });

  return {
    id: data.id,
    status: data.status,
    amount: data.purchase_units?.[0]?.payments?.captures?.[0]?.amount,
    payerEmail: data.payer?.email_address,
    mock: false,
  };
}
