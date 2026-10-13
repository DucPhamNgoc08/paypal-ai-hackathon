"use client";

import { useState } from "react";

export function AiPlayground() {
  const [prompt, setPrompt] = useState("Suggest a name for a PayPal + AI app.");
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);
    setReply(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setReply(data.text ?? data.error ?? "No reply");
    } catch (err) {
      setReply((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        className="min-h-20 rounded-md border border-zinc-300 bg-transparent p-3 text-sm dark:border-zinc-700"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button
        onClick={send}
        disabled={loading || !prompt.trim()}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {loading ? "Thinking..." : "Ask AI"}
      </button>
      {reply && (
        <p className="whitespace-pre-wrap rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-900">{reply}</p>
      )}
    </div>
  );
}

export function PayButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/paypal/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: "1.00", description: "Sandbox smoke test" }),
      });
      const data = await res.json();
      if (!res.ok || !data.approveUrl) throw new Error(data.error ?? "Could not create order");
      window.location.href = data.approveUrl;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={pay}
        disabled={loading}
        className="self-start rounded-md bg-[#0070ba] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Redirecting to PayPal..." : "Pay $1.00 with PayPal (sandbox)"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
