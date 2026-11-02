// src/app/page.tsx - SwipeDebt Deck - Paystack Only
"use client";
import { useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Heart, X, MapPin, BadgeCheck, Clock, Wallet } from "lucide-react";

type Bill = {
  id: string;
  amount: number;
  currency: string;
  country: string;
  city: string;
  category: string;
  title: string;
  story: string;
  dueIn: string;
  verified: number;
  biller: string;
};

const MOCK_BILLS: Bill[] = [
  { id: "1", amount: 1200, currency: "GHS", country: "GH", city: "Accra", category: "School Fees", title: "Final Year KNUST Fees", story: "First class student, mom lost job last month. Need to clear before exams Friday.", dueIn: "2 days", verified: 94, biller: "KNUST Finance" },
  { id: "2", amount: 45000, currency: "NGN", country: "NG", city: "Lagos", category: "Rent", title: "1-Room Rent Overdue", story: "Okada rider, bike seized. Landlord gave 3 days. My 2 kids.", dueIn: "1 day", verified: 88, biller: "Landlord - Surulere" },
  { id: "3", amount: 3500, currency: "ZAR", country: "ZA", city: "Johannesburg", category: "Medical", title: "Mom's Dialysis", story: "Public hospital queue 6 months. Private session needed now.", dueIn: "5 days", verified: 96, biller: "Parklane Hospital" },
  { id: "4", amount: 15000, currency: "KES", country: "KE", city: "Nairobi", category: "Utilities", title: "ECG + Water Arrears", story: "Small kiosk owner, sales down. Kenya Power cut notice.", dueIn: "3 days", verified: 91, biller: "KPLC" },
];

export default function SwipeDebt() {
  const [bills, setBills] = useState(MOCK_BILLS);
  const [current, setCurrent] = useState(0);
  const [paidCount, setPaidCount] = useState(3);

  const handleSwipe = (dir: "left" | "right", bill: Bill) => {
    if (dir === "right") {
      // PAYSTACK CHECKOUT
      const amountKobo = bill.currency === "GHS" ? bill.amount * 100 : bill.amount * 100;
      window.location.href = `/pay?billId=${bill.id}&amount=${amountKobo}&currency=${bill.currency}&biller=${encodeURIComponent(bill.biller)}`;
    }
    setCurrent(c => c + 1);
  };

  const onDragEnd = (e: any, info: PanInfo, bill: Bill) => {
    if (info.offset.x > 100) handleSwipe("right", bill);
    else if (info.offset.x < -100) handleSwipe("left", bill);
  };

  const bill = bills[current];

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white flex flex-col">
      <header className="px-6 py-4 flex justify-between items-center border-b border-white/10">
        <h1 className="text-xl font-black tracking-tighter">SwipeDebt<span className="text-amber-400">.</span></h1>
        <div className="flex gap-3 text-[11px]">
          <span className="px-3 py-1 rounded-full bg-white/10">{paidCount} bills cleared</span>
          <a href="/post" className="px-3 py-1 rounded-full bg-amber-400 text-black font-bold">Post Bill</a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="relative w-full max-w-[380px] h-[580px]">
          <AnimatePresence>
            {bill ? (
              <motion.div
                key={bill.id}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(e, info) => onDragEnd(e, info, bill)}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ x: bill ? 300 : -300, opacity: 0, rotate: 15 }}
                className="absolute inset-0 bg-[#141e33] rounded-[24px] border border-white/10 overflow-hidden shadow-2xl"
              >
                <div className="h-44 bg-gradient-to-br from-amber-500/20 to-indigo-500/20 p-5 flex flex-col justify-end">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 text-amber-300 text-xs font-mono">
                        <MapPin className="w-3 h-3" />{bill.city}, {bill.country} · {bill.dueIn} left
                      </div>
                      <h2 className="text-3xl font-black mt-1">{bill.currency} {bill.amount.toLocaleString()}</h2>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full border border-emerald-500/30"><BadgeCheck className="w-3 h-3" />{bill.verified}% Verified</span>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex gap-2">
                    <span className="text-[10px] px-2 py-1 rounded-full bg-white/10">{bill.category}</span>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 flex items-center gap-1"><Wallet className="w-3 h-3" />{bill.biller}</span>
                  </div>
                  <h3 className="font-bold text-lg leading-tight">{bill.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">"{bill.story}"</p>
                  <div className="pt-2 text-[10px] text-slate-500 font-mono flex items-center gap-1"><Clock className="w-3 h-3" />Paystack pays {bill.biller} directly — no cash to user</div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex justify-between">
                  <button onClick={() => handleSwipe("left", bill)} className="w-14 h-14 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-rose-500/20"><X className="w-6 h-6" /></button>
                  <button onClick={() => handleSwipe("right", bill)} className="w-14 h-14 rounded-full bg-amber-400 text-black flex items-center justify-center hover:scale-105 transition"><Heart className="w-6 h-6 fill-black" /></button>
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-20">
                <p className="text-slate-400">No more bills today. Check back tomorrow.</p>
                <a href="/post" className="mt-4 inline-block px-4 py-2 bg-white/10 rounded-full text-sm">Post your bill</a>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="text-center py-4 text-[10px] text-slate-500">Paystack secured · Pays biller directly · {MOCK_BILLS.length} Paystack countries</footer>
    </div>
  );
}