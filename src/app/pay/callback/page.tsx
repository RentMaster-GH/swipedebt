"use client"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function Callback() {
  const params = useSearchParams()
  const router = useRouter()
  const ref = params.get("reference")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function verify() {
      if (!ref) return
      const res = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: ref })
      })
      const json = await res.json()
      setData(json)
      setLoading(false)
      
      // Auto-trigger WhatsApp if link exists
      if (json.waLink && json.success) {
        // small delay so user sees success
        setTimeout(() => {
          window.open(json.waLink, "_blank")
        }, 1500)
      }
    }
    verify()
  }, [ref])

  if (loading) return <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center text-white">Verifying payment...</div>

  if (!data?.success) return <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center text-white p-6 text-center">Payment failed: {data?.error}<br/><button onClick={()=>router.push("/")} className="mt-4 px-4 py-2 bg-white/10 rounded-full">Go Home</button></div>

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center p-6">
      <div className="bg-[#141e33] rounded-[20px] p-6 max-w-[400px] w-full text-center space-y-4 border border-white/10">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">✓</div>
        <h1 className="text-2xl font-black">Payment Successful!</h1>
        <p className="text-sm text-slate-300">You paid {data.amountPaid} {data.remaining > 0 ? `— ${data.remaining} left` : "— Fully cleared! 🎉"}</p>
        <div className="bg-black/30 rounded-xl p-3 text-xs text-left space-y-1">
          <div>Ref: {data.reference}</div>
          <div>Progress: {data.progress}%</div>
          <div>Email receipt: {data.emailSent ? "Sent ✅" : "Not configured (add RESEND_API_KEY)"}</div>
        </div>
        <div className="flex gap-2">
          <a href={data.waLink} target="_blank" className="flex-1 py-3 bg-[#25D366] text-black font-bold rounded-xl">Share on WhatsApp</a>
          <button onClick={()=>router.push("/")} className="flex-1 py-3 bg-white/10 rounded-xl">Done</button>
        </div>
      </div>
    </div>
  )
}