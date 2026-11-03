// src/app/api/verify/route.ts - Verify Paystack Payment
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const paystackSecret = process.env.PAYSTACK_SECRET_KEY!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    // 1. Verify with Paystack
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
      },
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data.status !== "success") {
      return NextResponse.json({ error: "Payment not successful", data: paystackData }, { status: 400 });
    }

    const amount = paystackData.data.amount / 100; // Paystack sends kobo/pesewas
    const metadata = paystackData.data.metadata || {};
    const bill_id = metadata.bill_id;
    const payer_email = paystackData.data.customer?.email;
    const payer_phone = metadata.payer_phone || "";
    const payer_name = metadata.payer_name || "";

    if (!bill_id) {
      return NextResponse.json({ error: "No bill_id in metadata" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Get current bill
    const { data: bill, error: billError } = await supabase.from("bills").select("*").eq("bill_id", bill_id).single();
    if (billError || !bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const currentPaid = Number(bill.amount_paid || 0);
    const newPaid = currentPaid + amount;
    const realAmount = Number(bill.amount) > 10000 ? Number(bill.amount) / 100 : Number(bill.amount);
    const newStatus = newPaid >= realAmount ? "paid" : bill.status;

    // 3. Update bill
    const { error: updateError } = await supabase.from("bills").update({
      amount_paid: newPaid,
      status: newStatus,
      payer_email: payer_email || bill.payer_email,
      payer_phone: payer_phone || bill.payer_phone,
      payer_name: payer_name || bill.payer_name,
      paystack_reference: reference,
      last_payment_amount: amount,
      last_payment_phone: payer_phone,
      last_payment_at: new Date().toISOString(),
    }).eq("bill_id", bill_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 4. Log payment
    await supabase.from("payments").insert({
      bill_id: bill.id,
      amount,
      paystack_reference: reference,
      payer_email,
      payer_phone,
      payer_name,
      status: "success",
    });

    return NextResponse.json({ success: true, bill_id, amount, newPaid, status: newStatus });

  } catch (err: any) {
    console.error("Verify error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Verify endpoint works. Use POST with {reference}" });
}