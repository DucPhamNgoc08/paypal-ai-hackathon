#!/usr/bin/env node
// Spike: can this sandbox app send PayPal Payouts, and to which wallets?
// Reads PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET from .env.local. Sandbox only, no real money.
//
// Usage:
//   npm run check:payouts -- --email <sandbox personal account email>
//   npm run check:payouts -- --email <...> --venmo <phone or handle> [--venmo-type PHONE|EMAIL|USER_HANDLE] --unclaimed
//   npm run check:payouts -- --batch <payout_batch_id>        re-check a batch sent earlier
//
// Each case goes out as its own one-item batch, so a rejected Venmo item cannot sink the PayPal one.
//   --email      PayPal wallet, sandbox personal account   expected item status: SUCCESS
//   --venmo      Venmo wallet (US only)                    expected item status: SUCCESS
//   --unclaimed  PayPal wallet, email with no account      expected item status: UNCLAIMED

import { parseArgs } from "node:util";

const PAYPAL_BASE = "https://api-m.sandbox.paypal.com";
const PAYOUTS_SCOPE = "https://uri.paypal.com/payments/payouts";
const POLL_EVERY_MS = 5_000;
const env = (name) => process.env[name]?.trim() ?? "";

const { values: args } = parseArgs({
  options: {
    email: { type: "string" },
    venmo: { type: "string" },
    "venmo-type": { type: "string", default: "PHONE" },
    unclaimed: { type: "boolean", default: false },
    amount: { type: "string", default: "1.00" },
    batch: { type: "string", multiple: true },
    wait: { type: "string", default: "60" },
  },
});

let failures = 0;

function fail(message) {
  failures++;
  console.log(`Payouts FAIL  ${message}`);
}

/** PayPal error bodies look like { name, message, details: [{ field, issue }], debug_id }. */
async function describeError(res) {
  const text = await res.text();
  try {
    const body = JSON.parse(text);
    const details = (body.details ?? []).map((d) => `${d.field ?? ""} ${d.issue ?? d.description ?? ""}`.trim());
    return [`${res.status} ${body.name ?? body.error ?? ""}: ${body.message ?? body.error_description ?? ""}`]
      .concat(details.map((d) => `  - ${d}`))
      .concat(body.debug_id ? [`  debug_id ${body.debug_id}`] : [])
      .join("\n              ");
  } catch {
    return `${res.status}: ${text}`;
  }
}

async function getToken() {
  const id = env("PAYPAL_CLIENT_ID");
  const secret = env("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) {
    console.log("Payouts SKIP  PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set in .env.local");
    process.exit(0);
  }

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    fail(`auth ${await describeError(res)}`);
    process.exit(1);
  }

  const { access_token, scope = "" } = await res.json();
  const hasScope = scope.split(" ").includes(PAYOUTS_SCOPE);
  console.log(`Payouts ${hasScope ? "OK  " : "WARN"}  token has payouts scope: ${hasScope ? "yes" : "no"}`);
  if (!hasScope) {
    console.log("              the app may need Payouts enabled in the developer dashboard; trying anyway");
  }
  return access_token;
}

