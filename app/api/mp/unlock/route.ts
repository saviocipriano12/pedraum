// app/api/mp/unlock/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/firebaseConfig"; // só para tipos; não use auth no server
import { db } from "@/firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { demandId, userId } = await req.json();
    if (!demandId || !userId) {
      return NextResponse.json({ ok: false, error: "demandId e userId obrigatórios" }, { status: 400 });
    }

    // Marca assignment como unlocked e cria subdoc de acesso
    const aRef = doc(db, "demandAssignments", `${demandId}_${userId}`);
    await setDoc(
      aRef,
      {
        demandId,
        supplierId: userId,
        status: "unlocked",
        unlockedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        source: "redirect-fallback",
      },
      { merge: true }
    );
    const accessRef = doc(db, "demandas", demandId, "acessos", userId);
    await setDoc(accessRef, { unlockedAt: serverTimestamp(), source: "redirect-fallback" }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("unlock fallback error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "erro unlock" }, { status: 400 });
  }
}
