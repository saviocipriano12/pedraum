export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
  options: { timeout: 10000 },
});

export async function POST(req: NextRequest) {
  try {
    const {
      title,
      unit_price,
      quantity = 1,
      userId,
      kind,          // "lead" | "plano" | "produto"
      resourceId,    // demandaId | planoId | produtoId
      payerEmail,
      backUrlSuccess,
      backUrlFailure,
      backUrlPending,
    } = await req.json();

    if (!title || !unit_price || !userId || !kind) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const notificationUrl = `${process.env.APP_BASE_URL}/api/mp/webhook`;

    const preference = new Preference(client);
    const pref = await preference.create({
  body: {
    items: [
      {
        id: resourceId,                  // 👈 adicionado
        title,
        unit_price: Number(unit_price),
        quantity: Number(quantity || 1),
        currency_id: "BRL",
      },
    ],
        payer: payerEmail ? { email: payerEmail } : undefined,
        metadata: { kind, userId, resourceId },
        external_reference: `${kind}:${resourceId}:${userId}`,
        back_urls: {
          success: backUrlSuccess || `${process.env.APP_BASE_URL}/pagamento/sucesso`,
          failure: backUrlFailure || `${process.env.APP_BASE_URL}/pagamento/erro`,
          pending: backUrlPending || `${process.env.APP_BASE_URL}/pagamento/pendente`,
        },
        auto_return: "approved",
        binary_mode: true,
        notification_url: notificationUrl,
        statement_descriptor: "PEDRAUM",
      },
    });

    return NextResponse.json({
      id: pref.id,
      init_point: (pref as any).init_point,
      sandbox_init_point: (pref as any).sandbox_init_point,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Falha ao criar preferência" }, { status: 500 });
  }
}
