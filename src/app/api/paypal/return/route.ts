import { captureOrder } from "@/lib/paypal";

// PayPal redirects the buyer here after approval (?token=<orderId>).
// We capture the payment, then send the buyer back to the home page with the result.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("token");
  const home = new URL("/", url.origin);

  if (!orderId) {
    home.searchParams.set("payment", "missing-order");
    return Response.redirect(home, 303);
  }

  try {
    const result = await captureOrder(orderId);
    home.searchParams.set("payment", result.status.toLowerCase());
    home.searchParams.set("order", result.id);
    if (result.mock) home.searchParams.set("mock", "1");
  } catch (err) {
    console.error(err);
    home.searchParams.set("payment", "error");
  }

  return Response.redirect(home, 303);
}
