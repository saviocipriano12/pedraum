export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { db } from "@/firebaseConfig";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
  options: { timeout: 10000 },
});

// Opcional: MP pode bater com GET em alguns casos
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const paymentId =
      body?.data?.id || body?.id || body?.resource?.split?.("/")?.pop?.();

    if (!paymentId) return NextResponse.json({ ok: true });

    const paymentClient = new Payment(client);
    const payment = await paymentClient.get({ id: String(paymentId) });

    const status = payment.status; // approved | pending | rejected | in_process
    const md = (payment.metadata || {}) as any;
    const externalRef = payment.external_reference || "";

    const kind = md.kind || externalRef.split(":")[0];
    const resourceId = md.resourceId || externalRef.split(":")[1];
    const userId = md.userId || externalRef.split(":")[2];

    // Só tratamos quando aprovado
    if (status === "approved") {
      if (kind === "lead") {
        // Concede acesso ao contato da demanda comprada
        await setDoc(
          doc(db, "leadsComprados", `${userId}_${resourceId}_${paymentId}`),
          {
            userId,
            demandaId: resourceId,
            paymentId,
            status,
            valor: payment.transaction_amount,
            createdAt: serverTimestamp(),
          }
        );

        // Marca acesso para esse usuário dentro da demanda
        await updateDoc(doc(db, "demandas", resourceId), {
          [`acessos.${userId}`]: true,
          atualizadoEm: serverTimestamp(),
        });
      }

      if (kind === "plano") {
        // Ativa/renova patrocinador por 30 dias no DOC de "usuarios"
        const ate = new Date();
        ate.setDate(ate.getDate() + 30);
        await updateDoc(doc(db, "usuarios", userId), {
          plano: "patrocinador",
          planoExpiraEm: ate.toISOString(),
          atualizadoEm: serverTimestamp(),
        });
      }

      if (kind === "produto") {
        await setDoc(doc(db, "pedidos", String(paymentId)), {
          userId,
          produtoId: resourceId,
          status,
          valor: payment.transaction_amount,
          createdAt: serverTimestamp(),
        });
      }
    }

    // Log bruto (útil p/ auditoria)
    await setDoc(doc(db, "mpPagamentos", String(paymentId)), {
      raw: payment,
      processedAt: serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Webhook error", e);
    // MP espera 200 em muitos casos; não retrigar excessivamente
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
