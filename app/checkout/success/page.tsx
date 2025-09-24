"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db, auth } from "@/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";

export default function SuccessPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState("Verificando pagamento...");

  useEffect(() => {
    (async () => {
      try {
        // MP envia payment_id, status, preference_id etc. via query
        const payment_id = sp.get("payment_id");
        if (!payment_id) throw new Error("payment_id ausente");

        // confirma no backend (sem Admin)
        const r = await fetch(`/api/mercadopago/payment-status?payment_id=${payment_id}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "falha ao verificar");

        if (j.status !== "approved") {
          setMsg(`Pagamento ${j.status}. Aguarde confirmação.`);
          return;
        }

        // extrai do external_reference: kind:refId:assignmentId:supplierId
        const parts = (j.external_reference || "").split(":");
        const assignmentId = parts[2];
        const supplierId = parts[3];

        // garante que o usuário atual é o dono da assignment
        const u = auth.currentUser;
        if (!u || u.uid !== supplierId) {
          setMsg("Sessão inválida. Faça login novamente.");
          return;
        }

        // desbloqueia no cliente (sem Admin)
        await updateDoc(doc(db, "demandAssignments", assignmentId), {
          status: "unlocked",
        });

        setMsg("Pagamento aprovado e contato desbloqueado! Redirecionando...");
        setTimeout(() => router.push("/dashboard/oportunidades"), 1200);
      } catch (e: any) {
        console.error(e);
        setMsg(e?.message || "Erro ao processar o pagamento.");
      }
    })();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Sucesso</h1>
      <p style={{ marginTop: 12 }}>{msg}</p>
    </main>
  );
}
