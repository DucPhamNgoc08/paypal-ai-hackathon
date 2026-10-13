import { createOrder } from "@/lib/paypal";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

const MAX_AMOUNT = 10_000;
const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

// Creates a PayPal order and returns the URL the buyer must visit to approve it.
export async function POST(req: Request) {
  if (!limiter(clientKey(req)).ok) {
    return Response.json({ error: "Too many requests, try again shortly" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    amount?: unknown;
    currency?: unknown;
    description?: unknown;
  };

  const amount = body.amount === undefined ? "1.00" : String(body.amount);
  if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0 || Number(amount) > MAX_AMOUNT) {
    return Response.json({ error: `amount must be between 0.01 and ${MAX_AMOUNT}, like 1.00` }, { status: 400 });
  }

  const currency = typeof body.currency === "string" ? body.currency.toUpperCase() : "USD";
  if (!/^[A-Z]{3}$/.test(currency)) {
    return Response.json({ error: "currency must be a 3-letter code like USD" }, { status: 400 });
  }

  const description = typeof body.description === "string" ? body.description.slice(0, 127) : undefined;
  const origin = new URL(req.url).origin;

  try {
    const order = await createOrder({
      amount,
      currency,
      description,
      returnUrl: `${origin}/api/paypal/return`,
      cancelUrl: `${origin}/?payment=cancelled`,
    });
    return Response.json(order);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "PayPal request failed" }, { status: 502 });
  }
}
