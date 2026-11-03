"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function SuccessPage() {
  const params = useSearchParams();
  const reference = params.get("reference");
  const [status, setStatus] = useState("Verifying...");

  useEffect(() => {
    if (!reference) return;
    fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference })
    })
      .then(r=>r.json())
      .then(d=> setStatus(JSON.stringify(d, null, 2)))
      .catch(e=> setStatus("Error: "+e.message));
  }, [reference]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <h1 className="text-xl font-bold">Payment {reference}</h1>
      <pre className="mt-4 p-4 bg-zinc-900 rounded-xl text-xs overflow-auto">{status}</pre>
      <a href="/pay" className="mt-6 inline-block underline">Pay another</a>
    </div>
  );
}
