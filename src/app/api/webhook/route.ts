import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  const secret = process.env.PAYSTACK_SECRET_KEY!;

  // 1. Verify Paystack signature
  const hash = crypto.createHmac("sha512", secret).update(body).digest("hex");
  if (hash !== signature) {
    console.error("Invalid webhook signature");
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const eventType = event.event;
  const data = event.data;

  console.log(`[Webhook] ${eventType} | ref: ${data?.reference || data?.transfer_code}`);

  // 2. Always log event for audit
  await supabase.from("paystack_events").insert({
    event: eventType,
    reference: data?.reference || null,
    transfer_code: data?.transfer_code || null,
    payload: event
  });

  // 3. CHARGE SUCCESS -> Update bill + Auto-payout to KNUST
  if (eventType === "charge.success") {
    const reference = data.reference;
    const amountPaid = data.amount; // pesewas
    const billId = data.metadata?.bill_id || data.metadata?.billId;

    if (!billId) {
      console.error("No bill_id in metadata", reference);
      return NextResponse.json({ received: true });
    }

    // Get bill + recipient
    const { data: bill } = await supabase
      .from("bills")
      .select("*, recipients!inner(recipient_code, id)")
      .eq("bill_id", billId)
      .single();

    if (!bill) {
      // Fallback: get default recipient
      const { data: defaultRecipient } = await supabase
        .from("recipients")
        .select("id, recipient_code")
        .eq("is_default", true)
        .single();

      if (!defaultRecipient) {
        console.error("No bill and no default recipient");
        return NextResponse.json({ received: true });
      }

      await supabase.from("bills").update({
        status: "paid",
        amount_paid: amountPaid,
        paystack_reference: reference,
        paid_at: new Date().toISOString(),
        recipient_id: defaultRecipient.id
      }).eq("bill_id", billId);

      // Continue to payout with default recipient
      await handlePayout(billId, amountPaid, defaultRecipient.id, defaultRecipient.recipient_code);
    } else {
      // Update bill to paid
      await supabase.from("bills").update({
        status: "paid",
        amount_paid: amountPaid,
        paystack_reference: reference,
        paid_at: new Date().toISOString()
      }).eq("bill_id", billId);

      const recipientCode = (bill.recipients as any)?.recipient_code || "RCP_twoaiq19feu7rtt";
      const recipientId = bill.recipient_id;

      await handlePayout(billId, amountPaid, recipientId, recipientCode);
    }
  }

  // 4. TRANSFER SUCCESS -> Mark payout + bill as completed
  if (eventType === "transfer.success" || eventType === "transfer.failed" || eventType === "transfer.reversed") {
    const transferCode = data.transfer_code;
    const transferStatus = eventType === "transfer.success" ? "success" : eventType === "transfer.failed" ? "failed" : "reversed";

    // Update payouts table
    const { data: payout } = await supabase
      .from("payouts")
      .update({
        status: transferStatus,
        paystack_response: data,
        completed_at: new Date().toISOString()
      })
      .eq("paystack_transfer_code", transferCode)
      .select("bill_id")
      .single();

    if (payout?.bill_id) {
      // Update bill status
      const billStatus = transferStatus === "success" ? "completed" : "transfer_failed";
      await supabase.from("bills").update({
        status: billStatus,
        paystack_transfer_code: transferCode
      }).eq("id", payout.bill_id);

      console.log(`[Webhook] Bill ${payout.bill_id} -> ${billStatus}`);
    }
  }

  return NextResponse.json({ received: true });
}

// Helper: Create payout record + call Paystack transfer
async function handlePayout(billIdText: string, totalPaid: number, recipientId: string, recipientCode: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY!;
  
  // Get bill to get fee
  const { data: bill } = await supabase
    .from("bills")
    .select("id, platform_fee")
    .eq("bill_id", billIdText)
    .single();

  if (!bill) return;

  const fee = bill.platform_fee || 50;
  const toTransfer = totalPaid - fee;

  if (toTransfer < 100) {
    console.log(`Amount ${toTransfer} too small to transfer, skipping`);
    return;
  }

  // 1. Create payout row as queued
  const { data: payoutRow } = await supabase.from("payouts").insert({
    bill_id: bill.id,
    recipient_id: recipientId,
    amount: toTransfer,
    fee: fee,
    total_paid: totalPaid,
    status: "queued"
  }).select().single();

  // 2. Call Paystack transfer
  console.log(`[Payout] Transferring ${toTransfer}pes to ${recipientCode} for bill ${billIdText}`);
  
  const transferRes = await fetch("https://api.paystack.co/transfer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      source: "balance",
      amount: toTransfer,
      recipient: recipientCode,
      reason: `SwipeDebt ${billIdText}`,
      reference: `SWIPE_${billIdText}_${Date.now()}`
    })
  });

  const transferData = await transferRes.json();
  console.log("[Payout] Paystack response:", JSON.stringify(transferData, null, 2));

  if (transferData.status) {
    // Update bill + payout with transfer code
    await supabase.from("bills").update({
      status: "transfer_queued",
      paystack_transfer_code: transferData.data.transfer_code
    }).eq("id", bill.id);

    await supabase.from("payouts").update({
      paystack_transfer_code: transferData.data.transfer_code,
      paystack_transfer_id: transferData.data.id,
      paystack_response: transferData.data,
      status: "pending"
    }).eq("id", payoutRow.id);

  } else {
    // Mark failed (e.g. insufficient balance)
    await supabase.from("bills").update({
      status: "transfer_failed"
    }).eq("id", bill.id);

    await supabase.from("payouts").update({
      status: "failed",
      paystack_response: transferData
    }).eq("id", payoutRow.id);

    console.error(`[Payout] FAILED: ${transferData.message}`);
  }
}
