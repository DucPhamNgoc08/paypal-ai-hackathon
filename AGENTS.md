<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

Instructions for anyone writing code in this repo: AI coding agents and humans alike. Read this whole file before your first change.

## Project

Entry for the PayPal AI Hackathon 2026 on Devpost. Rules: https://paypalaihackathon.devpost.com/rules
Submission deadline: Nov 12, 2026, 12:00 PM PST.

The repo is public and judges read it. All code, comments, commits, PRs and docs are in **English**.

## Stack

- Next.js 16 (App Router, `cacheComponents` on) + TypeScript + Tailwind CSS 4
- PayPal REST API, **sandbox only** (`src/lib/paypal.ts`)
- Any OpenAI-compatible chat API (`src/lib/ai.ts`)
- Vitest (`tests/`), ESLint, husky + lint-staged, GitHub Actions (`.github/workflows/ci.yml`)

## Commands

| Command | Use |
| --- | --- |
| `npm run dev` | Local dev server on :3000 |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route type generation + `tsc --noEmit` |
| `npm test` | Unit tests, never touch the network |
| `npm run build` | Production build |
| `npm run check:sandbox` | Hits the real PayPal sandbox and AI provider using `.env.local` |

## Git workflow (GitHub Flow)

### Branches

- `main` is always green and deployable. **Never commit or push directly to `main`.**
- One task = one branch = one pull request.
- Branch name: `<type>/<short-kebab-description>`, e.g. `feat/invoice-parser`, `fix/capture-redirect`, `docs/readme-demo-link`.
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`.
- Two agents never work on the same branch at the same time. To run agents in parallel, give each its own `git worktree`.
- Keep branches short-lived. If `main` moved on, rebase your branch onto `main` before opening or updating the PR, then push with `git push --force-with-lease`. This is the only allowed force push, and only on your own feature branch.

### Commits (Conventional Commits)

Format: `type(scope): summary`

- Same types as branches. Scopes: `paypal`, `ai`, `api`, `ui`, `tests`, `docs`, `ci`, `deps`.
- Summary in the imperative mood, lower case, no trailing period, max 72 characters.
  Good: `feat(paypal): add refund endpoint`. Bad: `Updated stuff.`
- Add a body when the *why* is not obvious from the diff.
- Small, focused commits. Each commit should build and pass tests.
- AI agents keep their `Co-Authored-By` trailer so AI-written code stays traceable.

### Git hooks (installed automatically by `npm install`)

| Hook | Runs | Purpose |
| --- | --- | --- |
| `pre-commit` | ESLint on staged files (`lint-staged`) | Fast, keeps every commit lint-clean |
| `pre-push` | `npm run typecheck` and `npm test` | Broken code never leaves the machine |

When a hook fails, fix the cause and commit or push again. **Never bypass hooks** (`--no-verify`, `HUSKY=0`, editing `.husky/`).

### Task workflow

Follow these steps in order for every task:

1. Sync: `git switch main && git pull --ff-only`
2. Branch: `git switch -c <type>/<description>`
3. Understand before editing: read the files you will touch and the related tests. For anything bigger than a small fix, write a short plan first.
4. Implement the change together with its tests. Any change in `src/lib/` or `src/app/api/` needs a new or updated test in `tests/`.
5. Verify locally: `npm run lint && npm run typecheck && npm test`. Also run `npm run build` if you changed config, dependencies, layouts or pages.
6. Update docs in the same branch if behaviour changed: `README.md`, `docs/architecture.md`, `SUBMIT.md`.
7. Commit (hooks run), then `git push -u origin <branch>`.
8. Open a pull request into `main` using the PR template. PR title follows the commit format, because it becomes the squash commit message.
9. Wait for CI to pass. If it fails, push fixes to the same branch.
10. **Stop there.** The repo owner reviews and merges. Agents never merge PRs.

### Merging

- **Squash and merge** only: each PR becomes one commit on `main`, titled with the PR title.
- Delete the branch after merging.
- When the project is submitted, tag that exact commit: `git tag submission && git push origin submission`. No changes to the submitted build after the deadline.

## Code rules

- Secrets are read only in `src/lib/env.ts`, on the server. Never import it from a `"use client"` file. Never prefix secrets with `NEXT_PUBLIC_`.
- PayPal calls go to the sandbox (`api-m.sandbox.paypal.com`) only. Never the live API.
- Every integration must keep working in mock mode when its credentials are missing, so judges can run the app without keys.
- With `cacheComponents`, do not read `process.env` or request data at the top level of a page. Read it inside a component that awaits `connection()` (or request data), wrapped in `<Suspense>`.
- Public API routes validate their input and keep the rate limiter in `src/lib/rate-limit.ts`.
- Error responses must not echo upstream error bodies or secrets; log details on the server.
- Before using a Next.js API you are unsure about, check `node_modules/next/dist/docs/`.

## Never do this

- Commit `.env`, `.env.local` or any secret, token or key. Do not edit `.env*` files except `.env.example`.
- Push to `main`, force-push `main` or a branch someone else is working on, or use a plain `--force` (use `--force-with-lease` on your own branch only).
- Bypass hooks or CI, or delete, skip or weaken tests to get a green run.
- Add or upgrade dependencies, or change CI, hooks or lint config, without saying why in the PR description.
- Change code outside the scope of the task. Note unrelated problems in the PR instead.
- (AI agents) Merge a PR, approve a PR, or change repository settings. Only the repo owner does that.

## Definition of done

- [ ] Branch and commits follow the naming rules above
- [ ] Lint, typecheck and tests pass locally; build passes if relevant
- [ ] New behaviour has tests; mock mode still works
- [ ] Docs updated if behaviour changed
- [ ] PR opened with the template filled in, CI green
