export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/server/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json();
    if (!uid) return NextResponse.json({ error: "uid obrigatório" }, { status: 400 });
    await adminAuth.revokeRefreshTokens(uid);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro ao revogar tokens" }, { status: 500 });
  }
}
