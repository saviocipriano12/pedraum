import { NextRequest, NextResponse } from "next/server";
import { auth as serverAuth, dbAdmin } from "@/lib/firebaseAdmin"; // <- aqui
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs"; // garante Node no Vercel

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "no token" }, { status: 401 });

    const decoded = await serverAuth.verifyIdToken(token);

    const meSnap = await dbAdmin.collection("usuarios").doc(decoded.uid).get();
    if (!meSnap.exists || meSnap.data()?.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { targetUid, ativo } = await req.json();
    if (!targetUid || typeof ativo !== "boolean") {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    const now = Timestamp.now();
    const userRef = dbAdmin.collection("usuarios").doc(targetUid);

    await userRef.set(
      {
        isPatrocinador: ativo,
        patrocinadorDesde: ativo ? now : meSnap.data()?.patrocinadorDesde || null,
        patrocinadorAte: ativo ? null : now,
      },
      { merge: true }
    );

    await dbAdmin.collection("patrocinadores").add({
      userId: targetUid,
      status: ativo ? "ativo" : "cancelado",
      plano: "mensal",
      dataInicio: ativo ? now : meSnap.data()?.patrocinadorDesde || now,
      dataFim: ativo ? null : now,
      renovacao: true,
      gateway: "manual-admin",
      gatewayRef: "",
      updatedAt: now,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 });
  }
}
