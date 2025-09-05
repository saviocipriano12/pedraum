// app/api/mp/create-preference/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
const preference = new Preference(mp);

export async function POST(req: NextRequest) {
  try {
    const { userId, leadId, title, unit_price, demandaId } = await req.json();

    const body: any = {
      items: [
        {
          id: String(leadId),            // <- acrescenta o id para satisfazer o tipo 'Items'
          title: String(title),
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number(unit_price),
        },
      ],
      back_urls: {
        success: process.env.MP_BACKURL_SUCCESS!,
        failure: process.env.MP_BACKURL_FAILURE!,
        pending: process.env.MP_BACKURL_PENDING!,
      },
      auto_return: "approved",
      external_reference: JSON.stringify({ userId, leadId, demandaId }),
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mp/webhook`,
    };

    const resp = await preference.create({ body });
    return NextResponse.json({
      preferenceId: resp.id,
      init_point: resp.init_point,
    });
  } catch (e) {
    console.error("create-preference error", e);
    return NextResponse.json({ error: "create_preference_failed" }, { status: 500 });
  }
}
