// =============================
// app/edit-demanda/[id]/page.tsx (Editar Demanda - Moderno, Responsivo)
// =============================

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Loader2, ArrowLeft } from "lucide-react";

interface Demanda {
  id: string;
  titulo: string;
  descricao?: string;
  categoria?: string;
  estado?: string;
  status?: string;
}

export default function EditDemandaPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };

  const [demanda, setDemanda] = useState<Demanda | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    if (!demanda) return;
    setDemanda({ ...demanda, [e.target.name]: e.target.value });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!demanda) return;
    setSaving(true);
    const { titulo, descricao, categoria, estado, status } = demanda;
    await updateDoc(doc(db, "demandas", id), {
      titulo,
      descricao,
      categoria,
      estado,
      status
    });
    setSaving(false);
    router.push("/demandas");
  }

  if (loading) return <div className="flex justify-center items-center min-h-[300px] text-blue-700 animate-pulse"><Loader2 className="animate-spin mr-2" />Carregando...</div>;
  if (!demanda) return <div className="text-center text-red-600 py-12">Demanda não encontrada.</div>;

  return (
    <div className="max-w-lg mx-auto py-8 px-2 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 text-blue-700">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-2xl md:text-3xl font-extrabold text-blue-900">Editar Demanda</h1>
      </div>
      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-md px-3 sm:px-6 py-6 space-y-4">
        <div>
          <label className="block font-bold text-blue-800 mb-1">Título da Demanda</label>
          <input
            name="titulo"
            value={demanda.titulo}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-lg focus:ring-2 focus:ring-blue-300 outline-none"
            required
          />
        </div>
        <div>
          <label className="block font-bold text-blue-800 mb-1">Descrição</label>
          <textarea
            name="descricao"
            value={demanda.descricao ?? ""}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 min-h-[80px] focus:ring-2 focus:ring-blue-100 outline-none"
            required
          />
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-4">
          <div className="flex-1">
            <label className="block font-bold text-blue-800 mb-1">Categoria</label>
            <input
              name="categoria"
              value={demanda.categoria ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block font-bold text-blue-800 mb-1">Estado (UF)</label>
            <input
              name="estado"
              value={demanda.estado ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
              required
            />
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-4">
          <div className="flex-1">
            <label className="block font-bold text-blue-800 mb-1">Status</label>
            <select
              name="status"
              value={demanda.status ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-100 outline-none"
              required
            >
              <option value="Aberta">Aberta</option>
              <option value="Finalizada">Finalizada</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-orange-500 text-white font-extrabold hover:bg-orange-600 transition-all shadow disabled:opacity-70 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="animate-spin inline-block mr-2" /> : null}
            Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  );
}
