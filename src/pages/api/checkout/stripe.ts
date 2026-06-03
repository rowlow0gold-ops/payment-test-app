import type { APIRoute } from "astro";

// Server-side Stripe Checkout Session creation.
// Runs on Cloudflare Workers. STRIPE_SECRET_KEY must be set as a Worker secret:
//   wrangler secret put STRIPE_SECRET_KEY
// For sandbox / no real keys, the demo returns a placeholder URL and a clear notice.

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json() as {
      productId: string;
      productName: string;
      priceKrw: number;
      orderId: string;
    };

    // STRIPE_SECRET_KEY can arrive from three places depending on dev/runtime:
    //   - locals.runtime.env (wrangler dev / deployed Worker via .dev.vars or secret)
    //   - import.meta.env  (astro dev via .env)
    //   - process.env       (node fallback)
    const cfEnv = (locals as any).runtime?.env ?? {};
    const secret = (cfEnv.STRIPE_SECRET_KEY
      ?? (import.meta.env as any)?.STRIPE_SECRET_KEY
      ?? (typeof process !== "undefined" ? process.env?.STRIPE_SECRET_KEY : undefined)) as string | undefined;
    const origin = new URL(request.url).origin;

    // Demo-mode fallback: no key set → return a fake success URL so the UI still flows.
    if (!secret) {
      const fakeUrl = `${origin}/success?provider=stripe&id=demo_no_key&mock=1`;
      return Response.json({ url: fakeUrl, demo: true });
    }

    // Real test-mode Stripe Checkout Session.
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `${origin}/success?provider=stripe&session_id={CHECKOUT_SESSION_ID}`);
    params.append("cancel_url",  `${origin}/fail?provider=stripe`);
    params.append("client_reference_id", body.orderId);
    // KRW is a zero-decimal currency in Stripe — pass the won amount as-is
    // (NOT multiplied by 100). Buyer sees the exact ₩{amount}, no FX surprise.
    // Merchant's Stripe account converts to settlement currency on payout.
    params.append("line_items[0][price_data][currency]", "krw");
    params.append("line_items[0][price_data][product_data][name]", body.productName);
    params.append("line_items[0][price_data][unit_amount]", String(body.priceKrw));
    params.append("line_items[0][quantity]", "1");

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data: any = await res.json();

    if (!res.ok) {
      return Response.json({ error: data?.error?.message ?? "Stripe API error" }, { status: 500 });
    }
    return Response.json({ url: data.url });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "unknown" }, { status: 500 });
  }
};
