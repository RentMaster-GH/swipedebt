// src/app/api/recipient/route.ts
import { NextRequest, NextResponse } from "next/server";

// Bank codes for SwipeDebt countries
const BANK_CODES: Record<string, string> = {
  GH_MOMO_MTN: "MTN",
  GH_MOMO_VODAFONE: "VOD",
  GH_MOMO_AIRTELTIGO: "ATL",
  GH_BANK: "GH", // you will resolve via /bank/resolve
};

export async function POST(req: NextRequest) {
  try {
    const { type, name, account_number, bank_code, currency, country } = await req.json();
    // type: "nuban" | "mobile_money" | "ghipss"
    // For Ghana: mobile_money for MoMo, nuban for bank

    if (!account_number || !name) {
      return NextResponse.json({ status: false, message: "name and account_number required" }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY!;
    
    // Auto-detect Ghana MoMo vs Bank
    let payload: any = {
      type: type || "nuban",
      name,
      currency: currency || "GHS",
      description: `SwipeDebt biller payout - ${name}`
    };

    if (type === "mobile_money") {
      // GHANA MOBILE MONEY
      payload = {
        type: "mobile_money",
        name,
        account_number, // e.g. 0551234567
        bank_code: bank_code || "MTN", // MTN, VOD, ATL
        currency: "GHS"
      };
    } else {
      // GHANA/NG BANK ACCOUNT
      payload = {
        type: "nuban",
        name,
        account_number,
        bank_code, // e.g. 057 for Zenith Ghana, use Paystack /bank list
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
      recipient_code: data.data.recipient_code, // RCP_xxxxx - SAVE THIS IN DB
      data: data.data
    });

  } catch (e: any) {
    return NextResponse.json({ status: false, message: e.message }, { status: 500 });
  }
}

// Helper: List banks to get bank_code
export async function GET() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY!;
  const res = await fetch("https://api.paystack.co/bank?currency=GHS", {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  const data = await res.json();
  return NextResponse.json(data);
}