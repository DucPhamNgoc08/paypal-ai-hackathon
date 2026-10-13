import { chat } from "@/lib/ai";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

const MAX_PROMPT_CHARS = 2000;
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

export async function POST(req: Request) {
  const rate = limiter(clientKey(req));
  if (!rate.ok) {
    return Response.json(
      { error: "Too many requests, try again shortly" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { prompt?: unknown };
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return Response.json({ error: `prompt must be at most ${MAX_PROMPT_CHARS} characters` }, { status: 400 });
  }

  try {
    const reply = await chat([
      { role: "system", content: "You are a concise assistant inside a payments app." },
      { role: "user", content: prompt },
    ]);
    return Response.json(reply);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "AI provider request failed" }, { status: 502 });
  }
}
