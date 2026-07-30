# NJ Courier finance and payments

The Finance hub is the publication’s internal revenue-operations and accounting
evidence layer. It makes NJC+ commerce, processor settlements, operating
expenses, tax liabilities and reserves inspectable without pretending that
software can choose the Courier’s legal entity, file a return or replace a
qualified bookkeeper, CPA, payroll provider or attorney.

## Studio surfaces

Finance appears as a dedicated, permission-controlled Studio hub:

- **Financial control room** — selected-period gross receipts, refunds,
  disputes, fees, net revenue, operating result, MRR/ARR, subscription health,
  revenue concentration, trends and reserve targets.
- **General ledger** — Stripe-settled and supported manual entries. Posted
  records cannot be edited or deleted; corrections create a linked equal and
  opposite reversal.
- **Reconciliation & closes** — idempotent Stripe balance synchronization,
  webhook processing evidence, versioned month/quarter/year closes and
  independent review.
- **Reserve policy** — legal reporting name, fiscal year, currency,
  adviser-approved reserve rates and operating-reserve target.

The `tools:finance` capability controls the hub, routes and APIs. Administrators
receive it by default; another active employee can receive an explicit grant.
Access is checked again server-side for every read, export and mutation.

## Payment lifecycle

NJC+ uses hosted Stripe Checkout. The server selects a stored Stripe Price; the
client cannot supply a price or customer ID. Checkout:

1. requires a signed-in account and enabled NJC+ paywall/checkout flags;
2. validates the visible tier and any active offer in PostgreSQL;
3. reuses the account’s existing Stripe Customer where possible;
4. requests billing address and tax-ID collection;
5. enables Stripe Tax only when `STRIPE_TAX_ENABLED=true`;
6. sends canonical account/tier/offer metadata to Stripe;
7. returns only a short-lived hosted Checkout URL.

The success page never grants access. Signed Stripe webhooks create or update the
subscription and entitlement. Events are claimed in
`financial_provider_events` before processing, so completed events are not
applied twice. Failed events retain attempt and error evidence for retry.

Signed-in customers with a connected Stripe Customer can use `/plus/account`.
Its button creates a short-lived Stripe Customer Portal session on the server
and never accepts a customer ID from the browser.

## Financial evidence model

`financial_ledger_entries` is an internal operating subledger:

- Stripe balance transactions use the provider balance-transaction ID as a
  unique idempotency boundary;
- money is stored as integer minor units plus ISO currency;
- gross, fee, tax and net amounts remain separate;
- provider and object IDs support reconciliation;
- manual entries require a unique idempotency key and exact confirmation;
- corrections append `reversal` records rather than mutating history.

Payouts are cash transfers, not revenue or expense, and remain separate from the
profit-and-loss bridge. Stripe recommends balance transactions as the starting
point for reporting and provides `reporting_category` for stable
classification:

- <https://docs.stripe.com/reports/balance-transaction-types>
- <https://docs.stripe.com/reports/balance>
- <https://docs.stripe.com/reports/payout-reconciliation>

This is not a double-entry general ledger, bank feed, payroll system, tax return
or GAAP/IFRS certification. Export it to the chosen accounting system and
reconcile it to Stripe payouts and bank statements.

## Metrics

- **Gross collected** — positive payment and income gross amounts.
- **Refunds/disputes** — reported separately from revenue.
- **Net revenue** — gross less refunds, net disputes, fees and tax collected,
  plus documented adjustments.
- **Operating result** — net revenue less recorded operating expenses.
- **MRR** — monthly equivalent of active recurring tier prices.
- **ARR run rate** — MRR multiplied by 12; not recognized revenue or a forecast.

Numbers are useful only after Stripe synchronization and complete off-platform
expense entry. Do not treat an incomplete ledger as a return or cash balance.

## Tax and reserve policy

Sales tax recorded in the ledger is treated as a liability:

`sales tax payable = tax collected - recorded tax payments`

Other set-asides are configurable planning targets:

- federal and New Jersey income-tax reserve — percentage of positive operating
  profit;
- payroll-tax reserve — percentage of recorded payroll expense;
- refund/chargeback and contingency reserves — percentage of gross receipts;
- operating reserve — monthly operating budget × target months.

Defaults are zero. The app deliberately refuses to invent a percentage because
entity type, elections, nexus, taxable products, payroll and filing history are
unresolved facts. Mark a policy reviewed only after a qualified professional
approves it. The review record is evidence, not a professional opinion.

IRS guidance explains that records must support income, expenses and credits:
<https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping>.

## Period close, review and exports

A completed month, quarter or year can be closed into a versioned snapshot with
period boundaries, financial summary, entry count, currency, reserve-policy
timestamp and closing account. Re-closing supersedes but never deletes the
prior version. The closer cannot review their own close; a second
finance-authorized account records `reviewed` or `exception` with notes.

`/api/v1/studio/finance/export` produces a permission-checked CSV. The encrypted
portable backup includes finance settings, provider events, ledger, closes and
NJC+ commerce records. It never contains Stripe API keys, webhook secrets, card
data or bank credentials.

## Environment and Stripe setup

Required:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

Optional:

```text
STRIPE_TAX_ENABLED=false
STRIPE_BILLING_PORTAL_CONFIGURATION_ID=
```

Configure the webhook at:

```text
https://www.thejerseycourier.com/api/webhooks/stripe
```

Subscribe at minimum to:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`
- `invoice.finalization_failed`
- `balance.available`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.closed`
- `payout.paid`
- `payout.failed`

Stripe documents subscription events at
<https://docs.stripe.com/billing/subscriptions/webhooks>, duplicate delivery at
<https://docs.stripe.com/webhooks?lang=node>, Customer Portal at
<https://docs.stripe.com/customer-management/integrate-customer-portal> and
automatic tax at <https://docs.stripe.com/payments/checkout/taxes>.

## Production activation checklist

1. Apply `apps/web/drizzle/0026_first_doomsday.sql`.
2. Configure Stripe test mode and the signed webhook.
3. Create recurring Products/Prices and store IDs on hidden Studio tiers.
4. Configure and test Customer Portal behavior.
5. Decide tax registrations and product tax codes with a professional before
   enabling Stripe Tax.
6. Test successful, declined, action-required, trial, renewal, cancellation,
   refund, dispute and failed-payout scenarios.
7. Synchronize Stripe and compare Studio with Stripe Balance and Payout
   Reconciliation reports and the test bank destination.
8. Have a professional approve the reserve policy.
9. Close and independently review a test month.
10. Export CSV and an encrypted backup, then verify restore evidence.
11. Complete privacy, terms, refund and commercial-hosting review.
12. Move to live-mode products and credentials only after all checks pass.

Live payments and tax collection are intentionally not activated by source code.
