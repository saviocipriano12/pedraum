"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { ClipboardList, Loader2, AlertTriangle } from "lucide-react";
import { withRoleProtection } from "@/utils/withRoleProtection";

function EditarDemandaAdmin() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [userId, setUserId] = useState("");
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [status, setStatus] = useState("ativa");

  useEffect(() => {
    buscarDemanda();
    // eslint-disable-next-line
  }, [id]);

  async function buscarDemanda() {
    setCarregando(true);
    setErro("");
    try {
      const docRef = doc(db, "demandas", id);
      const dSnap = await getDoc(docRef);
      if (!dSnap.exists()) {
        setErro("Demanda não encontrada!");
        return;
      }
      const d: any = dSnap.data();
      setTitulo(d.titulo || "");
      setCategoria(d.categoria || "");
      setDescricao(d.descricao || "");
      setUserId(d.userId || "");
      setNomeUsuario(d.nomeUsuario || "");
      setStatus(d.status || "ativa");
    } catch (err: any) {
      setErro("Erro ao buscar demanda: " + (err.message || err));
    } finally {
      setCarregando(false);
    }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      await updateDoc(doc(db, "demandas", id), {
        titulo,
        categoria,
        descricao,
        userId,
        nomeUsuario,
        status,
      });
      router.push("/admin/demandas");
    } catch (err: any) {
      setErro("Erro ao salvar: " + (err.message || err));
    } finally {
      setSalvando(false);
    }
  }

  // Estilo premium dos inputs
  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-[#e6e8eb] focus:border-[#FB8500] focus:ring-2 focus:ring-[#FB850022] transition outline-none text-base bg-[#f9fafb] placeholder-gray-400";

  if (carregando) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f6f9fa]">
        <div className="bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-2">
          <Loader2 size={32} className="animate-spin text-[#FB8500]" />
          <span className="mt-2 text-lg font-medium text-[#023047]">Carregando demanda...</span>
        </div>
      </main>
    );
  }

  if (erro) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f6f9fa]">
        <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-3">
          <AlertTriangle size={40} className="text-red-500" />
          <span className="text-red-700 text-lg font-semibold">{erro}</span>
          <Link
            href="/admin/demandas"
            className="mt-3 bg-[#FB8500] text-white px-6 py-2 rounded-full font-semibold hover:bg-[#ff9800] transition"
          >
            Voltar para demandas
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f9fa] flex flex-col items-center py-10 px-2">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl px-6 py-10 md:px-10 md:py-12">
        <div className="flex items-center gap-3 mb-8">
          <ClipboardList size={36} className="text-[#FB8500]" />
          <h1 className="text-2xl md:text-3xl font-bold text-[#023047]">
            Editar Demanda
          </h1>
        </div>
        <form onSubmit={handleSalvar} className="space-y-6">
          <div>
            <label className="block font-semibold text-[#023047] mb-1" htmlFor="titulo">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              id="titulo"
              type="text"
              required
              className={inputClass}
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Preciso de britador móvel em MG"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#023047] mb-1" htmlFor="categoria">
              Categoria <span className="text-red-500">*</span>
            </label>
            <input
              id="categoria"
              type="text"
              required
              className={inputClass}
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              placeholder="Ex: Britador, Peças, Serviço Técnico"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#023047] mb-1" htmlFor="descricao">
              Descrição <span className="text-red-500">*</span>
            </label>
            <textarea
              id="descricao"
              required
              className={inputClass + " min-h-[90px] resize-vertical"}
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descreva detalhadamente a demanda"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#023047] mb-1" htmlFor="userId">
                ID do Criador (userId)
              </label>
              <input
                id="userId"
                type="text"
                className={inputClass}
                value={userId}
                onChange={e => setUserId(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#023047] mb-1" htmlFor="nomeUsuario">
                Nome do Criador
              </label>
              <input
                id="nomeUsuario"
                type="text"
                className={inputClass}
                value={nomeUsuario}
                onChange={e => setNomeUsuario(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-[#023047] mb-1" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              className={inputClass}
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="ativa">Ativa</option>
              <option value="inativa">Inativa</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <button
              type="submit"
              disabled={salvando}
              className="bg-[#FB8500] text-white px-8 py-3 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-[#ff9800] transition disabled:opacity-60"
            >
              {salvando && <Loader2 className="animate-spin" size={20} />}
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <Link
              href="/admin/demandas"
              className="bg-gray-200 text-gray-700 px-8 py-3 rounded-full font-bold hover:bg-gray-300 transition flex items-center justify-center"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

export default withRoleProtection(EditarDemandaAdmin, { allowed: ["admin"] });
