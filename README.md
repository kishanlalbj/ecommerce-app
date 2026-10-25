# Bookstore

An online bookstore. The API (Express 5, Drizzle ORM, PostgreSQL, Redis cache) lives in the repo root. The storefront (React + Vite) lives in [`client/`](client/). Payments go through **Stripe Checkout**.

| What | Where |
| --- | --- |
| Storefront | http://localhost:5173 |
| API | http://localhost:3000 |
| API docs (Swagger UI) | http://localhost:3000/docs (raw spec at `/docs.json`) |
| Redis GUI (RedisInsight) | http://localhost:5540 |

## Prerequisites

- **Node.js 20 or newer** (developed on Node 24)
- **Docker Desktop**, for PostgreSQL and Redis, and to run the Stripe CLI without installing it
- A **Stripe account**. Test mode is enough for development.

## 1. Start the database and cache

```bash
docker compose up -d postgres redis
```

This starts PostgreSQL on port **5433**, not the default 5432, so it won't clash with a local install. Redis starts on **6379**.

The compose file also defines `redisinsight`, a Redis GUI, and `rabbitmq`. Add them to the command if you want them; the app doesn't need either.

## 2. Configure the API

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | The default matches `docker-compose.yml` |
| `REDIS_URL` | no | If Redis is down the API still works, just uncached |
| `JWT_SECRET` | yes | At least 32 characters. Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `JWT_EXPIRES_IN` | no | Default `1d` |
| `STRIPE_SECRET_KEY` | yes | `sk_test_...`, see [Stripe setup](#4-stripe-setup) |
| `STRIPE_WEBHOOK_SECRET` | yes | `whsec_...`, see [Stripe setup](#4-stripe-setup) |
| `CLIENT_URL` | no | Where Stripe sends customers back after paying. Default `http://localhost:5173` |
| `CURRENCY` | no | Three-letter currency code, default `usd` |
| `NODE_ENV`, `PORT`, `LOG_LEVEL` | no | Defaults: `development`, `3000`, `debug` in dev |

The API checks these on startup. If one is missing or malformed, it exits and names the variable.

## 3. Install, migrate and seed

```bash
npm install
npm run db:migrate      # create the tables
npm run db:seed         # load the book catalog (safe to re-run)
npm run create-admin -- admin@example.com 'a-strong-password' "Store Admin"
```

Admins manage orders, for example marking them shipped or cancelling and refunding them. Admins can't buy anything. To shop, sign up as a normal customer in the storefront.

## 4. Stripe setup

### How payments work

1. The customer clicks **Place order & pay**. The order is created as `pending` and its books are reserved.
2. The API creates a Stripe Checkout session and the browser goes to Stripe's payment page.
3. After paying, Stripe sends the customer back to `/orders/:id?payment=success`.
4. Stripe separately tells the API the outcome by calling a **webhook**, `POST /payments/webhook`:

| Stripe event | What the API does |
| --- | --- |
| `checkout.session.completed` | Marks the order `paid`. Delayed methods, like bank debits, arrive here as unpaid and are settled by the async events. |
| `checkout.session.async_payment_succeeded` | Marks the order `paid` |
| `checkout.session.async_payment_failed` | Cancels the order and puts the books back in stock |
| `checkout.session.expired` | No payment within **30 minutes**: cancels the order and puts the books back in stock |

When a customer cancels a pending order, the API closes its Stripe session first. When an admin cancels a paid order, the payment is refunded through Stripe.

> **Without the webhook, orders never become paid.** The redirect back to the store is only for the customer. The API trusts nothing but the signed webhook.

### Stock reservations

Stock is reduced **when the order is placed**, before payment, so two customers can't both pay for the last copy. The books stay reserved until the order is paid or released:

| Situation | Result | Stock |
| --- | --- | --- |
| Card declined on Stripe's page | The customer can retry on the same page | Still reserved |
| Customer leaves Stripe's page | The order page offers **Pay now** | Still reserved |
| No payment within 30 minutes | `checkout.session.expired` webhook cancels the order | Released |
| Delayed payment (bank debit) fails | `async_payment_failed` webhook cancels the order | Released |
| Customer cancels a pending order | The Stripe session is closed and the order is cancelled | Released |
| Admin cancels a paid order | The payment is refunded and the order is cancelled | Released |

**The worker is the safety net.** `npm run worker` is a separate process. Every 5 minutes it looks in the database for orders still `pending` more than 35 minutes after they were placed. These are orders whose checkout never started, or whose webhook was missed. For each one, it asks Stripe how the checkout ended:
- No Stripe session, or the session expired: it cancels the order and restocks it.
- Payment completed: it marks the order `paid`.
- A delayed payment is still processing: it leaves the order alone.

The worker keeps nothing in memory. After a crash or restart, its first sweep picks up everything it missed.

### 4a. Get your API key

1. Sign in to the [Stripe Dashboard](https://dashboard.stripe.com) and turn on **Test mode** (toggle at the top).
2. Go to **Developers → API keys** and copy the **Secret key** (`sk_test_...`).
3. Put it in `.env` as `STRIPE_SECRET_KEY`.

> Stripe accounts registered in India are currently invite-only. Test mode doesn't need business verification, but you do need an account to get test keys.

### 4b. Choose payment methods

Payment methods (card, UPI, wallets...) are turned on in the Dashboard under **Settings → Payment methods**, not in code. Stripe Checkout shows whichever methods are on and work for the customer's currency.

### 4c. Forward webhooks to your machine

Stripe can't reach `localhost`, so during development the **Stripe CLI** receives events from Stripe and forwards them to the API. Run it with Docker; nothing to install:

```bash
docker run --rm -it stripe/stripe-cli listen \
  --api-key sk_test_... \
  --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired \
  --forward-to host.docker.internal:3000/payments/webhook
```

On Windows PowerShell or cmd, put the whole command on one line instead of using `\`.

If you'd rather install the CLI: on Windows, run `scoop install stripe` after `scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git`, or download it from the [releases page](https://github.com/stripe/stripe-cli/releases/latest). On macOS, run `brew install stripe/stripe-cli/stripe`. Then use `stripe listen` with the same flags. It isn't available on npm, so `npx stripe` won't work.

When it starts, it prints:

```
Ready! Your webhook signing secret is whsec_...
```

1. Copy that value into `.env` as `STRIPE_WEBHOOK_SECRET`.
2. Restart the API.
3. **Keep the terminal running** while you test. Each event shows up there with the API's response, which should be `[200]`.

If you close the listener, payments still go through on Stripe, but the API never hears about them. Those orders stay `pending`. Fixes are under [Troubleshooting](#troubleshooting).

## 5. Run it

In four terminals:

```bash
# 1. API (restarts on file changes)
npm run dev

# 2. Background worker: releases stock held by abandoned orders
npm run worker:dev

# 3. Storefront
cd client
cp .env.example .env    # defaults are fine for local dev
npm install
npm run dev

# 4. Stripe webhook forwarding (command from 4c)
```

Open http://localhost:5173. In development the storefront sends API calls to `/api`, and Vite passes them on to `http://localhost:3000`.

## Testing payments

Use Stripe's [test cards](https://docs.stripe.com/testing) with any future expiry date, any CVC and any postcode:

| Card number | Result |
| --- | --- |
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 0002` | Card declined |
| `4000 0025 0000 3155` | Asks for 3D Secure authentication |

Things to check:

1. **Paying:** check out and pay with `4242...`. The order page shows "Confirming..." briefly, then "Thanks, your order is paid". The listener terminal shows `checkout.session.completed` with `[200]`.
2. **Leaving without paying:** check out, then click **Back** on Stripe's page. The order page offers **Pay now**, which reopens the same payment session.
3. **Expiry:** leave an order unpaid. After 30 minutes it becomes `cancelled` and its books are back in stock. To skip the wait, expire the session yourself. Find the `cs_test_...` id in the Stripe Dashboard or in the order's `stripeSessionId`, then run:
   ```bash
   docker run --rm -it stripe/stripe-cli checkout sessions expire cs_test_... --api-key sk_test_...
   ```
4. **Refund:** as an admin, cancel a paid order. The refund appears in the Dashboard under **Payments**.

## Going to production

1. Use your **live** secret key (`sk_live_...`) in the production `.env`.
2. In the Dashboard, go to **Developers → Webhooks → Add endpoint**:
   - URL: `https://<your-api-domain>/payments/webhook`
   - Events: the four listed in [How payments work](#how-payments-work)
3. Copy that endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`. It is different from the one the CLI prints.
4. Set `CLIENT_URL` to your storefront's public URL.
5. Set `CURRENCY` to the currency you sell in.
6. If the API is on a different domain from the storefront, set `VITE_API_URL` in `client/.env` before running `npm run build`.
7. Run the worker (`npm run worker`) as its own always-on process next to the API, with the same `.env`. It's safe to run more than one copy. One is enough.

## Scripts

API (repo root):

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the API, restarting on changes |
| `npm run worker` | Start the background worker |
| `npm run worker:dev` | Start the worker, restarting on changes. A restart runs a sweep immediately. |
| `npm start` | Start the API |
| `npm run db:generate` | Create a migration after editing `src/db/schema.js` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Browse the database in Drizzle Studio |
| `npm run db:seed` | Load or refresh the book catalog |
| `npm run create-admin -- <email> <password> [name]` | Create an admin, or promote an existing user and reset their password |

Storefront (`client/`): `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`.

## Troubleshooting

**The API exits with "Invalid environment variables".** A required variable in `.env` is missing or malformed. The error names it. Stripe keys must start with `sk_` and `whsec_`.

**An order stays `pending` after a successful payment.** The webhook didn't reach the API:
- Is the listener running?
- Does `STRIPE_WEBHOOK_SECRET` match what it printed?
- Did you restart the API after changing it?

If the listener was down when the payment happened, the worker marks the order paid within about 40 minutes of it being placed. To fix it sooner, find the event in the Dashboard under **Developers → Events** and resend it:

```bash
docker run --rm -it stripe/stripe-cli events resend evt_... --api-key sk_test_...
```

Resending is safe. The webhook ignores events it has already applied.

**The listener shows `[400]` for every event.** The signing secret is wrong. Copy the `whsec_...` value from the listener into `.env` again and restart the API.

**The listener exits with "must specify events to forward".** Newer CLI versions require `--events`. Use the full command from [4c](#4c-forward-webhooks-to-your-machine).

**"Pay now" fails with a 500 from Stripe.** Check the API log for the Stripe error message. It includes a `request_log_url` that opens the failed request in the Dashboard.
