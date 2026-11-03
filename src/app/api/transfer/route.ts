import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { recipient_code, amount, billId, reason } = await req.json();
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    console.log("Attempting transfer:", { recipient_code, amount });
    const res = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        source: "balance",
        reason: reason || "SwipeDebt payout",
        amount: Number(amount),
        recipient: recipient_code
      })
    });
    const data = await res.json();
    console.log("PAYSTACK RAW RESPONSE:", JSON.stringify(data, null, 2));
    if (!data.status) {
      return NextResponse.json({ status: false, message: data.message, data }, { status: 400 });
    }
    return NextResponse.json({ status: true, data: data.data });
  } catch (e: any) {
    console.error("Transfer exception:", e.message);
    return NextResponse.json({ status: false, message: e.message }, { status: 500 });
  }
}
