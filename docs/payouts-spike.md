# Payouts spike

The product idea depends on sending money out in batches with PayPal Payouts. Before building on it, `scripts/check-payouts.mjs` checks on the real sandbox that this app can do that, and to which wallets.

## What it answers

| Question | How the script checks it |
| --- | --- |
| Is Payouts enabled for this sandbox app? | Looks for the `https://uri.paypal.com/payments/payouts` scope in the OAuth token, then sends a batch |
| Does a payout reach a PayPal account? | `--email`: $1.00 to a sandbox personal account, expects item status `SUCCESS` |
| Does a payout reach Venmo on the sandbox? | `--venmo`: $1.00 with `recipient_wallet: VENMO`, expects `SUCCESS` |
| What happens when the receiver has no account? | `--unclaimed`: $1.00 to a fresh `@example.com` address, expects `UNCLAIMED` |

Each case is its own one-item batch, so a rejected Venmo item does not hide the result of the PayPal one.

## Run it

1. In the [developer dashboard](https://developer.paypal.com/dashboard/accounts), open **Sandbox accounts** and copy the email of the default **personal** account. The app's own **business** account is the sender and needs a sandbox balance.
2. Make sure `.env.local` has `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` for a sandbox app.
3. Run:

```bash
npm run check:payouts -- --email <personal sandbox email> --unclaimed
# optional Venmo try; --venmo-type is PHONE (default), EMAIL or USER_HANDLE
npm run check:payouts -- --venmo <US phone or handle> --venmo-type PHONE
# re-check batches that were still pending
npm run check:payouts -- --batch <payout_batch_id>
```

Options: `--amount` (default `1.00`, USD), `--wait` seconds to poll before giving up (default `60`).

Exit code is 1 when a batch is rejected or an item ends in a status other than the expected one. Items still `PENDING` when the wait runs out are printed as `WAIT` with the command to re-check them.

## Things the docs say, not yet seen on our sandbox

PayPal's developer docs were not reachable while this script was written, so these come from search summaries of them and still need the sandbox run to confirm:

- Venmo payouts are US only, and the item needs a note (the script always sends one).
- The docs disagree on the recipient type for Venmo (`PHONE`, `EMAIL` or `USER_HANDLE`), and one source says the sandbox does not support `PHONE`. That is why `--venmo-type` exists.
- An `UNCLAIMED` item is returned to the sender after 30 days, and can be cancelled before that with `POST /v1/payments/payouts-item/{id}/cancel`.

## Results

Fill this in after running against the sandbox.

| Date | Case | Result | Notes |
| --- | --- | --- | --- |
| | paypal | | |
| | unclaimed | | |
| | venmo | | |
