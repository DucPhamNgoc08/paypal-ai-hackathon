// Minimal client for any OpenAI-compatible chat completions API.
// Swap AI_BASE_URL / AI_MODEL to use a different provider without touching code.

import { aiConfigured, env } from "./env";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function chat(messages: ChatMessage[]): Promise<{ text: string; mock: boolean }> {
  if (!aiConfigured) {
    const last = messages.findLast((m) => m.role === "user")?.content ?? "";
    return { text: `[mock AI] You said: "${last}". Set AI_API_KEY to get a real reply.`, mock: true };
  }

  const res = await fetch(`${env.ai.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.ai.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: env.ai.model, messages }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`AI request failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return { text: data.choices[0]?.message?.content ?? "", mock: false };
}
