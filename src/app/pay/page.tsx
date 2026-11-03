// src/app/pay/page.tsx - Pay with Phone for WhatsApp auto-receipt
"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, X, Wallet, ShieldCheck, Info, Heart, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase";

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(currency === "GHS" ? "en-GH" : "en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Number(amount).toLocaleString()}`;
  }
}

function normalizeGhanaPhone(input: string) {
  let p = input.trim().replace(/\s+/g, "").replace(/^\+/, "");
  // 0XXXXXXXXX -> 233XXXXXXXXX
  if (p.startsWith("0")) p = "233" + p.slice(1);
  // 233...
  if (!p.startsWith("233") && p.length === 9) p = "233" + p;
  return p;
}

export default function PayPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const billId = searchParams.get("billId") || "";
  const currency = searchParams.get("currency") || "GHS";
  const biller = searchParams.get("biller") || "Biller";
  const country = searchParams.get("country") || "GH";

  const [billData, setBillData] = useState<any>(null);
  const [email, setEmail] = useState("paparick64@yahoo.com");
  const [name, setName] = useState("Kay");
  const [phone, setPhone] = useState("");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    async function fetchBill() {
      if (!billId) { setFetching(false); return; }
      const { data } = await supabase.from("bills").select("*").eq("id", billId).single();
      if (data) {
        setBillData(data);
        const remaining = Math.max(0, Number(data.amount) - Number(data.amount_paid || 0));
        setCustomAmount(String(remaining));
      }
      setFetching(false);
    }
    fetchBill();
  }, [billId]);

  const totalAmount = billData ? Number(billData.amount) : 0;
  const alreadyPaid = billData ? Number(billData.amount_paid || 0) : 0;
  const remainingAmount = Math.max(0, totalAmount - alreadyPaid);
  const progress = totalAmount > 0 ? Math.round((alreadyPaid / totalAmount) * 100) : 0;

  const payAmount = useMemo(() => Number(customAmount) || 0, [customAmount]);
  const normalizedPhone = useMemo(() => normalizeGhanaPhone(phone), [phone]);

  const isValid = useMemo(() => {
    const phoneOk = normalizedPhone.length >= 12 && normalizedPhone.startsWith("233");
    return payAmount >= 1 && payAmount <= remainingAmount && email.includes("@") && name.trim().length > 1 && phoneOk;
  }, [payAmount, remainingAmount, email, name, normalizedPhone]);

  async function handlePay() {
    if (!isValid) {
      alert(`Check fields: Amount 1-${remainingAmount}, valid email, name, and Ghana phone (e.g. 0551234567 or 233551234567)`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amount: Math.round(payAmount * 100),
          currency,
          billId,
          metadata: {
            billId,
            bill_id: billId,
            payer_name: name,
            payer_phone: normalizedPhone,
            phone: normalizedPhone,
            country,
            biller,
            total_amount: totalAmount,
            remaining_before: remainingAmount,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.authorization_url) throw new Error(data.error || "Failed to initialize");
      window.location.href = data.authorization_url;
    } catch (e: any) {
      alert("Payment init failed: " + e.message);
      setLoading(false);
    }
  }

  if (fetching) return <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center text-slate-400">Loading bill...</div>;
  if (!billId || !billData) return <div className="min-h-screen bg-[#0a0f1e] text-white p-6 flex items-center justify-center"><button onClick={()=>router.push("/")} className="px-4 py-2 bg-white/10 rounded-full">Go Home</button></div>;

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <div className="max-w-[480px] mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={()=>router.back()} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4"/>Back</button>
          <h1 className="font-bold">Pay Bill</h1>
          <button onClick={()=>router.push("/")} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><X className="w-4 h-4"/></button>
        </div>

        <div className="bg-[#141e33] rounded-[20px] border border-white/10 p-5 space-y-5">
          {/* Summary */}
          <div className="bg-black/30 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{billData.student_name}'s {billData.bill_type}</span>
              <span>{billData.country_name || country} • {progress}% paid</span>
            </div>
            <div className="flex justify-between items-end">
              <div><div className="text-[11px] text-slate-400">Total</div><div className="font-bold text-lg">{formatMoney(totalAmount, currency)}</div></div>
              <div className="text-right"><div className="text-[11px] text-slate-400">Remaining</div><div className="font-black text-amber-400 text-lg">{formatMoney(remainingAmount, currency)}</div></div>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${progress}%` }}/></div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1"><Wallet className="w-3 h-3"/>Pays {biller} directly • Ref: {billData.bill_id}</div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-[11px] text-slate-400">How much do you want to pay? *</label>
            <div className="mt-2 relative">
              <span className="absolute left-3 top-3.5 text-sm text-slate-400">{currency}</span>
              <input type="number" value={customAmount} onChange={e=>setCustomAmount(e.target.value)} min={1} max={remainingAmount} className="w-full bg-black/30 border border-white/10 rounded-xl pl-14 pr-3 py-3 text-lg font-bold"/>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[25,50,75,100].map(p=>{
                const amt = Math.round((remainingAmount * p)/100);
                return <button key={p} onClick={()=>setCustomAmount(String(amt))} className={`py-2 rounded-full text-xs border ${payAmount===amt ? "bg-amber-400 text-black border-amber-400 font-bold" : "bg-white/5 border-white/10"}`}>{p}%</button>
              })}
            </div>
          </div>

          {/* Donor Info with Phone */}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-slate-400">Your Name *</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Kay" className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"/>
            </div>
            <div>
              <label className="text-[11px] text-slate-400">Your Email * (receipt)</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="paparick64@yahoo.com" className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"/>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3"/>Your WhatsApp Number * (for auto receipt)</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="0551234567 or 233551234567" className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"/>
              <p className="text-[10px] text-slate-500 mt-1">We auto-format to {normalizedPhone || "233..."} • Used only for receipt. {phone && normalizedPhone.length>=12 ? "✓ Valid" : "Enter Ghana number"}</p>
            </div>
          </div>

          <button onClick={handlePay} disabled={!isValid || loading} className="w-full bg-amber-400 text-black font-black py-4 rounded-xl text-[15px] flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-amber-300">
            {loading ? "Initializing..." : <><Heart className="w-5 h-5 fill-black"/> Pay {formatMoney(payAmount || 0, currency)}</>}
          </button>

          <div className="flex gap-2">
            <button onClick={()=>router.push("/")} className="flex-1 bg-white/10 py-3 rounded-xl text-sm">Cancel</button>
            <button onClick={()=>router.back()} className="flex-1 bg-white/5 py-3 rounded-xl text-sm text-slate-400">Go Back</button>
          </div>

          <div className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-400"/>Secured by Paystack • Email receipt + WhatsApp auto-receipt</div>
        </div>
      </div>
    </div>
  );
}