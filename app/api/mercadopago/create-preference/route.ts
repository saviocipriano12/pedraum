import { NextRequest, NextResponse } from "next/server";
import { mp } from "@/lib/mercadopago";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      id = "item-001",
      title = "Produto ou Lead",
      quantity = 1,
      currency_id = "BRL",

      // <- preço vindo do front em CENTAVOS (preferido)
      unitPriceCents,
      // (fallback) se alguém mandar em reais:
      unit_price: unitPriceReais,

      // opcionais para rastrear no retorno
      kind = "lead",
      refId,
      metadata,
    } = body;

    // converte para reais (o MP espera número em reais)
    const priceCents =
      typeof unitPriceCents === "number"
        ? Math.round(unitPriceCents)
        : Math.round(Number(unitPriceReais ?? 0) * 100);

    if (!title || !priceCents || priceCents <= 0) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    const unit_price = Number((priceCents / 100).toFixed(2));

    const pref = await mp.preference.create({
      body: {
        items: [
          { id, title, quantity, currency_id, unit_price },
        ],
        back_urls: {
          success: `${process.env.BASE_URL}/checkout/success`,
          failure: `${process.env.BASE_URL}/checkout/failure`,
          pending: `${process.env.BASE_URL}/checkout/pending`,
        },
        auto_return: "approved",
        binary_mode: true,
        external_reference: [kind, refId].filter(Boolean).join(":"), // opcional
        metadata: { ...metadata, priceCents, kind, refId },
      },
    });

    return NextResponse.json({
      preferenceId: pref.id,
      init_point: pref.init_point,
      sandbox_init_point: pref.sandbox_init_point,
    });
  } catch (e: any) {
    console.error("create-preference error:", e?.message || e);
    return NextResponse.json(
      { error: "Falha ao criar preferência.", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
