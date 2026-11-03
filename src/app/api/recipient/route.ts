import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BANK_CODES: Record<string, string> = {
  GH_MOMO_MTN: "MTN",
  GH_MOMO_VODAFONE: "VOD",
  GH_MOMO_AIRTELTIGO: "ATL",
  GH_BANK: "GH",
};

export async function POST(req: NextRequest) {
  try {
    const { type, name, account_number, bank_code, currency } = await req.json();

    if (!account_number || !name) {
      return NextResponse.json({ status: false, message: "name and account_number required" }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ status: false, message: "PAYSTACK_SECRET_KEY missing" }, { status: 500 });
    
    let payload: any = {
      type: type || "nuban",
      name,
      currency: currency || "GHS",
      description: `SwipeDebt biller payout - ${name}`
    };

    if (type === "mobile_money") {
      payload = {
        type: "mobile_money",
        name,
        account_number,
        bank_code: bank_code || "MTN",
        currency: "GHS"
      };
    } else {
      payload = {
        type: "nuban",
        name,
        account_number,
        bank_code,
        currency: currency || "GHS"
      };
    }

    const res = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!data.status) {
      return NextResponse.json({ status: false, message: "Failed to create recipient", paystack: data }, { status: 400 });
    }

    return NextResponse.json({
      status: true,
      recipient_code: data.data.recipient_code,
      data: data.data
    });

  } catch (e: any) {
    return NextResponse.json({ status: false, message: e.message }, { status: 500 });
  }
}

export async function GET() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ status: false, message: "PAYSTACK_SECRET_KEY missing" }, { status: 500 });
  const res = await fetch("https://api.paystack.co/bank?currency=GHS", {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  const data = await res.json();
  return NextResponse.json(data);
}
