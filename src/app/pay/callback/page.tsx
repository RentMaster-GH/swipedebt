"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Verifying payment...");

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    
    if (!reference) {
      setStatus("No reference found");
      setTimeout(() => router.push("/pay"), 2000);
      return;
    }

    async function verify() {
      try {
        const res = await fetch("/api/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });
        const data = await res.json();
        
        if (data.success || data.status === "already_processed") {
          router.push(`/pay/success?ref=${reference}`);
        } else {
          setStatus("Verification failed: " + (data.error || "unknown"));
          setTimeout(() => router.push("/pay"), 3000);
        }
      } catch (e: any) {
        setStatus("Error: " + e.message);
      }
    }

    verify();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>{status}</p>
      </div>
    </div>
  );
}

export default function PayCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <CallbackContent />
    </Suspense>
  );
}