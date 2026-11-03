// src/app/api/paystack/verify/route.ts - MERGED FINAL - Verify + Email + WhatsApp + Idempotency
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function formatMoney(amount: number, currency: string) {
  return `${currency} ${Number(amount).toLocaleString()}`
}

function getRealAmount(amount: number) {
  const num = Number(amount) || 0
  return num > 10000 ? num / 100 : num // fixes 10000 => 100 bug
}

export async function POST(req: NextRequest) {
  try {
    const { reference } = await req.json()
    if (!reference) return NextResponse.json({ error: "No reference" }, { status: 400 })

    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) return NextResponse.json({ error: "Missing PAYSTACK_SECRET_KEY" }, { status: 500 })

    // 1. Verify with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    })
    const result = await verifyRes.json()
    if (!result.status || result.data?.status !== "success") {
      return NextResponse.json({ error: "Payment not successful", data: result.data }, { status: 400 })
    }

    const data = result.data
    // Handle all your metadata keys: billId, bill_id, bill_db_id
    const billId = data.metadata?.bill_db_id || data.metadata?.billId || data.metadata?.bill_id
    const amountPaid = data.amount / 100
    const currency = data.currency || "GHS"
    const payerEmail = data.customer?.email
    const payerName = data.metadata?.payer_name || data.metadata?.payerName || data.customer?.email?.split("@")[0] || "Donor"
    const payerPhone = data.metadata?.payer_phone || data.metadata?.phone || data.metadata?.payerPhone || ""

    if (!billId) return NextResponse.json({ success: true, warning: "No billId in metadata", reference })

    const supabase = getSupabaseAdmin()

    // 2. Idempotency — don't double-pay if webhook already did it
    const { data: existing } = await supabase.from("bills").select("id,amount_paid").eq("paystack_reference", reference).limit(1)
    if (existing && existing.length > 0) {
      const { data: billExist } = await supabase.from("bills").select("*").eq("id", billId).single()
      const totalExist = getRealAmount(Number(billExist?.amount || 0))
      const newPaidExist = Number(billExist?.amount_paid || 0)
      return NextResponse.json({ 
        status: "already_verified", 
        success: true,
        amount: amountPaid, 
        newPaid: newPaidExist, 
        total: totalExist,
        billId,
        reference,
        message: "Already processed by webhook"
      })
    }

    const { data: bill } = await supabase.from("bills").select("*").eq("id", billId).single()
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 })

    const currentPaid = Number(bill.amount_paid || 0)
    const newPaid = currentPaid + amountPaid
    const total = getRealAmount(Number(bill.amount))
    const remaining = Math.max(0, total - newPaid)
    const newStatus = newPaid >= total ? "paid" : "approved"
    const progress = Math.min(100, Math.round((newPaid / total) * 100))

    // 3. Update bill — this is source of truth for Home + Admin
    const { error: updateError } = await supabase.from("bills").update({
      amount_paid: newPaid,
      status: newStatus,
      paid_at: newStatus === "paid" ? new Date().toISOString() : bill.paid_at,
      paystack_reference: reference,
      payer_email: payerEmail,
      payer_name: payerName,
      payer_phone: payerPhone.replace(/\D/g, ""),
      last_payment_amount: amountPaid,
      last_payment_at: new Date().toISOString(),
      last_payment_phone: payerPhone.replace(/\D/g, ""),
    }).eq("id", billId)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    // 4. Payments history
    try {
      await supabase.from("payments").insert({
        bill_id: billId,
        bill_ref: bill.bill_id,
        amount: amountPaid,
        currency,
        reference,
        paystack_ref: reference,
        payer_name: payerName,
        payer_email: payerEmail,
        payer_phone: payerPhone,
        status: "success",
        raw_payload: data,
      })
    } catch (e) { console.log("payments insert skipped", e) }

    // 5. Email receipt (your Resend logic)
    let emailSent = false
    if (resend && payerEmail) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM || "SwipeDebt <onboarding@resend.dev>",
          to: payerEmail,
          subject: `Receipt: ${formatMoney(amountPaid, currency)} paid for ${bill.student_name}`,
          html: `<div style="font-family:sans-serif;background:#0a0f1e;color:white;padding:24px;border-radius:12px"><h1 style="color:#fbbf24">Thank you, ${payerName}! 🙏</h1><p>You paid <b>${formatMoney(amountPaid, currency)}</b> for <b>${bill.student_name}</b>'s ${bill.bill_type||"bill"}.</p><div style="background:#141e33;padding:16px;border-radius:10px;margin:16px 0"><p>Total Paid: ${formatMoney(newPaid, currency)} / ${formatMoney(total, currency)}</p><p>Remaining: ${formatMoney(remaining, currency)} (${progress}%)</p><p>Bill Ref: ${bill.bill_id}</p><p>Ref: ${reference}</p><p>Phone: ${payerPhone}</p></div><p style="font-size:12px;color:#94a3b8">Evidence verified by admin. Paystack pays biller directly.</p></div>`,
        })
        emailSent = true
      } catch (e) { console.error("Email fail", e) }
    }

    // 6. WhatsApp auto
    let whatsappSent = false
    const waMessage = `Thank you ${payerName}! You paid ${formatMoney(amountPaid, currency)} for ${bill.student_name}'s ${bill.bill_type||"bill"} (${bill.bill_id}). ${remaining>0 ? `${formatMoney(remaining, currency)} left (${progress}% paid). Help finish: ${process.env.NEXT_PUBLIC_APP_URL}/?bill=${billId}` : `Fully cleared! 🎉`}`
    const waToken = process.env.WHATSAPP_TOKEN
    const waPhoneId = process.env.WHATSAPP_PHONE_ID

    if (waToken && waPhoneId && payerPhone) {
      try {
        await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${waToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", to: payerPhone, type: "text", text: { body: waMessage } })
        })
        whatsappSent = true
      } catch (e) { console.error("WA fail", e) }
    }

    const waLink = `https://wa.me/${payerPhone ? payerPhone : ""}?text=${encodeURIComponent(waMessage)}`

    return NextResponse.json({
      success: true,
      status: "success",
      billId,
      bill_id: bill.bill_id,
      amount: amountPaid,
      amountPaid,
      totalPaid: newPaid,
      newPaid,
      total,
      remaining,
      progress,
      status: newStatus,
      emailSent,
      whatsappSent,
      payerName,
      payerEmail,
      payerPhone,
      waLink,
      waMessage,
      reference,
    })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: "Verify endpoint alive - POST with reference" })
}