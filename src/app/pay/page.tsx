"use client";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

export const dynamic = 'force-dynamic';

function PayContent() {
  const params = useSearchParams();
  const billId = params.get("billId") || "unknown";
  const amount = params.get("amount") || "0";
  const currency = params.get("currency") || "GHS";
  const biller = params.get("biller") || "Biller";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const payWithPaystack = () => {
    if (!email) return alert("Enter email for receipt");
    
    // @ts-ignore - Paystack is loaded via script tag
    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email,
      amount: Number(amount),
      currency,
      ref: `SwipeDebt_${billId}_${Date.now()}`,
      metadata: { billId, biller },
      callback: function(response: any) {
        setLoading(true);
        // Secure server verification
        fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: response.reference,
            billId,
            biller
          })
        })
        .then(r => r.json())
        .then(data => {
          setLoading(false);
          if(data.status) {
            alert(`✅ Verified! ${currency} ${(data.data.amount/100).toLocaleString()} will be paid to ${biller}. Ref: ${data.data.reference}`);
            window.location.href = "/?paid=1";
          } else {
            alert("Payment received but verification failed. Save this ref: " + response.reference);
          }
        })
        .catch(() => {
          setLoading(false);
          alert("Network error. Payment may still be successful. Ref: " + response.reference);
        });
      },
      onClose: function() {
        console.log("Paystack closed");
      }
    });
    handler.openIframe();
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Clear this bill</h1>
      <p className="text-sm text-slate-400 mt-2">Paying <span className="text-amber-300">{biller}</span> directly. Amount: {currency} {(Number(amount)/100).toLocaleString()}</p>
      
      <input 
        type="email" 
        placeholder="Your email for receipt" 
        value={email} 
        onChange={e => setEmail(e.target.value)} 
        className="mt-6 w-full p-3 rounded-lg bg-white/10 border border-white/10 outline-none focus:border-amber-400/50" 
      />
      
      <button 
        onClick={payWithPaystack} 
        disabled={!email || loading} 
        className="mt-4 w-full py-3 bg-amber-400 text-black font-bold rounded-lg disabled:opacity-50 hover:bg-amber-300 transition"
      >
        {loading ? "Verifying..." : `Pay ${currency} ${(Number(amount)/100).toLocaleString()} via Paystack`}
      </button>

      <p className="mt-4 text-[10px] text-slate-500 text-center">Secured by Paystack · Pays biller directly, not user</p>
      
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="https://js.paystack.co/v1/inline.js"></script>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0f1e] text-white p-8">Loading payment...</div>}>
      <PayContent />
    </Suspense>
  );
}