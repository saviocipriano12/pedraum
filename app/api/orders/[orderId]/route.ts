// app/api/orders/[orderId]/route.ts
import { NextResponse } from "next/server";
import { getOrder } from "@/lib/orders";

export async function GET(
  _req: Request,
  { params }: { params: { orderId: string } }
) {
  const order = await getOrder(params.orderId);
  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(order);
}
