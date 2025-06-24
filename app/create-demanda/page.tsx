// =============================
// app/create-demanda/page.tsx (Cadastro de Demanda - Moderno, Responsivo)
// =============================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, ArrowLeft } from "lucide-react";

export default function CreateDemandaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    categoria: "",
    estado: "",
    status: "Aberta"
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await addDoc(collection(db, "demandas"), {
      ...form,
      createdAt: serverTimestamp()
    });
    setLoading(false);
    router.push("/demandas");
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-2 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 text-blue-700">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-2xl md:text-3xl font-extrabold text-blue-900">Cadastrar Demanda</h1>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md px-3 sm:px-6 py-6 space-y-4">
        <div>
          <label className="block font-bold text-blue-800 mb-1">Título da Demanda</label>
          <input
            name="titulo"
            value={form.titulo}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-lg focus:ring-2 focus:ring-blue-300 outline-none"
            required
          />
        </div>
        <div>
          <label className="block font-bold text-blue-800 mb-1">Descrição</label>
          <textarea
            name="descricao"
            value={form.descricao}
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
              value={form.categoria}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block font-bold text-blue-800 mb-1">Estado (UF)</label>
            <input
              name="estado"
              value={form.estado}
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
              value={form.status}
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
          <button type="submit" disabled={loading} className="px-5 py-2 rounded-xl bg-orange-500 text-white font-extrabold hover:bg-orange-600 transition-all shadow disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="animate-spin inline-block mr-2" /> : null}
            Cadastrar Demanda
          </button>
        </div>
      </form>
    </div>
  );
}
