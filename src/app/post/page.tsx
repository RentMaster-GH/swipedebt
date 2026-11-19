"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const COUNTRIES = [
  { label: "Ghana - GHS", code: "GH", currency: "GHS" },
  { label: "Nigeria - NGN", code: "NG", currency: "NGN" },
  { label: "Kenya - KES", code: "KE", currency: "KES" },
  { label: "South Africa - ZAR", code: "ZA", currency: "ZAR" },
  { label: "United States - USD", code: "US", currency: "USD" },
  { label: "United Kingdom - GBP", code: "GB", currency: "GBP" },
  { label: "Canada - CAD", code: "CA", currency: "CAD" },
  { label: "European Union - EUR", code: "EU", currency: "EUR" },
  { label: "India - INR", code: "IN", currency: "INR" },
  { label: "United Arab Emirates - AED", code: "AE", currency: "AED" },
  { label: "Uganda - UGX", code: "UG", currency: "UGX" },
  { label: "Tanzania - TZS", code: "TZ", currency: "TZS" },
  { label: "Rwanda - RWF", code: "RW", currency: "RWF" },
  { label: "Cameroon - XAF", code: "CM", currency: "XAF" },
  { label: "Senegal - XOF", code: "SN", currency: "XOF" },
  { label: "Cote d'Ivoire - XOF", code: "CI", currency: "XOF" },
  { label: "Ethiopia - ETB", code: "ET", currency: "ETB" },
  { label: "Egypt - EGP", code: "EG", currency: "EGP" },
  { label: "Morocco - MAD", code: "MA", currency: "MAD" },
  { label: "Zambia - ZMW", code: "ZM", currency: "ZMW" },
  { label: "Zimbabwe - ZWG", code: "ZW", currency: "ZWG" },
  { label: "Botswana - BWP", code: "BW", currency: "BWP" },
  { label: "Namibia - NAD", code: "NA", currency: "NA" },
  { label: "Gambia - GMD", code: "GM", currency: "GMD" },
  { label: "Sierra Leone - SLE", code: "SL", currency: "SLE" },
  { label: "Liberia - LRD", code: "LR", currency: "LRD" },
  { label: "Australia - AUD", code: "AU", currency: "AUD" },
  { label: "Brazil - BRL", code: "BR", currency: "BRL" },
  { label: "China - CNY", code: "CN", currency: "CNY" },
  { label: "Japan - JPY", code: "JP", currency: "JPY" },
  { label: "Other Country - USD", code: "INTL", currency: "USD" },
];

const BILL_TYPES = ["School fees", "Rent", "ECG / Electricity", "Water Bill", "Medical Bill", "General Bill", "Emergency", "Other"];

export default function PostBill() {
  const router = useRouter();
  const [countryLabel, setCountryLabel] = useState("Ghana - GHS");
  const [studentName, setStudentName] = useState("");
  const [billRefInput, setBillRefInput] = useState("");
  const [amount, setAmount] = useState("");
  const [school, setSchool] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [billType, setBillType] = useState("School fees");
  const [description, setDescription] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const selectedCountry = COUNTRIES.find((c) => c.label === countryLabel) || COUNTRIES.at(0)!;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const numAmount = Number(amount);
    if (!studentName.trim()) return setErrorMsg("Please enter your name.");
    if (!numAmount || numAmount < 1) return setErrorMsg("Please enter a valid amount.");
    if (!school.trim()) return setErrorMsg("Please enter Biller / Landlord / School.");
    if (!ownerPhone.trim()) return setErrorMsg("Please enter your phone or payout account number.");
    if (!description.trim()) return setErrorMsg("Please enter your story.");
    if (!evidenceFile) return setErrorMsg("Please attach an evidence image or PDF.");

    setSubmitting(true);
    try {
      const safeName = Date.now() + "-" + evidenceFile.name.replace(/\s+/g, "_");
      const { error: upErr } = await supabase.storage.from("evidence").upload(safeName, evidenceFile);
      if (upErr) throw new Error(upErr.message || "Evidence upload failed");
      const { data: urlData } = supabase.storage.from("evidence").getPublicUrl(safeName);

      const generatedBillId = selectedCountry.code + "-" + Date.now().toString().slice(-6);
      const { error: insertErr } = await supabase.from("bills").insert({
        bill_id: generatedBillId,
        student_name: studentName.trim(),
        bill_type: billType,
        bill_ref: billRefInput.trim() || generatedBillId,
        amount: numAmount,
        amount_paid: 0,
        school: school.trim(),
        description: description.trim(),
        country: selectedCountry.code,
        currency: selectedCountry.currency,
        country_name: selectedCountry.label.split(" - ").at(0) || "Ghana",
        status: "pending",
        evidence_url: urlData.publicUrl,
        owner_phone: ownerPhone.trim(),
        is_test: false,
      });

      if (insertErr) throw new Error(insertErr.message || "Failed to save bill");

      alert("Bill posted successfully! Admin will verify it shortly.");
      router.push("/");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to submit bill");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-black">Post your bill</h1>
      <p className="text-xs text-slate-400 mt-1">Paystack will pay your biller directly, not you.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <select
          value={countryLabel}
          onChange={(e) => setCountryLabel(e.target.value)}
          className="w-full p-3 rounded-lg bg-white/10"
        >
          {COUNTRIES.map((c) => React.createElement("option", { key: c.label, value: c.label, className: "bg-slate-900" }, c.label))}
        </select>

        <input
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="Your Full Name"
          className="w-full p-3 rounded-lg bg-white/10"
        />

        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={"Amount in " + selectedCountry.currency + " - e.g. 200"}
          type="number"
          min={1}
          className="w-full p-3 rounded-lg bg-white/10"
        />

        <input
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          placeholder="Biller Name - e.g. KNUST Finance, ECG, Landlord"
          className="w-full p-3 rounded-lg bg-white/10"
        />

        <input
          value={billRefInput}
          onChange={(e) => setBillRefInput(e.target.value)}
          placeholder="Bill / Meter / Student Reference ID (optional)"
          className="w-full p-3 rounded-lg bg-white/10"
        />

        <input
          value={ownerPhone}
          onChange={(e) => setOwnerPhone(e.target.value)}
          placeholder="Your Phone / Biller Account / Momo Number"
          className="w-full p-3 rounded-lg bg-white/10"
        />

        <select
          value={billType}
          onChange={(e) => setBillType(e.target.value)}
          className="w-full p-3 rounded-lg bg-white/10"
        >
          {BILL_TYPES.map((t) => React.createElement("option", { key: t, value: t, className: "bg-slate-900" }, t))}
        </select>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Your story in 280 chars - Why should someone clear this?"
          maxLength={280}
          className="w-full p-3 rounded-lg bg-white/10 h-24"
        />

        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => setEvidenceFile(e.target.files?.item(0) || null)}
          className="w-full text-sm"
        />

        {errorMsg && (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-bold rounded-lg transition"
        >
          {submitting ? "Submitting Bill..." : "Submit for Verification"}
        </button>
      </form>
    </div>
  );
}
