// Payment provider launchers — all in sandbox/test mode.
// No real charges. No real customer data captured.

// ---- Public test keys (safe to commit) ----
// Toss Payments — your own API 개별연동 test client key.
// https://developers.tosspayments.com/my/api-keys
const TOSS_CLIENT_KEY = "test_ck_pP2YxJ4K87qbyRdvx659VRGZwXLO";

// Stripe publishable test key — yours from https://dashboard.stripe.com/test/apikeys
const STRIPE_PUBLISHABLE_KEY = "pk_test_51TdvjBLKwb1RZRZEpqD0ycauTzEvZQjIbzyrC9ElqIcJgUTM1WSJENXcqBP4wwoIEFhyIXlSUVgSUh2RKGSGampR00cG2cEcy4";

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => any;
    Stripe?: (publishableKey: string) => any;
  }
}

// ---- Helpers ----
function showToast(message: string, ok = true) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden");
  el.style.borderColor = ok ? "rgba(52,211,153,0.4)" : "rgba(251,113,133,0.4)";
  setTimeout(() => el.classList.add("hidden"), 4000);
}

function uniqueOrderId(prefix = "ord") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---- Modal state ----
type Product = {
  id: string;
  name: string;
  priceKrw: number;
  priceUsd: number;
};

let current: Product | null = null;

const modal = document.getElementById("pay-modal");
const modalName = document.getElementById("pay-product-name");
const modalPrice = document.getElementById("pay-product-price");
const closeBtn = document.getElementById("pay-close");

function openModal(p: Product) {
  current = p;
  if (modalName) modalName.textContent = p.name;
  if (modalPrice) modalPrice.textContent = `₩${p.priceKrw.toLocaleString("ko-KR")} · $${p.priceUsd}`;
  modal?.classList.remove("hidden");
  modal?.classList.add("flex");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal?.classList.add("hidden");
  modal?.classList.remove("flex");
  document.body.style.overflow = "";
  current = null;
}

closeBtn?.addEventListener("click", closeModal);
modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// Wire up product Buy buttons
document.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const card = btn.closest("[data-product-id]") as HTMLElement | null;
    if (!card) return;
    openModal({
      id:       card.dataset.productId!,
      name:     card.dataset.productName!,
      priceKrw: Number(card.dataset.productPriceKrw),
      priceUsd: Number(card.dataset.productPriceUsd),
    });
  });
});

// Wire up payment method buttons
document.querySelectorAll<HTMLButtonElement>(".pay-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!current) return;
    const method = btn.dataset.method;
    switch (method) {
      case "stripe": return payWithStripe(current);
      case "toss":   return payWithToss(current);
    }
  });
});

// ---- Stripe ----
async function payWithStripe(p: Product) {
  closeModal();
  showToast("Stripe Checkout 세션 생성 중...");
  try {
    const res = await fetch("/api/checkout/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: p.id,
        productName: p.name,
        priceUsd: p.priceUsd,
        orderId: uniqueOrderId("stripe"),
      }),
    });
    const data = await res.json() as { url?: string; error?: string };
    if (data.url) window.location.href = data.url;
    else showToast(`Stripe 오류: ${data.error ?? "unknown"}`, false);
  } catch (e: any) {
    showToast(`Stripe 네트워크 오류: ${e?.message ?? e}`, false);
  }
}

// ---- Toss Payments ----
function payWithToss(p: Product) {
  closeModal();
  const TossPayments = window.TossPayments;
  if (!TossPayments) return showToast("Toss SDK 로드 실패", false);
  const tp = TossPayments(TOSS_CLIENT_KEY);
  const orderId = uniqueOrderId("toss");
  tp.requestPayment("카드", {
    amount: p.priceKrw,
    orderId,
    orderName: p.name,
    customerName: "테스트 사용자",
    successUrl: `${location.origin}/success?provider=toss`,
    failUrl:    `${location.origin}/fail?provider=toss`,
  }).catch((err: any) => showToast(`Toss 오류: ${err?.message ?? err}`, false));
}

