// app/api/admin-reset-senha/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/server/firebaseAdmiN";


export async function POST(req: NextRequest) {
  try {
    const { uid, senha } = await req.json();
    if (!uid || !senha) return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    await adminAuth.updateUser(uid, { password: senha });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro ao redefinir senha" }, { status: 500 });
  }
}