async function api(token, path, init = {}) {
  return fetch(`${PAYPAL_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
}

function buildCases() {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const cases = [];

  if (args.email) {
    cases.push({
      label: "paypal",
      expect: "SUCCESS",
      item: { recipient_type: "EMAIL", receiver: args.email, recipient_wallet: "PAYPAL" },
    });
  }
  if (args.venmo) {
    cases.push({
      label: "venmo",
      expect: "SUCCESS",
      item: { recipient_type: args["venmo-type"].toUpperCase(), receiver: args.venmo, recipient_wallet: "VENMO" },
    });
  }
  if (args.unclaimed) {
    cases.push({
      label: "unclaimed",
      expect: "UNCLAIMED",
      item: { recipient_type: "EMAIL", receiver: `no-account-${stamp}@example.com`, recipient_wallet: "PAYPAL" },
    });
  }

  return cases.map((c) => ({
    ...c,
    senderBatchId: `check-payouts-${stamp}-${c.label}`,
    item: {
      ...c.item,
      amount: { value: args.amount, currency: "USD" },
      // Venmo requires a note; PayPal shows it to the recipient.
      note: "Sandbox test payout from check-payouts.mjs",
      sender_item_id: `${c.label}-${stamp}`,
    },
  }));
}

async function sendBatch(token, c) {
  const res = await api(token, "/v1/payments/payouts", {
    method: "POST",
    headers: { "PayPal-Request-Id": c.senderBatchId },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: c.senderBatchId,
        email_subject: "You have a test payout",
        email_message: "Sandbox test payout. No real money.",
      },
      items: [c.item],
    }),
  });
  if (!res.ok) {
    fail(`${c.label}: create batch ${await describeError(res)}`);
    return null;
  }
  const { batch_header } = await res.json();
  console.log(`Payouts OK    ${c.label}: batch ${batch_header.payout_batch_id} accepted (${batch_header.batch_status})`);
  return batch_header.payout_batch_id;
}

async function getBatch(token, batchId) {
  const res = await api(token, `/v1/payments/payouts/${encodeURIComponent(batchId)}`);
  if (!res.ok) throw new Error(await describeError(res));
  return res.json();
}

function isSettled(batch) {
  const status = batch.batch_header?.batch_status;
  if (status === "PENDING" || status === "PROCESSING") return false;
  return (batch.items ?? []).every((i) => i.transaction_status !== "PENDING");
}

/** Polls until the batch settles or the wait runs out. Returns the last batch seen. */
async function waitForBatch(token, batchId, deadline) {
  for (;;) {
    const batch = await getBatch(token, batchId);
    if (isSettled(batch) || Date.now() >= deadline) return batch;
    await new Promise((r) => setTimeout(r, POLL_EVERY_MS));
  }
}

function report(label, batch, expect) {
  const header = batch.batch_header ?? {};
  console.log(`              ${label}: batch ${header.payout_batch_id} is ${header.batch_status}`);
  if (expect && header.batch_status === "DENIED") fail(`${label}: batch denied`);

  for (const item of batch.items ?? []) {
    const status = item.transaction_status ?? "UNKNOWN";
    const wallet = item.payout_item?.recipient_wallet ?? "PAYPAL";
    const receiver = item.payout_item?.receiver ?? "?";
    const error = item.errors ? `, error ${item.errors.name}: ${item.errors.message}` : "";
    const line = `${label} -> ${wallet} ${receiver}: ${status}${error} (item ${item.payout_item_id})`;

    if (!expect) console.log(`              ${line}`);
    else if (status === expect) console.log(`Payouts OK    ${line}`);
    else if (status === "PENDING" || status === "ONHOLD") console.log(`Payouts WAIT  ${line}`);
    else fail(`${line}, expected ${expect}`);
  }
}

const token = await getToken();
const waitMs = Number(args.wait) * 1000;

if (args.batch?.length) {
  for (const id of args.batch) {
    try {
      report("batch", await getBatch(token, id));
    } catch (err) {
      fail(`get batch ${id}: ${err.message}`);
    }
  }
  process.exit(failures ? 1 : 0);
}

const cases = buildCases();
if (cases.length === 0) {
  console.log("Payouts SKIP  nothing to send. Pass --email <sandbox personal email>, --venmo <receiver> or --unclaimed");
  process.exit(0);
}

const sent = [];
for (const c of cases) {
  const batchId = await sendBatch(token, c);
  if (batchId) sent.push({ ...c, batchId });
}

if (sent.length) console.log(`              waiting up to ${args.wait}s for batches to settle...`);
const deadline = Date.now() + waitMs;
const pending = [];
for (const c of sent) {
  try {
    const batch = await waitForBatch(token, c.batchId, deadline);
    report(c.label, batch, c.expect);
    if (!isSettled(batch)) pending.push(c.batchId);
  } catch (err) {
    fail(`${c.label}: get batch ${c.batchId}: ${err.message}`);
  }
}

if (pending.length) {
  console.log(`              still pending, re-check later with:`);
  console.log(`              npm run check:payouts -- ${pending.map((id) => `--batch ${id}`).join(" ")}`);
}

process.exit(failures ? 1 : 0);
