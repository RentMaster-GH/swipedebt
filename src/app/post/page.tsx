// src/app/post/page.tsx - Post Bill with OWNER PHONE + Enforced Evidence + is_test flag
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Upload, X, AlertTriangle, CheckCircle, FileImage, Phone } from "lucide-react";

const BILL_TYPES = ["School fees", "Rent", "ECG / Electricity", "Water Bill", "Medical Bill", "General Bill", "Emergency", "Other"];

function normalizeGhanaPhone(input: string) {
  if (!input) return "";
  let p = input.trim().replace(/\s+/g, "").replace(/^\+/, "");
  if (p.startsWith("0")) p = "233" + p.slice(1);
  if (!p.startsWith("233") && p.length === 9) p = "233" + p;
  return p;
}

export default function PostBillPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState<string>("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    country: "Ghana - GHS (GH)",
    bill_type: "School fees",
    student_name: "",
    bill_id: "",
    amount: "",
    school: "",
    description: "",
    owner_phone: "",
  });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.size > 5 * 1024 * 1024) { setError("File too large — max 5MB"); return; }
    if (!["image/jpeg", "image/png", "image/jpg", "application/pdf"].includes(file.type)) { setError("Only JPG, PNG, PDF"); return; }

    setEvidenceFile(file);
    setPreview(file.type === "application/pdf" ? "pdf" : URL.createObjectURL(file));
    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("evidence").upload(fileName, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("evidence").getPublicUrl(fileName);
      setEvidenceUrl(urlData.publicUrl);
    } catch (err: any) {
      setError("Upload failed: " + err.message + " — Create 'evidence' bucket as public");
      setEvidenceFile(null); setPreview("");
    }
    setUploading(false);
  }

  function removeEvidence() { setEvidenceFile(null); setEvidenceUrl(""); setPreview(""); }

  async function handleSubmit() {
    setError("");
    const cleanOwnerPhone = normalizeGhanaPhone(form.owner_phone);

    if (!form.student_name.trim() || form.student_name.length < 2) { setError("Enter full name"); return; }
    if (!form.bill_id.trim()) { setError("Enter Bill ID / Reference"); return; }
    const amountNum = Number(form.amount);
    if (!amountNum || amountNum < 1) { setError("Enter valid GHS amount — e.g. 100 not 10000"); return; }
    if (amountNum > 100000) { setError("Amount too high — max GHS 100k. Enter 100 not 10000"); return; }
    if (!form.school.trim()) { setError("Enter Biller / Landlord / School"); return; }
    if (!form.description.trim() || form.description.length < 10) { setError("Explain story — min 10 chars"); return; }
    if (!cleanOwnerPhone) { setError("Enter your phone number so donors/admin can contact you"); return; }
    if (cleanOwnerPhone.length < 12 || !cleanOwnerPhone.startsWith("233")) { setError("Enter valid Ghana phone — e.g. 0551234567 or 233551234567"); return; }
    if (!evidenceUrl) { setError("⚠️ Evidence REQUIRED — Upload ECG bill, rent notice, or school slip"); return; }

    setLoading(true);
    try {
      const billRef = `GH-${Date.now().toString().slice(-6)}`;
      const { error: insertErr } = await supabase.from("bills").insert({
        bill_id: billRef,
        student_name: form.student_name.trim(),
        bill_type: form.bill_type,
        bill_ref: form.bill_id.trim(),
        amount: amountNum,
        amount_paid: 0,
        school: form.school.trim(),
        description: form.description.trim(),
        country: "GH",
        currency: "GHS",
        country_name: "Ghana",
        status: "pending",
        evidence_url: evidenceUrl,
        owner_phone: cleanOwnerPhone,
        is_test: false, // <-- ADDED - ensures real bill, visible on home after approval
      });
      if (insertErr) throw insertErr;
      alert(`Bill posted! Admin will verify. Owner phone ${cleanOwnerPhone} saved for contact.`);
      router.push("/");
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  const cleanPreviewPhone = normalizeGhanaPhone(form.owner_phone);
  const isFormValid = form.student_name && form.bill_id && Number(form.amount) >= 1 && form.school && form.description.length >= 10 && cleanPreviewPhone.length >= 12 && evidenceUrl && !uploading;

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white p-4">
      <div className="max-w-[520px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={()=>router.back()} className="flex items-center gap-2 text-sm text-slate-400"><ArrowLeft className="w-4 h-4"/>Back</button>
          <h1 className="font-bold">Post Your Bill</h1>
          <button onClick={()=>router.push("/")} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><X className="w-4 h-4"/></button>
        </div>

        <div className="bg-[#141e33] rounded-[20px] border border-white/10 p-5 space-y-4">
          <p className="text-[11px] text-slate-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">Evidence + phone required. Admin verifies before showing on home.</p>

          <div><label className="text-[11px] text-slate-400">Country / Currency</label><select value={form.country} onChange={e=>setForm({...form, country: e.target.value})} className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"><option>Ghana - GHS (GH)</option></select></div>
          <div><label className="text-[11px] text-slate-400">Bill Type</label><select value={form.bill_type} onChange={e=>setForm({...form, bill_type: e.target.value})} className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm">{BILL_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
          <div><label className="text-[11px] text-slate-400">Your Name *</label><input value={form.student_name} onChange={e=>setForm({...form, student_name: e.target.value})} placeholder="Full name" className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"/></div>
          <div><label className="text-[11px] text-slate-400">Bill / Reference ID *</label><input value={form.bill_id} onChange={e=>setForm({...form, bill_id: e.target.value})} placeholder="ECG meter no, rent ID, student ID" className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"/></div>
          <div><label className="text-[11px] text-slate-400">Amount in GHS *</label><input type="number" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} placeholder="GH₵ e.g. 100" min={1} className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"/></div>
          <div><label className="text-[11px] text-slate-400">Biller / Landlord / School *</label><input value={form.school} onChange={e=>setForm({...form, school: e.target.value})} placeholder="ECG, Landlord, KNUST..." className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"/></div>

          <div>
            <label className="text-[11px] text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3"/>Your Phone (Owner) * — donors/admin can contact you</label>
            <input value={form.owner_phone} onChange={e=>setForm({...form, owner_phone: e.target.value})} placeholder="0551234567 or 233551234567" className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"/>
            <p className="text-[10px] text-slate-500 mt-1">{cleanPreviewPhone ? `Saved as ${cleanPreviewPhone} ✓ ${cleanPreviewPhone.length>=12 ? "Valid" : "Invalid"}` : "Enter Ghana number — will be verified by admin, hidden from public until approved"}</p>
          </div>

          <div><label className="text-[11px] text-slate-400">Your Story *</label><textarea value={form.description} onChange={e=>setForm({...form, description: e.target.value})} placeholder="Explain situation..." rows={3} className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"/><div className="text-[10px] text-slate-500 mt-1">{form.description.length}/10 min</div></div>

          <div className="space-y-2">
            <label className="text-[11px] text-slate-400">Evidence * <span className="text-rose-400">REQUIRED</span></label>
            {!evidenceUrl ? (
              <label className="w-full bg-black/30 border border-dashed border-amber-400/50 rounded-xl px-3 py-6 flex flex-col items-center gap-2 cursor-pointer hover:bg-amber-400/5">
                <Upload className="w-6 h-6 text-amber-400"/><span className="text-sm font-bold">{uploading ? "Uploading..." : "Upload evidence"}</span><span className="text-[10px] text-slate-500">JPG, PNG, PDF — max 5MB</span>
                <input type="file" accept="image/*,.pdf" onChange={handleFile} className="hidden" disabled={uploading}/>
              </label>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
                <div className="w-12 h-12 bg-black/30 rounded-lg flex items-center justify-center overflow-hidden">{preview === "pdf" ? <FileImage className="w-6 h-6"/> : <img src={preview} alt="evidence" className="w-full h-full object-cover"/>}</div>
                <div className="flex-1"><div className="text-xs font-bold flex items-center gap-1 text-emerald-300"><CheckCircle className="w-4 h-4"/>Evidence uploaded</div><div className="text-[10px] text-slate-400 truncate">{evidenceFile?.name}</div><a href={evidenceUrl} target="_blank" className="text-[10px] text-amber-300 underline">View</a></div>
                <button onClick={removeEvidence} className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center"><X className="w-4 h-4"/></button>
              </div>
            )}
          </div>

          {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl p-3">{error}</div>}

          <button onClick={handleSubmit} disabled={!isFormValid || loading} className="w-full bg-amber-400 text-black font-black py-4 rounded-xl disabled:opacity-30">
            {loading ? "Posting..." : uploading ? "Uploading..." : `Post Bill ${cleanPreviewPhone ? `• ${cleanPreviewPhone}` : ""} ${evidenceUrl ? "✓" : "(Need Evidence)"}`}
          </button>

          <div className="flex gap-2"><button onClick={()=>router.push("/")} className="flex-1 bg-white/10 py-3 rounded-xl text-sm">Cancel</button><button onClick={()=>router.back()} className="flex-1 bg-white/5 py-3 rounded-xl text-sm text-slate-400">Go Back</button></div>
        </div>
      </div>
    </div>
  );
}