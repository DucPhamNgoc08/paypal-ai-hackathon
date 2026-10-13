# Project Name

> One-line pitch: what this does and who it is for.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) (Oct–Nov 2026).

## Demo

- **Hosted demo:** _link here_
- **Demo video (< 3 min):** _YouTube link here_

## The problem

Who has this problem, and why existing tools don't solve it well.

## Why not existing tools

What PayPal's built-in features or other products already do, and what this adds.

## What it does

Core flow, step by step, from the user's point of view.

## How PayPal is used

| PayPal product / API | Where it is used | Why |
| --- | --- | --- |
| Orders API v2 (sandbox) | `src/lib/paypal.ts` | Create and capture payments |

## How AI is used

| Model / AI service | Where it is used | Why |
| --- | --- | --- |
| _model name_ | `src/lib/ai.ts` | _..._ |

## Architecture

Diagrams of the components and the payment flow: [docs/architecture.md](docs/architecture.md).

```
src/
  app/
    page.tsx                  UI
    api/
      health/route.ts         which integrations are live (no secrets)
      ai/route.ts             AI endpoint
      paypal/orders/route.ts  create a PayPal order
      paypal/return/route.ts  PayPal redirects here, payment is captured
  lib/
    env.ts                    config + mock-mode detection
    paypal.ts                 PayPal REST client (sandbox)
    ai.ts                     OpenAI-compatible chat client
    rate-limit.ts             per-IP rate limiting for public API routes
tests/                        unit tests (no network)
scripts/check-sandbox.mjs     verifies real PayPal sandbox + AI credentials
docs/                         architecture and design notes
SUBMIT.md                     Devpost submission kit and checklist
```

## Getting started

### Prerequisites

- Node.js 22.9 or newer
- Optional: a free [PayPal Developer](https://developer.paypal.com/) account (sandbox)
- Optional: an API key for any OpenAI-compatible AI provider

### Run it

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
npm install
cp .env.example .env.local   # optional, fill in keys
npm run dev
```

Open http://localhost:3000.

**No keys? It still runs.** Any integration without credentials falls back to mock mode, shown by a yellow badge on the page. Add keys to `.env.local` to switch to the real PayPal sandbox and a real model.

### Useful commands

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests, no network or keys needed |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run check:sandbox` | Calls the real PayPal sandbox and AI provider with the keys in `.env.local` and prints a sandbox approval link |

### Test accounts for judges

| Role | Sandbox email | Password |
| --- | --- | --- |
| Buyer | _..._ | _..._ |

## Verified on the PayPal sandbox

_Date and what was tested end to end._

## Security and scope

- Runs against the **PayPal sandbox only**. No real money moves.
- PayPal and AI keys are read on the server (`src/lib/env.ts`) and never sent to the browser.
- `.env.local` is git-ignored; only `.env.example` with empty values is committed.
- Captures send a `PayPal-Request-Id` derived from the order id, so retrying a capture does not charge twice.
- API routes validate input (amount range, currency code, prompt length) and apply a per-IP rate limit, so a public demo cannot be used to burn the AI key. The limit is in-memory, so on serverless hosts it is best-effort.
- Error responses do not echo upstream error bodies; details go to the server log.

## Sponsor tools used

_None yet._

## AI tools used to build this

_e.g. coding assistants used during development._

## What's next

_What you would build with more time._

## License

[MIT](LICENSE)
