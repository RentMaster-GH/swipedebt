// src/app/api/paystack/initialize/route.ts - Pass metadata correctly
import { NextRequest, NextResponse } from "next/server"

function normalizeGhanaPhone(input: string) {
  if (!input) return ""
  let p = input.trim().replace(/\s+/g, "").replace(/^\+/, "")
  if (p.startsWith("0")) p = "233" + p.slice(1)
  if (!p.startsWith("233") && p.length === 9) p = "233" + p
  return p
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, amount, currency, metadata, billId } = body
    
    const cleanEmail = email?.toString().trim().toLowerCase()
    if (!cleanEmail) return NextResponse.json({ error: "Invalid Email Address Passed" }, { status: 400 })

    if (!amount || Number(amount) < 100) { // < GHS 1
      return NextResponse.json({ error: "Amount must be at least GHS 1 (100 kobo)" }, { status: 400 })
    }

    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) return NextResponse.json({ error: "PAYSTACK_SECRET_KEY missing in .env.local" }, { status: 500 })

    // Build clean metadata - Paystack requires flat key/values + custom_fields optional
    const rawPhone = metadata?.payer_phone || metadata?.phone || ""
    const cleanPhone = normalizeGhanaPhone(rawPhone)

    const cleanMetadata = {
      billId: billId || metadata?.billId || metadata?.bill_id || "",
      bill_id: billId || metadata?.billId || metadata?.bill_id || "",
      payer_name: metadata?.payer_name || metadata?.payerName || "",
      payer_phone: cleanPhone,
      phone: cleanPhone,
      payer_email: cleanEmail,
      country: metadata?.country || "GH",
      biller: metadata?.biller || "",
      total_amount: metadata?.total_amount || 0,
      remaining_before: metadata?.remaining_before || 0,
      custom_fields: [
        { display_name: "Bill ID", variable_name: "bill_id", value: billId || metadata?.billId || "" },
        { display_name: "Payer Name", variable_name: "payer_name", value: metadata?.payer_name || "" },
        { display_name: "Payer Phone", variable_name: "payer_phone", value: cleanPhone },
        { display_name: "Country", variable_name: "country", value: metadata?.country || "GH" },
      ]
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3000"

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: cleanEmail,
        amount: Math.round(Number(amount)), // smallest unit (kobo/pesewas)
        currency: currency || "GHS",
        callback_url: `${appUrl}/pay/callback`,
        metadata: cleanMetadata,
        channels: ["card", "mobile_money", "bank", "ussd", "bank_transfer"],
      }),
    })

    const data = await paystackRes.json()
    
    if (!data.status) {
      console.error("Paystack init error:", data)
      return NextResponse.json({ error: data.message }, { status: 400 })
    }

    return NextResponse.json({ 
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
      cleanPhone // return for debugging
    })
  } catch (e: any) {
    console.error("Initialize error:", e)
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 })
  }
}