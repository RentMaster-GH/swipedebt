"use client";
import { useState, Suspense } from "react";

export const dynamic = 'force-dynamic';

function PostContent() {
  const [country, setCountry] = useState("GH");
  const [story, setStory] = useState("");
  const currencies: Record<string, string> = { GH: "GHS", NG: "NGN", ZA: "ZAR", KE: "KES", CI: "XOF", ET: "ETB", EG: "EGP" };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Bill submitted for ${currencies[country]} verification! We'll review in 24h.`);
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-black">Post your bill</h1>
      <p className="text-xs text-slate-400 mt-1">Paystack will pay your biller directly, not you. {currencies[country]} support.</p>
      
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <select value={country} onChange={e => setCountry(e.target.value)} className="w-full p-3 rounded-lg bg-white/10 border border-white/10">
          <option value="GH">Ghana - GHS</option>
          <option value="NG">Nigeria - NGN</option>
          <option value="ZA">South Africa - ZAR</option>
          <option value="KE">Kenya - KES</option>
          <option value="CI">Ivory Coast - XOF</option>
          <option value="ET">Ethiopia - ETB</option>
          <option value="EG">Egypt - EGP</option>
        </select>

        <div className="grid grid-cols-2 gap-3">
          <input required placeholder={`Amount in ${currencies[country]}`} type="number" min="1" className="w-full p-3 rounded-lg bg-white/10 border border-white/10" />
          <select required className="w-full p-3 rounded-lg bg-white/10 border border-white/10">
            <option value="">Category</option>
            <option>School Fees</option>
            <option>Rent</option>
            <option>Medical</option>
            <option>Utilities</option>
            <option>Debt</option>
          </select>
        </div>

        <input required placeholder="Biller Name - e.g. KNUST Finance, ECG, Landlord" className="w-full p-3 rounded-lg bg-white/10 border border-white/10" />
        <input required placeholder={`Biller ${currencies[country]} Account / Momo for payout`} className="w-full p-3 rounded-lg bg-white/10 border border-white/10" />
        
        <div>
          <textarea required placeholder="Your story in 280 chars - Why should someone clear this?" maxLength={280} value={story} onChange={e => setStory(e.target.value)} className="w-full p-3 rounded-lg bg-white/10 border border-white/10 h-24" />
          <div className="text-right text-[10px] text-slate-500 mt-1">{story.length}/280</div>
        </div>

        <div className="border border-dashed border-white/20 rounded-lg p-4">
          <label className="text-xs text-slate-300">Upload bill proof (PDF/image) - we blur PII</label>
          <input required type="file" accept="image/*,.pdf" className="w-full mt-2 text-sm file:mr-3 file:py-2 file:px-3 file:rounded-full file:border-0 file:bg-amber-400 file:text-black file:font-bold file:text-xs" />
        </div>

        <button type="submit" className="w-full py-3 bg-amber-400 text-black font-bold rounded-lg hover:bg-amber-300 transition">Submit for Verification</button>
        <p className="text-[10px] text-slate-500 text-center">By posting you agree bills are verified and paid directly to biller. No cash payout.</p>
      </form>
    </div>
  );
}

export default function PostPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0f1e] text-white p-8">Loading...</div>}>
      <PostContent />
    </Suspense>
  );
}