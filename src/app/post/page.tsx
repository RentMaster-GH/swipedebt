"use client";
import { useState } from "react";

export default function PostBill() {
  const [country, setCountry] = useState("GH");
  const currencies: any = { GH: "GHS", NG: "NGN", ZA: "ZAR", KE: "KES", CI: "XOF" };
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-black">Post your bill</h1>
      <p className="text-xs text-slate-400 mt-1">Paystack will pay your biller directly, not you.</p>
      <form className="mt-6 space-y-4">
        <select value={country} onChange={e => setCountry(e.target.value)} className="w-full p-3 rounded-lg bg-white/10">
          <option value="GH">Ghana - GHS</option>
          <option value="NG">Nigeria - NGN</option>
          <option value="ZA">South Africa - ZAR</option>
          <option value="KE">Kenya - KES</option>
          <option value="CI">Ivory Coast - XOF</option>
        </select>
        <input placeholder="Amount - e.g. 1200" type="number" className="w-full p-3 rounded-lg bg-white/10" />
        <input placeholder="Biller Name - e.g. KNUST Finance, ECG, Landlord" className="w-full p-3 rounded-lg bg-white/10" />
        <input placeholder="Biller Account / Momo Number for payout" className="w-full p-3 rounded-lg bg-white/10" />
        <select className="w-full p-3 rounded-lg bg-white/10"><option>School Fees</option><option>Rent</option><option>Medical</option><option>Utilities</option><option>Debt</option></select>
        <textarea placeholder="Your story in 280 chars - Why should someone clear this?" maxLength={280} className="w-full p-3 rounded-lg bg-white/10 h-24" />
        <input type="file" accept="image/*,.pdf" className="w-full text-sm" />
        <button className="w-full py-3 bg-amber-400 text-black font-bold rounded-lg">Submit for Verification</button>
      </form>
    </div>
  );
}