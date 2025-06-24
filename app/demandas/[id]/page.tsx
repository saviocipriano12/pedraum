// =============================
// app/demandas/[id]/page.tsx (Detalhe da Demanda - Moderno, Responsivo)
// =============================

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, HelpCircle, Loader2 } from "lucide-react";

interface Demanda {
  id: string;
  titulo: string;
  descricao?: string;
  categoria?: string;
  estado?: string;
  status?: string;
  createdAt?: any;
}

export default function DemandaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params as { id: string };
  const [demanda, setDemanda] = useState<Demanda | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDemanda();
    // eslint-disable-next-line
  }, [id]);

  async function fetchDemanda() {
    setLoading(true);
    const ref = doc(db, "demandas", id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setDemanda({ id, ...snap.data() } as Demanda);
    } else {
      setDemanda(null);
    }
    setLoading(false);
  }

  function formatDate(date: any) {
    if (!date?.toDate) return "-";
    const d = date.toDate();
    return d.toLocaleDateString();
  }

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-[300px] text-blue-700 animate-pulse">
        <Loader2 className="animate-spin mr-2" />
        Carregando...
      </div>
    );
  if (!demanda)
    return (
      <div className="text-center text-red-600 py-12">Demanda não encontrada.</div>
    );

  return (
    <div className="max-w-2xl mx-auto py-9 px-2 sm:px-6">
      <div className="mb-7 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-gray-100 text-blue-700"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-2xl md:text-3xl font-extrabold text-blue-900 flex items-center gap-2">
          <HelpCircle size={28} className="text-orange-500" /> Detalhes da Demanda
        </h1>
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 flex flex-col gap-3">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-bold text-xl md:text-2xl text-blue-900 flex-1 truncate">
            {demanda.titulo}
          </span>
          {demanda.categoria && (
            <span className="px-2 py-0.5 text-xs rounded bg-orange-50 text-orange-700 font-semibold">
              {demanda.categoria}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mb-1">
          {demanda.estado && (
            <span className="bg-blue-50 text-blue-800 font-bold rounded px-2 py-0.5">
              UF: {demanda.estado}
            </span>
          )}
          {demanda.status && (
            <span className="bg-orange-50 text-orange-700 font-bold rounded px-2 py-0.5">
              {demanda.status}
            </span>
          )}
          <span className="text-gray-400 text-xs pt-1">
            {formatDate(demanda.createdAt)}
          </span>
        </div>
        <p className="text-gray-700 whitespace-pre-line text-base md:text-lg mt-2">
          {demanda.descricao}
        </p>
        {/* Adicione aqui botões ou informações extras se quiser */}
      </div>
    </div>
  );
}
