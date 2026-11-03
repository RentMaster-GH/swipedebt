import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, amount, bill_id, student_name } = await req.json();
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email || "student@knust.edu.gh",
        amount: Number(amount),
        metadata: {
          bill_id,
          billId: bill_id,
          student_name
        },
        callback_url: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/pay/success`
      })
    });

    const data = await res.json();
    console.log("Initialize:", JSON.stringify(data, null, 2));

    if (!data.status) {
      return NextResponse.json({ status: false, message: data.message }, { status: 400 });
    }

    return NextResponse.json({ status: true, authorization_url: data.data.authorization_url, reference: data.data.reference });
  } catch (e: any) {
    return NextResponse.json({ status: false, message: e.message }, { status: 500 });
  }
}
