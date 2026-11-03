// src/app/page.tsx - Home v5 - Hide Test Bills + Masked Phone + Correct Amounts
"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Heart, Share2, Eye, Phone, CheckCircle, Search, MapPin, Clock, DollarSign, Filter } from "lucide-react";

type Bill = {
  id: string;
  bill_id: string;
  student_name: string;
  amount: number;
  amount_paid: number | null;
  school: string | null;
  description: string | null;
  bill_type: string | null;
  country: string;
  currency: string;
  country_name: string | null;
  status: string;
  created_at: string;
  evidence_url: string | null;
  owner_phone: string | null;
  is_test: boolean | null;
};

function getRealAmount(amount: number) {
  const num = Number(amount) || 0;
  return num > 10000 ? num / 100 : num; // fixes 10000 => 100
}
function formatMoney(amount: number, currency: string = "GHS") {
  return `${currency} ${getRealAmount(amount).toLocaleString()}`;
}
function maskPhone(phone: string | null) {
  if (!phone) return "No phone";
  const p = phone.toString();
  if (p.length < 7) return p;
  return `${p.slice(0, 6)}****`;
}
function progressPercent(bill: Bill) {
  const total = getRealAmount(bill.amount);
  if (total === 0) return 0;
  const paid = Number(bill.amount_paid || 0);
  return Math.min(100, Math.round((paid / total) * 100));
}

export default function HomePage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  async function fetchBills() {
    setLoading(true);
    const { data, error } = await supabase
      .from("bills")
      .select("id,bill_id,student_name,amount,amount_paid,school,description,bill_type,country,currency,country_name,status,created_at,evidence_url,owner_phone,is_test")
      .eq("status", "approved")
      .eq("is_test", false) // <-- PATCHED - HIDE TEST FROM PUBLIC
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) console.error(error);
    if (data) setBills(data as Bill[]);
    setLoading(false);
  }

  useEffect(() => { fetchBills(); }, []);

  const filtered = useMemo(() => {
    return bills.filter(b => {
      if (typeFilter !== "All" && b.bill_type !== typeFilter) return false;
      if (search && !`${b.student_name} ${b.bill_id} ${b.school} ${b.description} ${b.bill_type}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [bills, search, typeFilter]);

  const types = ["All", "School fees", "Rent", "ECG / Electricity", "Water Bill", "Medical Bill", "General Bill", "Emergency"];

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0f1e]/90 backdrop-blur border-b border-white/10 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black">SwipeDebt — <span className="text-amber-400">Clear Bills Together</span></h1>
            <p className="text-[11px] text-slate-400">Only verified approved bills • Evidence checked • Ghana GHS</p>
          </div>
          <div className="flex gap-2">
            <Link href="/post" className="px-4 py-2 bg-amber-400 text-black rounded-full text-sm font-black">Post Bill</Link>
            <Link href="/admin" className="px-4 py-2 bg-white/10 rounded-full text-sm">Admin</Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-4 flex gap-2">
          <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-3 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search bills, name, school, ECG..." className="w-full bg-[#141e33] border border-white/10 rounded-full pl-9 pr-3 py-2.5 text-sm"/></div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {types.map(t=>(
              <button key={t} onClick={()=>setTypeFilter(t)} className={`px-3 py-2 rounded-full text-xs border whitespace-nowrap ${typeFilter===t ? "bg-amber-400 text-black font-bold border-amber-400" : "bg-[#141e33] border-white/10"}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Bills Grid */}
      <div className="max-w-6xl mx-auto p-4">
        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading verified bills...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-2xl font-bold">No more bills</div>
            <div className="text-sm text-slate-500 mt-2">{bills.length===0 ? "No approved bills yet. Post your bill and get verified." : "No bills match your filter. Clear filters."}</div>
            <div className="mt-4 flex gap-2 justify-center">
              <button onClick={()=>{setSearch(""); setTypeFilter("All");}} className="px-4 py-2 bg-white/10 rounded-full text-sm">Clear Filters</button>
              <Link href="/post" className="px-4 py-2 bg-amber-400 text-black rounded-full text-sm font-bold">Post Your Bill</Link>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(bill => {
              const total = getRealAmount(bill.amount);
              const paid = Number(bill.amount_paid || 0);
              const left = Math.max(0, total - paid);
              const pct = progressPercent(bill);
              return (
                <div key={bill.id} className="bg-[#141e33] rounded-[20px] border border-white/10 overflow-hidden flex flex-col">
                  <div className="p-4 flex-1 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-amber-400/10 text-amber-300 border border-amber-400/20 px-2 py-1 rounded-full">{bill.bill_type || "General Bill"}</span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3"/>{bill.country_name || bill.country}</span>
                    </div>

                    <div>
                      <div className="font-bold text-[15px]">{bill.student_name}</div>
                      <div className="text-[11px] text-slate-400">{bill.school} • {bill.bill_id}</div>
                    </div>

                    <div className="text-[13px] text-slate-300 line-clamp-3">{bill.description}</div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs"><span className="text-slate-400">Total: {formatMoney(bill.amount, bill.currency)}</span><span className="text-amber-300 font-bold">{left===0 ? "Cleared!" : `${bill.currency} ${left.toLocaleString()} left`}</span></div>
                      <div className="h-2 bg-black/40 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} /></div>
                      <div className="flex justify-between text-[10px] text-slate-500"><span>{bill.currency} {paid.toLocaleString()} paid</span><span>{pct}%</span></div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] bg-black/30 rounded-full px-3 py-2 border border-white/5">
                      <Phone className="w-3 h-3 text-slate-500"/>
                      <span className="text-slate-300">Owner: {maskPhone(bill.owner_phone)}</span>
                      <span className="ml-auto text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3"/>Verified</span>
                    </div>

                    {bill.evidence_url && (
                      <a href={bill.evidence_url} target="_blank" className="flex items-center gap-1 text-[11px] text-amber-300 underline"><Eye className="w-3 h-3"/>View Evidence</a>
                    )}
                  </div>

                  <div className="p-3 bg-black/20 border-t border-white/5 flex gap-2">
                    <Link href={`/pay/${bill.id}`} className="flex-1 bg-amber-400 text-black font-black py-3 rounded-full text-center text-sm flex items-center justify-center gap-1">
                      <DollarSign className="w-4 h-4"/>Swipe to Help
                    </Link>
                    <button onClick={()=>navigator.share ? navigator.share({title: bill.student_name, text: bill.description || "", url: window.location.href}) : navigator.clipboard.writeText(window.location.href)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"><Share2 className="w-4 h-4"/></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-slate-600 py-10">
        SwipeDebt • Evidence verified • Test bills hidden • {filtered.length} approved bills
      </div>
    </div>
  );
}