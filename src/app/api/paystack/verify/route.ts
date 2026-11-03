import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function getRealAmount(amount: number) {
  const num = Number(amount) || 0;
  return num > 10000 ? num / 100 : num;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reference } = body;
    if (!reference) return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    const secret = process.env.PAYSTACK_SECRET_KEY!;
    const verifyRes = await fetch("https://api.paystack.co/transaction/verify/" + reference, {
      headers: { Authorization: "Bearer " + secret },
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.status || verifyData.data.status !== "success") {
      return NextResponse.json({ error: "Payment not successful" }, { status: 400 });
    }
    const amountGHS = Number(verifyData.data.amount) / 100;
    const meta = verifyData.data.metadata || {};
    const customer = verifyData.data.customer || {};
    const billDbId = meta.bill_db_id;
    const finalPhone = (meta.payer_phone || customer.phone || "").toString().replace(/\D/g, "");
    const finalName = meta.payer_name || ((customer.first_name || "") + " " + (customer.last_name || "")).trim() || "Anonymous Donor";
    const finalEmail = customer.email || "";
    const supabase = getSupabaseAdmin();
    const { data: exists } = await supabase.from("bills").select("paystack_reference").eq("paystack_reference", reference).limit(1);
    if (exists && exists.length > 0) {
      return NextResponse.json({ status: "already_processed" });
    }
    let billId = billDbId;
    if (!billId && meta.bill_id) {
      const { data: found } = await supabase.from("bills").select("id").eq("bill_id", meta.bill_id).single();
      if (found) billId = found.id;
    }
    if (!billId) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    const { data: bill } = await supabase.from("bills").select("id,amount,amount_paid").eq("id", billId).single();
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    const total = getRealAmount(Number(bill.amount));
    const newPaid = Number(bill.amount_paid || 0) + amountGHS;
    const cleared = newPaid >= total;
    await supabase.from("bills").update({
      amount_paid: newPaid,
      payer_name: finalName,
      payer_email: finalEmail,
      payer_phone: finalPhone,
      last_payment_amount: amountGHS,
      last_payment_phone: finalPhone,
      last_payment_at: new Date().toISOString(),
      paystack_reference: reference,
      status: cleared ? "paid" : "approved"
    }).eq("id", billId);
    await supabase.from("payments").insert({
      bill_id: billId,
      bill_ref: meta.bill_id || "",
      amount: amountGHS,
      payer_name: finalName,
      payer_phone: finalPhone,
      payer_email: finalEmail,
      paystack_ref: reference,
      status: "success"
    });
    return NextResponse.json({ success: true, bill: billId, paid: newPaid });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
