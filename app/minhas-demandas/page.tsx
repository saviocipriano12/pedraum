// =============================
// app/minhas-demandas/page.tsx (Minhas Demandas - Painel do Usuário)
// =============================
"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/firebaseConfig";
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore";
import Link from "next/link";
import { Edit, Trash2, Eye, Loader2, Lightbulb, MessageCircle } from "lucide-react";

interface Demanda {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  status?: string;
  createdAt?: any;
}

export default function MinhasDemandasPage() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) fetchDemandas(u.uid);
    });
    return () => unsubscribe();
    // eslint-disable-next-line
  }, []);

  async function fetchDemandas(uid: string) {
    setLoading(true);
    const q = query(
      collection(db, "demandas"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    const list: Demanda[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Demanda);
    });
    setDemandas(list);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (window.confirm("Tem certeza que deseja excluir esta demanda?")) {
      setDeleting(id);
      await deleteDoc(doc(db, "demandas", id));
      await fetchDemandas(user.uid);
      setDeleting(null);
    }
  }

  return (
    <main className="max-w-3xl mx-auto py-10 px-2 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-blue-900 flex items-center gap-2">
          <Lightbulb size={26} className="text-orange-500" /> Minhas Demandas
        </h1>
        <Link
          href="/create-demanda"
          className="px-5 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 shadow-md transition flex gap-2 items-center"
        >
          <Lightbulb size={18} /> Nova Demanda
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[200px] text-blue-700 animate-pulse">
          <Loader2 className="animate-spin mr-2" />Carregando demandas...
        </div>
      ) : demandas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          Nenhuma demanda publicada ainda.<br />
          <Link href="/create-demanda" className="text-orange-600 font-bold underline hover:text-orange-800">Publique sua primeira demanda</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {demandas.map((demanda) => (
            <div
              key={demanda.id}
              className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:shadow-xl transition group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb size={20} className="text-orange-500" />
                  <div className="text-lg font-bold text-blue-900 truncate">
                    {demanda.titulo || demanda.categoria}
                  </div>
                </div>
                <div className="text-gray-600 text-sm mb-2 line-clamp-2">
                  {demanda.descricao}
                </div>
                {demanda.status && (
                  <div className="inline-block px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 font-semibold">
                    {demanda.status}
                  </div>
                )}
              </div>
              <div className="flex gap-2 items-center justify-end sm:justify-start">
                <Link
                  href={`/edit-demanda/${demanda.id}`}
                  className="px-3 py-1 rounded-xl bg-blue-100 text-blue-800 text-xs font-bold hover:bg-blue-200 flex gap-1 items-center"
                >
                  <Edit size={16} /> Editar
                </Link>
                <button
                  onClick={() => handleDelete(demanda.id)}
                  disabled={deleting === demanda.id}
                  className={`px-3 py-1 rounded-xl bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 flex gap-1 items-center transition ${deleting === demanda.id ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <Trash2 size={16} />
                </button>
                <Link
                  href={`/demandas/${demanda.id}`}
                  className="px-3 py-1 rounded-xl bg-orange-50 text-orange-700 text-xs font-bold hover:bg-orange-100 flex gap-1 items-center"
                >
                  <Eye size={16} /> Ver
                </Link>
                <Link
                  href={`/propostas-recebidas?demandaId=${demanda.id}`}
                  className="px-3 py-1 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold hover:bg-blue-100 flex gap-1 items-center"
                >
                  <MessageCircle size={16} /> Propostas
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
