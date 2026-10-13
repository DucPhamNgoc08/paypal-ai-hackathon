<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project notes for coding agents

Entry for the PayPal AI Hackathon 2026 (Devpost). Submission rules: https://paypalaihackathon.devpost.com/rules

## Stack

- Next.js 16 (App Router, `cacheComponents` on) + TypeScript + Tailwind CSS 4
- PayPal REST API, **sandbox only** (`src/lib/paypal.ts`)
- Any OpenAI-compatible chat API (`src/lib/ai.ts`)
- Vitest for tests (`tests/`)

## Commands

- `npm run dev`: local dev server on :3000
- `npm test`: unit tests (never hit the network)
- `npm run typecheck`, `npm run lint`
- `npm run check:sandbox`: hits the real PayPal sandbox / AI provider using `.env.local`

## Rules

- Secrets are read only in `src/lib/env.ts`, on the server. Never import it from a `"use client"` file, never prefix secrets with `NEXT_PUBLIC_`.
- Never point PayPal calls at the live API (`api-m.paypal.com`). The hackathon requires the sandbox.
- Every integration must keep working in mock mode when its credentials are missing, so judges can run the app without keys.
- Do not read process.env directly at module scope of a page; with `cacheComponents` that value gets frozen at build time. Read config inside a component that calls `await connection()`, wrapped in `<Suspense>`.
- Add or update a test in `tests/` for every change to `src/lib/` or `src/app/api/`.
- Keep README.md, docs/architecture.md and SUBMIT.md in sync when features change. All repo text is in English.
