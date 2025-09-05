import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

export async function POST(req: NextRequest) {
  try {
    // 1) Checa envs obrigatórias
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: "MP_ACCESS_TOKEN ausente" }, { status: 500 });
    }

    // 2) Resolve BASE (produção ou fallback pelo host)
    const baseFromHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const baseProto = (req.headers.get("x-forwarded-proto") || "https") + "://";
    const BASE =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.APP_BASE_URL ||
      (baseFromHost ? `${baseProto}${baseFromHost}` : "");

    if (!BASE) {
      return NextResponse.json({ error: "BASE_URL indefinida" }, { status: 500 });
    }

    // 3) Back URLs (usa envs se tiver; senão cria padrão)
    const back_success = process.env.MP_BACKURL_SUCCESS || `${BASE}/checkout/sucesso`;
    const back_failure = process.env.MP_BACKURL_FAILURE || `${BASE}/checkout/erro`;
    const back_pending = process.env.MP_BACKURL_PENDING || `${BASE}/checkout/pendente`;

    // 4) Webhook absoluto
    const notificationUrl = `${BASE}/api/mp/webhook`;

    // 5) Lê body e valida campos mínimos
    const { userId, leadId, title, unit_price, demandaId } = await req.json();
    if (!leadId || !title || typeof unit_price === "undefined") {
      return NextResponse.json({ error: "payload_incompleto" }, { status: 400 });
    }

    // 6) Cria preferência
    const mp = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(mp);

    const body: any = {
      items: [
        {
          id: String(leadId),
          title: String(title),
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number(unit_price),
        },
      ],
      back_urls: { success: back_success, failure: back_failure, pending: back_pending },
      auto_return: "approved",
      external_reference: JSON.stringify({ userId, leadId, demandaId }),
      notification_url: notificationUrl,
    };

    const resp = await preference.create({ body });

    return NextResponse.json({
      preferenceId: resp.id,
      init_point: resp.init_point, // em produção use este
    });
  } catch (e: any) {
    console.error("create-preference error:", e?.message || e);
    return NextResponse.json({ error: "create_preference_failed" }, { status: 500 });
  }
}
