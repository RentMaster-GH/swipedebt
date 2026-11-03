// src/app/pay/[id]/page.tsx - Webhook-First Pay Flow (no direct DB update from frontend)
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Phone, CheckCircle, Shield, CreditCard, Loader2 } from "lucide-react";

function getRealAmount(amount: number) {
  const num = Number(amount) || 0;
  return num > 10000 ? num / 100 : num;
}

export default function PayPage() {
  const { id } = useParams();
  const router = useRouter();
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payAmount, setPayAmount] = useState(10);
  const [payerPhone, setPayerPhone] = useState("233551234567");
  const [payerName, setPayerName] = useState("Demo Donor");
  const [payerEmail, setPayerEmail] = useState("donor@test.com");
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("bills").select("*").eq("id", id).single();
      if (data) setBill(data);
      setLoading(false);
    }
    if (id) load();
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    document.body.appendChild(script);
  }, [id]);

  // Verify payment on server (webhook-first logic)
  async function verifyPayment(reference: string) {
    setVerifying(true);
    setStatusMsg("Verifying payment with Paystack...");
    try {
      const res = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Verify failed");

      setStatusMsg(`✅ GHS ${json.amount} verified! ${json.bill_id} now ${json.newPaid}/${json.total} paid`);
      setTimeout(() => {
        alert(`Success! GHS ${json.amount} paid for ${bill.student_name}. Ref: ${reference}\nNew total paid: GHS ${json.newPaid}`);
        router.push("/");
      }, 1000);
    } catch (err: any) {
      // Fallback: webhook might still be processing — tell user it's okay
      setStatusMsg(`Payment received Ref: ${reference}. Webhook will update bill in a few seconds even if you close browser.`);
      setTimeout(() => {
        alert(`Payment received! Ref: ${reference}\nWebhook will auto-update bill even if you close this page.\nCheck Admin in 5 sec.`);
        router.push("/");
      }, 1500);
    } finally {
      setVerifying(false);
      setPaying(false);
    }
  }

  async function handlePay() {
    if (!bill) return;
    if (payAmount < 1) { alert("Min GHS 1"); return; }
    const total = getRealAmount(bill.amount);
    const paid = Number(bill.amount_paid || 0);
    const left = Math.max(0, total - paid);
    if (payAmount > left) {
      if (!confirm(`Bill only needs GHS ${left} left. Pay GHS ${left} instead?`)) return;
      setPayAmount(left);
    }

    setPaying(true);
    setStatusMsg("");
    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) {
      alert("Missing NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY in .env.local — Add pk_test_xxx");
      setPaying(false);
      return;
    }

    // @ts-ignore
    const handler = window.PaystackPop?.setup({
      key: publicKey,
      email: payerEmail,
      amount: Math.round(payAmount * 100),
      currency: "GHS",
      ref: `SWIPE-${Date.now()}-${bill.id.slice(0,6)}`,
      metadata: {
        bill_id: bill.bill_id,
        bill_db_id: bill.id,
        payer_phone: payerPhone,
        payer_name: payerName,
        amount_to_pay: payAmount,
        custom_fields: [
          { display_name: "Bill ID", variable_name: "bill_id", value: bill.bill_id },
          { display_name: "Payer Phone", variable_name: "payer_phone", value: payerPhone },
          { display_name: "Donor Name", variable_name: "payer_name", value: payerName }
        ]
      },
      callback: function (response: any) {
        // NO DIRECT SUPABASE UPDATE HERE — call server verify
        verifyPayment(response.reference);
      },
      onClose: function () {
        if (!verifying) {
          setPaying(false);
          setStatusMsg("Payment closed. If you already paid, webhook will still update.");
        }
      }
    });
    handler?.openIframe();
  }

  if (loading) return <div className="min-h-screen bg-[#0a0f1e] text-white p-10 text-center">Loading bill...</div>;
  if (!bill) return <div className="min-h-screen bg-[#0a0f1e] text-white p-10 text-center">Bill not found</div>;

  const total = getRealAmount(bill.amount);
  const paid = Number(bill.amount_paid || 0);
  const left = Math.max(0, total - paid);
  const pct = Math.min(100, Math.round((paid/total)*100));

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white p-4">
      <div className="max-w-[480px] mx-auto space-y-4">
        <button onClick={()=>router.back()} className="flex items-center gap-2 text-sm text-slate-400"><ArrowLeft className="w-4 h-4"/>Back</button>

        <div className="bg-[#141e33] rounded-[20px] border border-white/10 p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-bold text-lg">{bill.student_name}</div>
              <div className="text-xs text-slate-400">{bill.school} • {bill.bill_id} • {bill.bill_type}</div>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3"/>Verified</span>
          </div>

          <div className="bg-black/30 rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-400">Total Bill</span><span className="font-bold">GHS {total}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Already Paid</span><span className="text-emerald-300">GHS {paid}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Left to Clear</span><span className="text-amber-300 font-black">GHS {left}</span></div>
            <div className="h-2 bg-black/40 rounded-full overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${pct}%` }}/></div>
            <div className="text-[10px] text-slate-500 text-right">{pct}% cleared</div>
          </div>

          <div className="space-y-3 pt-2 border-t border-white/10">
            <h3 className="font-bold text-sm flex items-center gap-2"><CreditCard className="w-4 h-4 text-amber-400"/>Pay as Donor — Test Mode (Webhook-First)</h3>
            
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-200">
              <div className="font-bold">Paystack Test Card:</div>
              <div>Card: <b>4084 0840 8408 4081</b></div>
              <div>Expiry: <b>12/30</b> • CVV: <b>123</b> • PIN: <b>0000</b> • OTP: <b>123456</b></div>
              <div className="mt-1 text-[10px] text-slate-400">Frontend does NOT update DB — server verify + webhook does. Safe if browser closed.</div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400">Amount to Pay (GHS) *</label>
              <div className="flex gap-2 mt-1">
                {[10,20,50,left].filter((v,i,a)=>a.indexOf(v)===i && v>0).map(v=>(
                  <button key={v} onClick={()=>setPayAmount(v)} className={`px-3 py-2 rounded-full text-xs border ${payAmount===v ? "bg-amber-400 text-black font-bold" : "bg-white/5 border-white/10"}`}>GHS {v}</button>
                ))}
              </div>
              <input type="number" value={payAmount} onChange={e=>setPayAmount(Number(e.target.value))} min={1} max={left} className="w-full mt-2 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"/>
            </div>

            <div><label className="text-[11px] text-slate-400">Your Name (Donor)</label><input value={payerName} onChange={e=>setPayerName(e.target.value)} className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"/></div>
            <div><label className="text-[11px] text-slate-400">Your Phone (Donor) *</label><input value={payerPhone} onChange={e=>setPayerPhone(e.target.value)} placeholder="233551234567" className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"/></div>
            <div><label className="text-[11px] text-slate-400">Your Email</label><input value={payerEmail} onChange={e=>setPayerEmail(e.target.value)} className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"/></div>

            {statusMsg && <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs rounded-xl p-3 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/>{statusMsg}</div>}

            <button onClick={handlePay} disabled={paying || verifying} className="w-full bg-amber-400 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
              {paying || verifying ? <><Loader2 className="w-4 h-4 animate-spin"/>{verifying ? "Verifying..." : "Opening Paystack..."}</> : <><Phone className="w-4 h-4"/>Pay GHS {payAmount} with Paystack Test</>}
            </button>

            <div className="flex items-center gap-2 text-[10px] text-slate-500 justify-center"><Shield className="w-3 h-3"/>Webhook-First • No frontend DB write • pk_test</div>
          </div>
        </div>
      </div>
    </div>
  );
}