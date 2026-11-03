// src/app/admin/page.tsx - Admin v5.2 with Back button + Password Gate soulreal200682
"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Check, X, Eye, Trash2, Search, ExternalLink, DollarSign, Clock, AlertTriangle, Phone, Mail, MessageCircle, User, FlaskConical, Lock, ArrowLeft } from "lucide-react";

type Bill = {
  id: string;
  bill_id: string;
  student_name: string;
  amount: number;
  amount_paid: number | null;
  school: string | null;
  description: string | null;
  bill_type: string | null;
  bill_ref?: string | null;
  country: string;
  currency: string;
  status: string;
  created_at: string;
  evidence_url: string | null;
  payer_email: string | null;
  payer_name: string | null;
  payer_phone: string | null;
  owner_phone: string | null;
  paystack_reference: string | null;
  last_payment_amount: number | null;
  last_payment_phone: string | null;
  last_payment_at: string | null;
  is_test: boolean | null;
};

function formatMoney(amount: number, currency: string) {
  const num = Number(amount) || 0;
  const fixed = num > 10000 ? num / 100 : num;
  return `${currency} ${fixed.toLocaleString()}`;
}
function getRealAmount(amount: number) {
  const num = Number(amount) || 0;
  return num > 10000 ? num / 100 : num;
}

