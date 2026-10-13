import { vi } from "vitest";

/**
 * Sets env vars, then re-imports a module so that src/lib/env.ts reads the new values.
 * env.ts reads process.env once at import time, so a fresh import is needed per scenario.
 */
export async function importWithEnv<T>(path: string, vars: Record<string, string>): Promise<T> {
  vi.resetModules();
  for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value);
  return (await import(path)) as T;
}

/** A fetch mock that answers each call with the next queued JSON body. */
export function queueFetch(...responses: { status?: number; body: unknown }[]) {
  const mock = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error("Unexpected fetch call");
    return new Response(JSON.stringify(next.body), {
      status: next.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}
