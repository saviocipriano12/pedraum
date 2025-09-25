// app/api/orders/[orderId]/route.ts
import { NextResponse } from "next/server";
import { getOrder } from "@/lib/orders";

export async function GET(req: Request) {
  // extrai o último segmento da rota: .../orders/[orderId]
  const { pathname } = new URL(req.url);
  const orderId = pathname.split("/").pop() || "";

  if (!orderId) {
    return NextResponse.json({ error: "missing_orderId" }, { status: 400 });
  }

  const order = await getOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(order);
}
