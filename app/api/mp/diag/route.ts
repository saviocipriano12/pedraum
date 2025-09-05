// app/api/mp/diag/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    mp: !!process.env.MP_ACCESS_TOKEN ? "ok" : "ausente",
    base_url: process.env.NEXT_PUBLIC_BASE_URL ?? null,
    success: process.env.MP_BACKURL_SUCCESS ?? null,
    failure: process.env.MP_BACKURL_FAILURE ?? null,
    pending: process.env.MP_BACKURL_PENDING ?? null,
    node: process.version,
    now: new Date().toISOString(),
  });
}
