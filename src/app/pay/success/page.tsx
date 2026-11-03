"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

function SuccessContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") || searchParams.get("reference") || "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-2">Thank you for your contribution.</p>
        {ref && (
          <p className="text-xs text-gray-400 mb-6 break-all">
            Ref: {ref}
          </p>
        )}
        <div className="flex flex-col gap-3">
          <Link href="/" className="w-full bg-black text-white py-3 rounded-xl font-medium">
            Back to Home
          </Link>
          <Link href="/pay" className="w-full bg-gray-100 py-3 rounded-xl font-medium">
            Support Another Bill
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}