import { NextResponse } from "next/server";
import { db } from "@/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";

// Suas credenciais fixas (igual no create-payments)
const accessToken = "APP_USR-1225380117007706-062313-a9a9bd76d4128ac10d0e97cb79933222-150213449";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Webhook Mercado Pago recebido:", body);

    // Checagem básica: tipo de notificação e ID do pagamento
    if (
      (body.type === "payment" || body.topic === "payment") &&
      body.data && body.data.id
    ) {
      const paymentId = body.data.id;

      // Consulta o status real do pagamento na API do Mercado Pago
      const paymentRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const paymentData = await paymentRes.json();

      console.log("Status do pagamento:", paymentData.status);

      // Se está aprovado, tenta atualizar o lead
      if (paymentData.status === "approved" && paymentData.external_reference) {
        // external_reference = leadId salvo lá atrás
        const leadRef = doc(db, "leads", paymentData.external_reference);
        await updateDoc(leadRef, {
          statusPagamento: "pago",
        });
        console.log("Status do lead atualizado para 'pago'");
      }
    }

    // Sempre responda 200 OK para evitar reenvio de notificações pelo Mercado Pago
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erro no webhook do Mercado Pago:", error);
    // Retorne 200 mesmo em erro para evitar flood de webhooks
    return NextResponse.json({ error: "Erro no webhook" });
  }
}

// Responde a GET também (MP pode testar url)
export async function GET() {
  return NextResponse.json({ message: "Webhook ativo." });
}
