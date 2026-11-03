// src/app/api/paystack/verify/route.ts - Fixed no duplicate props
import { NextRequest, NextResponse } from "next/server";
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
  try {
    const body = await req.json();
    const { reference, bill_db_id, bill_id, payer_phone, payer_name, payer_email } = body;

    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "Missing PAYSTACK_SECRET_KEY" }, { status: 500 });

    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data.status !== "success") {
      return NextResponse.json({ error: "Payment not successful", raw: paystackData }, { status: 400 });
    }

    const amountGHS = Number(paystackData.data.amount) / 100;
    const customer = paystackData.data.customer || {};
    const metadata = paystackData.data.metadata || {};

    const finalBillDbId = bill_db_id || metadata.bill_db_id;
    const finalBillId = bill_id || metadata.bill_id;
    const finalPayerPhone = (payer_phone || metadata.payer_phone || customer.phone || "").toString().replace(/\D/g, "");
    const finalPayerName = payer_name || metadata.payer_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Anonymous Donor";
    const finalPayerEmail = payer_email || metadata.payer_email || customer.email || "";

    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase.from("bills").select("paystack_reference").eq("paystack_reference", reference).limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ status: "already_processed", reference });
    }

    let billToUpdateId = finalBillDbId;
    if (!billToUpdateId && finalBillId) {
      const { data: found } = await supabase.from("bills").select("id").eq("bill_id", finalBillId).single();
      if (found) billToUpdateId = found.id;
    }

    if (!billToUpdateId) {
      return NextResponse.json({ error: "Bill ID not found" }, { status: 404 });
    }

    const { data: bill } = await supabase.from("bills").select("id,amount,amount_paid").eq("id", billToUpdateId).single();
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });

    const total = getRealAmount(Number(bill.amount));
    const currentPaid = Number(bill.amount_paid || 0);
    const newPaid = currentPaid + amountGHS;
    const isCleared = newPaid >= total;

    const { error: updateError } = await supabase.from("bills").update({
      amount_paid: newPaid,
      status: isCleared ? "paid" : "approved",
      payer_name: finalPayerName,
      payer_email: finalPayerEmail,
      payer_phone: finalPayerPhone,
      last_payment_amount: amountGHS,
      last_payment_phone: finalPayerPhone,
      last_payment_at: new Date().toISOString(),
      paystack_reference: reference,
    }).eq("id", billToUpdateId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabase.from("payments").insert({
      bill_id: billToUpdateId,
      bill_ref: finalBillId || "",
      amount: amountGHS,
      payer_name: finalPayerName,
      payer_phone: finalPayerPhone,
      payer_email: finalPayerEmail,
      paystack_ref: reference,
      status: "success",
    });

    return NextResponse.json({ success: true, bill: billToUpdateId, paid: newPaid, total, cleared: isCleared });
  } catch (err: any) {
    console.error("Verify error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Paystack verify alive" });
}