// =============================
// app/demandas/page.tsx (Listagem de Demandas - Responsivo, Profissional)
// =============================

"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import Link from "next/link";
import { Plus, HelpCircle, Loader2 } from "lucide-react";

interface Demanda {
  id: string;
  titulo: string;
  descricao?: string;
  categoria?: string;
  estado?: string;
  status?: string;
  createdAt?: any;
}

export default function DemandasPage() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDemandas();
  }, []);

  async function fetchDemandas() {
    setLoading(true);
    const q = query(collection(db, "demandas"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    setDemandas(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Demanda)));
    setLoading(false);
  }

  function formatDate(date: any) {
    if (!date?.toDate) return "-";
    const d = date.toDate();
    return d.toLocaleDateString();
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-2 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-blue-900 flex items-center gap-2">
          <HelpCircle size={30} className="text-orange-500" /> Demandas de Compra
        </h1>
        <Link href="/create-demanda" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white font-bold shadow hover:bg-orange-600 transition-all text-base">
          <Plus size={20} /> Nova Demanda
        </Link>
      </div>
      {loading ? (
        <div className="flex justify-center py-24 text-blue-800 animate-pulse">
          <Loader2 className="animate-spin mr-2" /> Carregando...
        </div>
      ) : demandas.length === 0 ? (
        <div className="text-center text-gray-500 py-20">Nenhuma demanda cadastrada ainda.</div>
      ) : (
        <div className="flex flex-col gap-6">
          {demandas.map((demanda) => (
            <div
              key={demanda.id}
              className="flex flex-col md:flex-row md:items-center bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl transition-all p-5 gap-4 md:gap-6"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-blue-50 rounded-xl text-blue-600 text-2xl shrink-0">
                <HelpCircle size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-lg md:text-xl text-blue-900 line-clamp-1">{demanda.titulo}</span>
                  {demanda.categoria && (
                    <span className="px-2 py-0.5 text-xs rounded bg-orange-50 text-orange-700 font-semibold ml-2">
                      {demanda.categoria}
                    </span>
                  )}
                </div>
                <p className="text-gray-700 line-clamp-2 mb-1 text-sm md:text-base">{demanda.descricao}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  {demanda.estado && <span className="font-medium text-blue-700">{demanda.estado}</span>}
                  <span>{formatDate(demanda.createdAt)}</span>
                  {demanda.status && (
                    <span className="bg-blue-50 text-blue-800 rounded px-2 py-0.5 font-semibold">{demanda.status}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 md:flex-col md:justify-center md:items-end">
                <Link
                  href={`/demandas/${demanda.id}`}
                  className="px-4 py-2 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-all text-sm shadow"
                >
                  Ver Detalhes
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
