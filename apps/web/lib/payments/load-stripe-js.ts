const STRIPE_JS_SRC = "https://js.stripe.com/v3/";

function documentNonce() {
  if (typeof document === "undefined") return "";
  const tagged = document.querySelector("script[nonce]");
  return (tagged instanceof HTMLScriptElement ? tagged.nonce : "") || tagged?.getAttribute("nonce") || "";
}

export function loadStripeJs(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src='${STRIPE_JS_SRC}']`);
  if (existing) {
    if (typeof window !== "undefined" && "Stripe" in window && window.Stripe) return Promise.resolve();
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Stripe.js failed to load.")), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = STRIPE_JS_SRC;
    script.async = true;
    const nonce = documentNonce();
    if (nonce) {
      script.nonce = nonce;
      script.setAttribute("nonce", nonce);
    }
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Stripe.js failed to load."));
    document.head.appendChild(script);
  });
}
