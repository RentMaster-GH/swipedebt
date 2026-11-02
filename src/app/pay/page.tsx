"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function PayPage() {
  const params = useSearchParams();
  const billId = params.get("billId");
  const amount = params.get("amount");
  const currency = params.get("currency") || "GHS";
  const biller = params.get("biller");

  const [email, setEmail] = useState("");

  const payWithPaystack = () => {
    // @ts-ignore - Paystack inline
    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY, // pk_live_... or pk_test_...
      email,
      amount,
      currency,
      ref: `SwipeDebt_${billId}_${Date.now()}`,
      metadata: { billId, biller, custom_fields: [{ display_name: "Biller", variable_name: "biller", value: biller }] },
      callback: function(response: any) {
        // verify on backend /api/verify?reference=response.reference
        alert(`Paid! Ref: ${response.reference}. We will pay ${biller} directly within 24h.`);
        window.location.href = "/";
      },
      onClose: function() { alert("Payment window closed"); }
    });
    handler.openIframe();
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Clear this bill</h1>
      <p className="text-sm text-slate-400 mt-2">You are paying {biller} directly. Amount: {currency} {(Number(amount)/100).toLocaleString()}</p>
      <input type="email" placeholder="Your email for receipt" value={email} onChange={e => setEmail(e.target.value)} className="mt-6 w-full p-3 rounded-lg bg-white/10 border border-white/10" />
      <button onClick={payWithPaystack} disabled={!email} className="mt-4 w-full py-3 bg-amber-400 text-black font-bold rounded-lg disabled:opacity-50">Pay {currency} {(Number(amount)/100).toLocaleString()} via Paystack</button>
      <script src="https://js.paystack.co/v1/inline.js"></script>
    </div>
  );
}