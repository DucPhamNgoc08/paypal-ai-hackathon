import { connection } from "next/server";
import { aiConfigured, env, paypalConfigured } from "@/lib/env";

// Reports which integrations are live. Never returns secrets.
export async function GET() {
  await connection(); // evaluate at request time, not build time
  return Response.json({
    ok: true,
    paypal: paypalConfigured ? "sandbox" : "mock",
    ai: aiConfigured ? { mode: "live", model: env.ai.model } : { mode: "mock" },
  });
}
