// app/api/mp/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { getAdmin } from "@/lib/firebaseAdmin";

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
const paymentAPI = new Payment(mp);

export async function POST(req: NextRequest) {
  try {
    const { db } = getAdmin();                 // <- pega o db aqui

    const payload = await req.json();          // { type, data: { id } }
    if (payload.type !== "payment" || !payload.data?.id) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const p = await paymentAPI.get({ id: String(payload.data.id) });
    const payment: any = p;
    const ref = JSON.parse(payment.external_reference || "{}");
    const { userId, leadId, demandaId } = ref;

    if (payment.status === "approved" && userId && leadId) {
      await db.collection("leadsPurchases").doc(String(payment.id)).set({
        paymentId: payment.id,
        status: payment.status,
        amount: payment.transaction_amount,
        userId,
        leadId,
        demandaId: demandaId || null,
        createdAt: new Date(),
      });

      const key = `${leadId}_${userId}`;
      await db.collection("demandAssignments").doc(key).set(
        {
          leadId,
          userId,
          demandaId: demandaId || null,
          hasAccess: true,
          source: "mercado_pago",
          paymentId: payment.id,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      if (demandaId) {
        await db.collection("demandas").doc(demandaId).set(
          {
            compradores: { [userId]: true },
            updatedAt: new Date(),
          },
          { merge: true }
        );
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("mp webhook error", e);
    return NextResponse.json({ error: "webhook_error" }, { status: 500 });
  }
}