export default function AdminPage() {
  // ===== PASSWORD GATE =====
  const [isAuthed, setIsAuthed] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("admin_authed") === "soulreal200682") {
      setIsAuthed(true);
    }
  }, []);

    function handleLogin(e?: any) {
    if (e) e.preventDefault();
    if (passInput === "soulreal200682") {
      sessionStorage.setItem("admin_authed", "soulreal200682");
      setPassInput(""); // <-- CLEAR TEXTBOX IMMEDIATELY
      setPassError("");
      setIsAuthed(true);
    } else {
      setPassError("Wrong password");
      setPassInput(""); // clear on wrong too
    }
  }

  function handleLogout() {
    sessionStorage.removeItem("admin_authed");
    setPassInput(""); // <-- ENSURE BLANK ON LOGOUT
    setIsAuthed(false);
  }

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all"|"pending"|"approved"|"paid"|"rejected">("all");
  const [search, setSearch] = useState("");
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showTest, setShowTest] = useState(false);

  async function fetchBills() {
    setLoading(true);
    const { data } = await supabase.from("bills").select("*").order("created_at", { ascending: false }).limit(200);
    if (data) setBills(data as Bill[]);
    setLoading(false);
  }
  useEffect(() => { if(isAuthed) fetchBills(); }, [isAuthed]);

  const stats = useMemo(() => {
    const realBills = bills.filter(b=>!b.is_test);
    const testBills = bills.filter(b=>b.is_test);
    const total = realBills.length;
    const pending = realBills.filter(b=>b.status==="pending").length;
    const approved = realBills.filter(b=>b.status==="approved").length;
    const paid = realBills.filter(b=>b.status==="paid").length;
    const totalAmount = realBills.reduce((s,b)=>s+getRealAmount(b.amount),0);
    const totalPaid = realBills.reduce((s,b)=>s+Number(b.amount_paid||0),0);
    return { total, pending, approved, paid, totalAmount, totalPaid, testCount: testBills.length, allCount: bills.length };
  }, [bills]);

  const filtered = useMemo(() => {
    return bills.filter(b=>{
      if (!showTest && b.is_test) return false;
      if (filter!=="all" && b.status!==filter) return false;
      if (search && !`${b.student_name} ${b.bill_id} ${b.bill_ref} ${b.school} ${b.description} ${b.payer_phone} ${b.owner_phone} ${b.payer_name} ${b.payer_email}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [bills, filter, search, showTest]);

  async function updateStatus(id: string, status: string) {
    if (!confirm(`Mark as ${status}?`)) return;
    const { error } = await supabase.from("bills").update({ status }).eq("id", id);
    if (!error) fetchBills();
  }
  async function toggleTest(id: string, is_test: boolean) {
    await supabase.from("bills").update({ is_test: !is_test }).eq("id", id);
    fetchBills();
  }
  async function deleteBill(id: string) {
    if (!confirm("Delete permanently?")) return;
    await supabase.from("bills").delete().eq("id", id);
    setBills(b=>b.filter(x=>x.id!==id));
  }
  async function deleteAllTest() {
    if (!confirm(`Delete ALL ${stats.testCount} test bills permanently?`)) return;
    await supabase.from("bills").delete().eq("is_test", true);
    fetchBills();
  }
  const progress = (b: Bill) => {
    const total = getRealAmount(b.amount);
    if (total===0) return 0;
    return Math.min(100, Math.round((Number(b.amount_paid||0)/total)*100));
  };

  // ===== LOGIN SCREEN WITH BACK BUTTON =====
  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">
        <div className="w-full max-w-[360px] space-y-4">
          <a href="/" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4"/> Back to Homepage
          </a>
          <form onSubmit={handleLogin} className="bg-[#141e33] border border-white/10 rounded-[20px] p-8 w-full space-y-4">
            <div className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center mx-auto"><Lock className="w-6 h-6 text-black"/></div>
            <h1 className="text-center font-black text-xl text-white">Admin Login</h1>
            <p className="text-center text-xs text-slate-400">Enter password to access SwipeDebt Admin</p>
            <input type="password" value={passInput} onChange={e=>setPassInput(e.target.value)} placeholder="Password" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"/>
            {passError && <div className="text-xs text-rose-400 text-center">{passError}</div>}
            <button type="submit" className="w-full bg-amber-400 text-black font-black py-3 rounded-xl">Unlock Admin</button>
            <a href="/" className="block text-center text-[11px] text-slate-500 hover:text-slate-300 underline mt-2">Cancel and return to homepage</a>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h1 className="text-2xl font-black flex items-center gap-2">Admin — SwipeDebt <span className="text-[11px] font-normal text-slate-400">({stats.allCount} total • {stats.testCount} test hidden)</span></h1>
          <div className="flex gap-2 items-center flex-wrap">
            <a href="/" className="px-3 py-1.5 bg-white/10 rounded-full text-sm flex items-center gap-1 hover:bg-white/20"><ArrowLeft className="w-3 h-3"/>Home</a>
            <button onClick={handleLogout} className="px-3 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full text-xs">Logout</button>
            <button onClick={()=>setShowTest(!showTest)} className={`px-3 py-1.5 rounded-full text-xs border flex items-center gap-1 ${showTest ? "bg-amber-400 text-black font-bold border-amber-400" : "bg-white/10 border-white/10"}`}>
              <FlaskConical className="w-3 h-3"/>{showTest ? `Hide Test (${stats.testCount})` : `Show Test (${stats.testCount})`}
            </button>
            {stats.testCount > 0 && (
              <button onClick={deleteAllTest} className="px-3 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full text-xs">Delete Test Data</button>
            )}
            <button onClick={fetchBills} className="px-3 py-1.5 bg-amber-400 text-black rounded-full text-sm font-bold">Refresh</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-[#141e33] rounded-xl p-3 border border-white/10"><div className="text-[11px] text-slate-400">Real Bills</div><div className="text-xl font-bold">{stats.total}</div><div className="text-[10px] text-slate-500">{formatMoney(stats.totalAmount, "GHS")} total</div></div>
          <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20"><div className="text-[11px] text-amber-300 flex items-center gap-1"><Clock className="w-3 h-3"/>Pending</div><div className="text-xl font-bold">{stats.pending}</div></div>
          <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20"><div className="text-[11px] text-emerald-300">Approved</div><div className="text-xl font-bold">{stats.approved}</div></div>
          <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20"><div className="text-[11px] text-blue-300 flex items-center gap-1"><DollarSign className="w-3 h-3"/>Cleared</div><div className="text-xl font-bold">{stats.paid}</div><div className="text-[10px] text-slate-500">{formatMoney(stats.totalPaid, "GHS")} paid</div></div>
          <div className="bg-[#141e33] rounded-xl p-3 border border-white/10"><div className="text-[11px] text-slate-400">Remaining</div><div className="text-xl font-bold">{formatMoney(stats.totalAmount-stats.totalPaid, "GHS")}</div></div>
          <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/20"><div className="text-[11px] text-amber-300 flex items-center gap-1"><FlaskConical className="w-3 h-3"/>Test Bills</div><div className="text-xl font-bold">{stats.testCount}</div><div className="text-[10px] text-slate-500">hidden from home</div></div>
        </div>

        <div className="flex gap-2 bg-[#141e33] p-3 rounded-xl border border-white/10">
          <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-3 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, owner phone, payer phone, bill ID..." className="w-full bg-black/30 border border-white/10 rounded-full pl-9 pr-3 py-2 text-sm"/></div>
          <div className="flex gap-1.5 overflow-x-auto">{(["all","pending","approved","paid","rejected"] as const).map(s=>(<button key={s} onClick={()=>setFilter(s)} className={`px-3 py-1.5 rounded-full text-xs border capitalize shrink-0 ${filter===s ? "bg-amber-400 text-black font-bold" : "bg-white/5 border-white/10"}`}>{s}</button>))}</div>
        </div>

        <div className="bg-[#141e33] rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/30 text-[11px] text-slate-400"><tr><th className="text-left p-3">Bill + Owner + Payer</th><th className="text-left p-3">Progress</th><th className="text-left p-3">Evidence</th><th className="text-left p-3">Status</th><th className="text-right p-3">Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className="p-6 text-center">Loading...</td></tr> :
                filtered.length===0 ? <tr><td colSpan={5} className="p-6 text-center text-slate-500">{showTest ? "No bills match filter" : `No real bills — ${stats.testCount} test bills hidden. Click Show Test`}</td></tr> :
                filtered.map(b=>{
                  const total = getRealAmount(b.amount);
                  const paid = Number(b.amount_paid||0);
                  const remaining = Math.max(0, total-paid);
                  return (
                    <tr key={b.id} className={`border-t border-white/5 hover:bg-white/[0.03] ${b.is_test ? "bg-amber-500/5" : ""}`}>
                      <td className="p-3 min-w-[340px]">
                        <div className="font-bold flex items-center gap-1 flex-wrap"><User className="w-4 h-4 text-slate-500"/>{b.student_name} {b.is_test && <span className="text-[9px] bg-amber-400 text-black px-1.5 py-0.5 rounded-full font-black">TEST</span>} <span className="text-slate-500 text-xs font-normal">({b.bill_id})</span></div>
                        <div className="text-[11px] text-slate-400">{b.bill_type} • {b.country} • {b.school} • Ref: {b.bill_ref || "-"}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[320px]">{b.description}</div>
                        <div className="mt-2 bg-black/40 rounded-lg p-2 border border-white/5 space-y-2">
                          <div className="pb-2 border-b border-white/10">
                            <div className="text-[10px] text-amber-300 font-bold uppercase flex items-center gap-1"><Phone className="w-3 h-3"/> OWNER (Bill Creator)</div>
                            {b.owner_phone ? (
                              <div className="mt-1"><div className="flex flex-wrap gap-2 mt-1">
                                <a href={`tel:${b.owner_phone}`} className="text-[11px] flex items-center gap-1 text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full hover:bg-amber-500/20"><Phone className="w-3 h-3"/>{b.owner_phone}</a>
                                <a href={`https://wa.me/${b.owner_phone}`} target="_blank" className="text-[11px] flex items-center gap-1 text-[#25D366] bg-[#25D366]/10 border border-[#25D366]/20 px-2 py-1 rounded-full hover:bg-[#25D366]/20"><MessageCircle className="w-3 h-3"/>WhatsApp Owner</a>
                              </div></div>
                            ) : <div className="text-[11px] text-slate-500 mt-1">No owner phone — old bill</div>}
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">LAST PAYER (Donor)</div>
                            {b.payer_phone || b.payer_email ? (
                              <div className="mt-1 space-y-1">
                                {b.payer_name && <div className="text-xs font-bold text-white">{b.payer_name}</div>}
                                {b.payer_phone && (
                                  <div className="flex flex-wrap gap-2">
                                    <a href={`tel:${b.payer_phone}`} className="text-[11px] flex items-center gap-1 text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full"><Phone className="w-3 h-3"/>{b.payer_phone}</a>
                                    <a href={`https://wa.me/${b.payer_phone}`} target="_blank" className="text-[11px] flex items-center gap-1 text-[#25D366] bg-[#25D366]/10 border border-[#25D366]/20 px-2 py-1 rounded-full"><MessageCircle className="w-3 h-3"/>WhatsApp Donor</a>
                                  </div>
                                )}
                                {b.payer_email && <div className="text-[11px] flex items-center gap-1 text-slate-400"><Mail className="w-3 h-3"/>{b.payer_email}</div>}
                                <div className="text-[10px] text-slate-500">{b.last_payment_at ? new Date(b.last_payment_at).toLocaleString() : ""} {b.last_payment_amount ? `• ${formatMoney(Number(b.last_payment_amount), b.currency)}` : ""}</div>
                              </div>
                            ) : <div className="text-[11px] text-slate-500">No payer yet</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 min-w-[160px]">
                        <div className="flex justify-between text-[11px] mb-1"><span>{formatMoney(total, b.currency)}</span><span className="text-amber-300">{remaining===0 ? "Cleared" : `${formatMoney(remaining, b.currency)} left`}</span></div>
                        <div className="h-2 bg-black/40 rounded-full overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${progress(b)}%` }}/></div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>{formatMoney(paid, b.currency)} paid</span><span>{progress(b)}%</span></div>
                      </td>
                      <td className="p-3">{b.evidence_url ? <button onClick={()=>{setSelectedEvidence(b.evidence_url); setSelectedBill(b);}} className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs border border-emerald-500/30 flex items-center gap-1"><Eye className="w-3 h-3"/>View</button> : <span className="flex items-center gap-1 text-[11px] text-amber-300"><AlertTriangle className="w-3 h-3"/>No evidence</span>}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] border capitalize ${b.status==="paid" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : b.status==="approved" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : b.status==="pending" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-rose-500/20 text-rose-300 border-rose-500/30"}`}>{b.status}</span>
                        <div className="mt-1"><button onClick={()=>toggleTest(b.id, !!b.is_test)} className="text-[10px] text-slate-500 underline">{b.is_test ? "Mark as Real" : "Mark as Test"}</button></div>
                      </td>
                      <td className="p-3"><div className="flex gap-1 justify-end"><button onClick={()=>updateStatus(b.id, "approved")} className="w-7 h-7 bg-emerald-500 text-black rounded-full flex items-center justify-center"><Check className="w-4 h-4"/></button><button onClick={()=>deleteBill(b.id)} className="w-7 h-7 bg-white/5 rounded-full flex items-center justify-center"><Trash2 className="w-4 h-4"/></button></div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedEvidence && selectedBill && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur flex items-center justify-center p-4 z-50" onClick={()=>setSelectedEvidence(null)}>
          <div className="bg-[#141e33] rounded-xl max-w-2xl w-full p-4 border border-white/10" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-start mb-3 gap-2">
              <div>
                <div className="font-bold flex gap-2">{selectedBill.student_name} {selectedBill.is_test && <span className="text-[10px] bg-amber-400 text-black px-1.5 rounded-full">TEST</span>}</div>
                <div className="text-xs text-slate-400">Owner: {selectedBill.owner_phone || "-"} • Donor: {selectedBill.payer_phone || "No payer"}</div>
              </div>
              <div className="flex gap-2 shrink-0"><a href={selectedEvidence} target="_blank" className="px-3 py-1 bg-white/10 rounded-full text-xs flex items-center gap-1"><ExternalLink className="w-3 h-3"/>Open</a><button onClick={()=>setSelectedEvidence(null)} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center"><X className="w-4 h-4"/></button></div>
            </div>
            <div className="bg-black/50 rounded-xl overflow-hidden max-h-[70vh] flex items-center justify-center">{selectedEvidence.endsWith(".pdf") ? <iframe src={selectedEvidence} className="w-full h-[60vh]" /> : <img src={selectedEvidence} alt="Evidence" className="max-w-full max-h-[70vh] object-contain" />}</div>
            <div className="flex gap-2 mt-3">
              <a href={`tel:${selectedBill.owner_phone}`} className="flex-1 py-2 bg-amber-400 text-black rounded-full font-bold text-sm text-center flex items-center justify-center gap-1"><Phone className="w-4 h-4"/>Call Owner</a>
              <button onClick={()=>{ updateStatus(selectedBill.id,"approved"); setSelectedEvidence(null); }} className="flex-1 py-2 bg-emerald-500 text-black rounded-full font-bold text-sm">Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}