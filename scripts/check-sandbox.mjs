#!/usr/bin/env node
// Verifies real credentials end to end, outside the web app.
// Usage: npm run check:sandbox   (reads .env.local if it exists)
//
// PayPal: gets an OAuth token, creates a $1.00 sandbox order and prints the approval link.
// AI:     sends one short prompt to the configured model.

const PAYPAL_BASE = "https://api-m.sandbox.paypal.com";
const env = (name) => process.env[name]?.trim() ?? "";

let failures = 0;

async function checkPayPal() {
  const id = env("PAYPAL_CLIENT_ID");
  const secret = env("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) {
    console.log("PayPal  SKIP  PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set");
    return;
  }

  const tokenRes = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes.ok) {
    failures++;
    console.log(`PayPal  FAIL  auth ${tokenRes.status}: ${await tokenRes.text()}`);
    return;
  }
  const { access_token } = await tokenRes.json();

  const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ amount: { currency_code: "USD", value: "1.00" }, description: "check-sandbox" }],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: "http://localhost:3000/api/paypal/return",
            cancel_url: "http://localhost:3000/",
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
          },
        },
      },
    }),
  });
  if (!orderRes.ok) {
    failures++;
    console.log(`PayPal  FAIL  create order ${orderRes.status}: ${await orderRes.text()}`);
    return;
  }
  const order = await orderRes.json();
  const link = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
  console.log(`PayPal  OK    order ${order.id} (${order.status})`);
  console.log(`              approve with a sandbox buyer account: ${link}`);
}

async function checkAI() {
  const key = env("AI_API_KEY");
  if (!key) {
    console.log("AI      SKIP  AI_API_KEY not set");
    return;
  }
  const base = (env("AI_BASE_URL") || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = env("AI_MODEL") || "gpt-4o-mini";

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: "Reply with the single word: ok" }] }),
  });
  if (!res.ok) {
    failures++;
    console.log(`AI      FAIL  ${res.status}: ${await res.text()}`);
    return;
  }
  const data = await res.json();
  console.log(`AI      OK    ${model} replied: ${data.choices?.[0]?.message?.content?.trim()}`);
}

await checkPayPal();
await checkAI();
process.exit(failures ? 1 : 0);
