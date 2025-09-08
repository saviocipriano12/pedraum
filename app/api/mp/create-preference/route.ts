// app/api/mp/create-preference/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fail-fast de env com fallback seguro para BASE_URL
function reqEnv(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`ENV ausente: ${name}`);
  return v;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    // ENVs
    const MP_ACCESS_TOKEN = reqEnv("MP_ACCESS_TOKEN");
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://pedraum.com.br";

    const BACK_SUCCESS = process.env.MP_BACKURL_SUCCESS ?? `${BASE_URL}/checkout/sucesso`;
    const BACK_FAILURE = process.env.MP_BACKURL_FAILURE ?? `${BASE_URL}/checkout/falhou`;
    const BACK_PENDING = process.env.MP_BACKURL_PENDING ?? `${BASE_URL}/checkout/pendente`;
    const NOTIFICATION_URL = `${BASE_URL}/api/mp/webhook`;

    // Body
    const { userId, leadId, title, unit_price, demandaId, quantity } = await req.json();
    const price = Number(unit_price);
    const qty = Number(quantity ?? 1);

    if (!price || Number.isNaN(price) || price <= 0) {
      throw new Error(`unit_price inválido: ${unit_price}`);
    }
    if (!qty || Number.isNaN(qty) || qty <= 0) {
      throw new Error(`quantity inválido: ${quantity}`);
    }

    // SDK (dentro do handler garante env carregada)
    const mp = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
    const preference = new Preference(mp);

    // Idempotência p/ evitar problemas de clique duplo
    const idempotencyKey = `${demandaId ?? "d"}-${leadId ?? "l"}-${userId ?? "u"}-${Date.now()}`;

    const resp = await preference.create({
      body: {
        items: [
          {
            id: String(leadId ?? "lead"),
            title: String(title ?? "Pagamento Pedraum"),
            quantity: qty,
            currency_id: "BRL",
            unit_price: price,
          },
        ],
        back_urls: {
          success: BACK_SUCCESS,
          failure: BACK_FAILURE,
          pending: BACK_PENDING,
        },
        notification_url: NOTIFICATION_URL,
        auto_return: "approved",
        statement_descriptor: "PEDRAUM",
        external_reference: JSON.stringify({ userId, leadId, demandaId }),
        metadata: { userId, leadId, demandaId, env: "production" },
      },
      requestOptions: { idempotencyKey },
    });

    return NextResponse.json(
      {
        ok: true,
        pref_id: resp?.id,
        init_point: resp?.init_point,
        sandbox_init_point: resp?.sandbox_init_point,
        took_ms: Date.now() - startedAt,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("create-preference FAILED", {
      msg: e?.message,
      name: e?.name,
      cause: e?.cause,
      stack: e?.stack,
    });
    return NextResponse.json(
      { ok: false, error: "create_preference_failed", message: e?.message ?? "unknown" },
      { status: 500 }
    );
  }
}
