// app/api/mp/create-preference/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Utilitário: falha cedo e com mensagem clara no log */
function reqEnv(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`ENV ausente: ${name}`);
  return v;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    // ==== ENVs (com fallbacks seguros) ====
    const MP_ACCESS_TOKEN = reqEnv("MP_ACCESS_TOKEN");
    // Você usa NEXT_PUBLIC_BASE_URL; deixei fallback para o domínio oficial
    const BASE_URL = reqEnv("NEXT_PUBLIC_BASE_URL", "https://pedraum.com.br");

    const MP_BACKURL_SUCCESS = process.env.MP_BACKURL_SUCCESS ?? `${BASE_URL}/checkout/sucesso`;
    const MP_BACKURL_FAILURE = process.env.MP_BACKURL_FAILURE ?? `${BASE_URL}/checkout/falhou`;
    const MP_BACKURL_PENDING = process.env.MP_BACKURL_PENDING ?? `${BASE_URL}/checkout/pendente`;

    // ==== Body ====
    const { userId, leadId, title, unit_price, demandaId } = await req.json();

    const price = Number(unit_price);
    if (!price || price <= 0 || Number.isNaN(price)) {
      throw new Error(`unit_price inválido: ${unit_price}`);
    }

    // Instanciar o SDK *dentro* do handler garante ENV presente em runtime
    const mp = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
    const preference = new Preference(mp);

    const body: any = {
      items: [
        {
          id: String(leadId ?? "lead"),
          title: String(title ?? "Pagamento Pedraum"),
          quantity: 1,
          currency_id: "BRL",
          unit_price: price,
        },
      ],
      back_urls: {
        success: MP_BACKURL_SUCCESS,
        failure: MP_BACKURL_FAILURE,
        pending: MP_BACKURL_PENDING,
      },
      auto_return: "approved",
      external_reference: JSON.stringify({ userId, leadId, demandaId }),
      // Garanta URL absoluta e https
      notification_url: `${BASE_URL}/api/mp/webhook`,
      // Evita erro em cliques repetidos
      metadata: { userId, leadId, demandaId, env: "production" },
    };

    // Idempotency opcional; ajuda em produção
    const idempotencyKey = `${demandaId ?? "d"}-${leadId ?? "l"}-${userId ?? "u"}-${Date.now()}`;

    const resp = await preference.create({ body, requestOptions: { idempotencyKey } });

    return NextResponse.json(
      {
        ok: true,
        preferenceId: resp.id,
        init_point: resp.init_point,
        sandbox_init_point: resp.sandbox_init_point,
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
