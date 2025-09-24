import { NextRequest, NextResponse } from "next/server";
import { getOrder, updateOrderStatus } from "@/lib/orders";
import { mpPayment } from "@/lib/mercadopago";

type WebhookPayload = { type?: string; data?: { id?: string } };

const SECRET = process.env.MP_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const headerSecret = req.headers.get("x-mp-webhook-secret");
    if (SECRET && headerSecret !== SECRET) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const payload = (await req.json()) as WebhookPayload;
    const type = payload.type;
    const paymentId = payload?.data?.id;

    if (!type || !paymentId) return NextResponse.json({ ignored: true }, { status: 200 });
    if (type !== "payment") return NextResponse.json({ ignoredType: type }, { status: 200 });

    // SDK v2
    const payment: any = await mpPayment.get({ id: Number(paymentId) });

    const status = (payment.status || "pending") as
      | "pending"
      | "approved"
      | "rejected"
      | "cancelled"
      | "in_process";

    const externalReference = payment.external_reference as string | undefined;
    if (!externalReference) {
      return NextResponse.json({ ignored: true, reason: "no external_reference" }, { status: 200 });
    }

    const parts = externalReference.split(":");
    const orderId = parts[2];
    if (!orderId) {
      return NextResponse.json({ ignored: true, reason: "no orderId" }, { status: 200 });
    }

    const order = await getOrder(orderId);
    if (!order) {
      console.warn("Webhook: ordem não encontrada:", orderId);
      return NextResponse.json({ ok: true, orderMissing: true }, { status: 200 });
    }

    if (order.status !== status) {
      await updateOrderStatus(orderId, { status });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("webhook error:", e?.message || e);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
