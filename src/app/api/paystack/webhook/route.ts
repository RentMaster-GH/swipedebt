// src/app/api/paystack/webhook/route.ts - Auto-update bill even if browser closed + Vercel logs fix
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getRealAmount(amount: number) {
  const num = Number(amount) || 0;
  return num > 10000 ? num / 100 : num;
}

export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Missing PAYSTACK_SECRET_KEY" }, { status: 500 });

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";

  // 1. Verify signature
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  if (hash !== signature) {
    console.error("Invalid Paystack signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  
  if (event.event !== "charge.success") {
    return NextResponse.json({ status: "ignored", event: event.event });
  }

  const data = event.data;
  const reference = data.reference;
  const amountGHS = Number(data.amount) / 100;
  const metadata = data.metadata || {};
  const billDbId = metadata.bill_db_id;
  const payerPhone = metadata.payer_phone || data.customer?.phone || "";
  const payerName = metadata.payer_name || `${data.customer?.first_name || ""} ${data.customer?.last_name || ""}`.trim();
  const payerEmail = data.customer?.email || "";

  // 2. Double verify with Paystack API
  try {
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${secret}` }
    });
    const verifyJson = await verifyRes.json();
    if (!verifyJson.status || verifyJson.data?.status !== "success") {
      return NextResponse.json({ error: "Paystack verification failed" }, { status: 400 });
    }
  } catch (e) {
    console.error("Paystack verify error", e);
  }

  const supabase = getSupabaseAdmin();

  // 3. Idempotency: skip if already processed
  const { data: existing } = await supabase.from("bills").select("paystack_reference").eq("paystack_reference", reference).limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json({ status: "already_processed" });
  }

  // 4. Get bill
  let billIdToUpdate = billDbId;
  if (!billIdToUpdate) {
    const { data: found } = await supabase.from("bills").select("id").eq("bill_id", metadata.bill_id).single();
    if (found) billIdToUpdate = found.id;
  }
  if (!billIdToUpdate) {
    console.error("No bill ID in metadata", metadata);
    return NextResponse.json({ error: "No bill ID" }, { status: 400 });
  }

  const { data: bill } = await supabase.from("bills").select("id,amount,amount_paid").eq("id", billIdToUpdate).single();
  if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });

  const total = getRealAmount(Number(bill.amount));
  const currentPaid = Number(bill.amount_paid || 0);
  const newPaid = currentPaid + amountGHS;
  const isCleared = newPaid >= total;

  // 5. Update bill
  const { error: updateError } = await supabase.from("bills").update({
    amount_paid: newPaid,
    payer_name: payerName || "Anonymous Donor",
    payer_email: payerEmail,
    payer_phone: payerPhone.replace(/\D/g, ""),
    last_payment_amount: amountGHS,
    last_payment_phone: payerPhone.replace(/\D/g, ""),
    last_payment_at: new Date().toISOString(),
    paystack_reference: reference,
    status: isCleared ? "paid" : "approved"
  }).eq("id", billIdToUpdate);

  if (updateError) {
    console.error("Update error", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 6. Log payment history
  await supabase.from("payments").insert({
    bill_id: billIdToUpdate,
    bill_ref: metadata.bill_id || "",
    amount: amountGHS,
    payer_name: payerName,
    payer_phone: payerPhone,
    payer_email: payerEmail,
    paystack_ref: reference,
    status: "success",
    raw_payload: data
  });

  console.log(`✅ Bill ${billIdToUpdate} updated +GHS ${amountGHS} -> ${newPaid}/${total} by ${payerPhone}`);

  return NextResponse.json({ status: "success", bill: billIdToUpdate, paid: newPaid });
}

export async function GET() {
  return NextResponse.json({ status: "Webhook alive - use POST with Paystack signature" });
}