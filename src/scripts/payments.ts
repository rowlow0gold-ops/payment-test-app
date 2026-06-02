// Payment provider launchers — all in sandbox/test mode.
// No real charges. No real customer data captured.

// ---- Public test keys (safe to commit) ----
// Toss Payments official docs test client key.
// https://docs.tosspayments.com/reference/test-card
const TOSS_CLIENT_KEY = "test_ck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

// PortOne sample merchant code from their official docs.
// https://developers.portone.io/docs/ko/sdk/javascript-sdk-v1/payrequest
// For your own real test merchant, sign up free at https://admin.portone.io
// and replace this with the merchant code from 결제연동 → 식별코드.
const PORTONE_MERCHANT_CODE = "imp10391932";

// Stripe publishable test key (one of Stripe's public sample keys).
// For real demo, swap for your own pk_test_... at https://dashboard.stripe.com/test/apikeys
const STRIPE_PUBLISHABLE_KEY = "pk_test_TYooMQauvdEDq54NiTphI7jx";

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => any;
    IMP?: { init: (code: string) => void; request_pay: (params: any, cb: (rsp: any) => void) => void };
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
      case "stripe":  return payWithStripe(current);
      case "toss":    return payWithToss(current);
      case "portone": return payWithPortone(current);
      case "kakao":   return payWithKakaoMock(current);
      case "naver":   return payWithNaverMock(current);
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

// ---- PortOne ----
function payWithPortone(p: Product) {
  closeModal();
  const IMP = window.IMP;
  if (!IMP) return showToast("PortOne SDK 로드 실패", false);
  IMP.init(PORTONE_MERCHANT_CODE);
  IMP.request_pay(
    {
      pg: "html5_inicis.INIpayTest",
      pay_method: "card",
      merchant_uid: uniqueOrderId("portone"),
      name: p.name,
      amount: p.priceKrw,
      buyer_email: "test@example.com",
      buyer_name: "테스트 사용자",
    },
    (rsp: any) => {
      if (rsp.success) {
        window.location.href = `/success?provider=portone&id=${encodeURIComponent(rsp.imp_uid)}`;
      } else {
        showToast(`PortOne 결제 실패: ${rsp.error_msg ?? "취소"}`, false);
      }
    },
  );
}

// ---- KakaoPay mock ----
function payWithKakaoMock(p: Product) {
  closeModal();
  showToast(`[MOCK] KakaoPay — ₩${p.priceKrw.toLocaleString()} 결제 시뮬레이션 진행`);
  setTimeout(() => {
    window.location.href = `/success?provider=kakao&id=${uniqueOrderId("kakao-mock")}&mock=1`;
  }, 1200);
}

// ---- NaverPay mock ----
function payWithNaverMock(p: Product) {
  closeModal();
  showToast(`[MOCK] NaverPay — ₩${p.priceKrw.toLocaleString()} 결제 시뮬레이션 진행`);
  setTimeout(() => {
    window.location.href = `/success?provider=naver&id=${uniqueOrderId("naver-mock")}&mock=1`;
  }, 1200);
}
