"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function PayContent() {
  const searchParams = useSearchParams();
  const billId = searchParams.get("id") || searchParams.get("bill") || "";
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/bills");
        const data = await res.json();
        if (data.bills) setBills(data.bills);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading bills...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Support a Bill</h1>
        <div className="grid gap-4">
          {bills.map((bill: any) => (
            <div key={bill.id} className="bg-white p-4 rounded-xl shadow flex justify-between items-center">
              <div>
                <p className="font-bold">{bill.bill_id || bill.id}</p>
                <p className="text-sm text-gray-600">GHS {bill.amount} - {bill.status}</p>
              </div>
              <Link href={`/pay/${bill.bill_id || bill.id}`} className="bg-black text-white px-4 py-2 rounded-lg text-sm">
                Pay
              </Link>
            </div>
          ))}
        </div>
        {bills.length === 0 && <p className="text-center text-gray-500 mt-10">No bills available</p>}
      </div>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PayContent />
    </Suspense>
  );
}
