# Payment Test App

Portfolio demo — single-page Astro 5 + Cloudflare Workers shop wired to **5 payment providers in sandbox/test mode**. No real money moves.

## What it shows

- 4 sample products, each with a **결제하기** button.
- Modal lets the buyer pick a payment provider:
  - **Stripe** — real test Checkout Session via Astro Action (USD)
  - **Toss Payments** — real `토스페이먼츠` JS SDK (KRW), public test client key
  - **PortOne** — real `포트원` JS SDK, test merchant
  - **KakaoPay** — *mock* (real integration requires 사업자등록증)
  - **NaverPay** — *mock* (same)
- Success / fail pages render the payment ID returned by each provider.

## Stack

- Astro 5 (SSR) · `@astrojs/cloudflare`
- Tailwind 4
- TypeScript
- Cloudflare Workers · Workers Secrets for the Stripe key
- Sandbox keys committed for Toss / PortOne (safe — official public test keys)

## Run locally

```bash
cp .env.example .env       # fill in your real test keys
pnpm install
pnpm run dev               # http://localhost:4321
```

All payment keys live in `.env` (gitignored). See `.env.example` for which
variables to set. The `PUBLIC_*` keys are exposed to the client bundle by
Astro (this is normal — Stripe pk_test_ and Toss test_ck_ are designed to
appear in browser code). `STRIPE_SECRET_KEY` is server-only.

## Deploy

```bash
pnpm run deploy
```

For Cloudflare Workers Builds CI, set the same env vars in:
**Cloudflare dashboard → your Worker → Settings → Variables and Secrets**

| Variable | Type | Where to get |
|---|---|---|
| `STRIPE_SECRET_KEY` | **Secret** | https://dashboard.stripe.com/test/apikeys |
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | Plain var | same page |
| `PUBLIC_TOSS_CLIENT_KEY` | Plain var | https://developers.tosspayments.com/my/api-keys |

## Deploy

```bash
pnpm run deploy
```

Custom domain → Cloudflare Workers → Settings → Domains & Routes → add `pay.minhojan-world.site` (or similar).

## Real-world certification notes

| Provider | Real-mode requirements |
|---|---|
| Stripe Korea | Personal ID OR 사업자등록증 + bank account |
| Toss Payments | 사업자등록증, 통신판매업 신고, 가맹점 심사 ~3-5일 |
| PortOne | 사업자 + 하위 PG별 가맹점 |
| KakaoPay | 사업자 + 브랜드 심사 |
| NaverPay | 사업자 + 브랜드 심사 |
