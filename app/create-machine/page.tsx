// =============================
// app/admin/create-machine/page.tsx
// LAYOUT PREMIUM E 100% RESPONSIVO
// =============================

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { db, auth } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import ImageUploader from "@/components/ImageUploader";
import {
  Loader2, Save, Tag, DollarSign, Layers, Calendar, MapPin, BookOpen
} from "lucide-react";

const categorias = [
  "Pá Carregadeira", "Britador", "Escavadeira", "Guindaste",
  "Transportadora", "Planta Móvel", "Outros"
];
const condicoes = ["Nova", "Seminova", "Usada"];
const estados = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export default function CreateMachinePage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm();
  const [imagens, setImagens] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (data: any) => {
    setError(null);
    setSuccess(null);

    if (!imagens.length) {
      setError("Envie pelo menos uma imagem da máquina.");
      return;
    }

    // Verifica se o usuário está logado
    const user = auth.currentUser;
    if (!user) {
      setError("Você precisa estar logado para cadastrar uma máquina.");
      return;
    }

    try {
      await addDoc(collection(db, "machines"), {
        nome: data.nome,
        preco: data.preco,
        descricao: data.descricao,
        categoria: data.categoria,
        ano: data.ano,
        condicao: data.condicao,
        estado: data.estado,
        imagens,
        createdAt: serverTimestamp(),
        userId: user.uid,
      });
      setSuccess("Máquina cadastrada com sucesso!");
      reset();
      setImagens([]);
      setTimeout(() => {
        router.push("/machines");
      }, 1200);
    } catch (e) {
      setError("Erro ao salvar máquina. Tente novamente.");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#e0e7ef] flex flex-col items-center py-8 px-2 sm:px-4">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl p-4 sm:p-7 md:p-10 lg:p-14 grid grid-cols-1 md:grid-cols-2 gap-7 md:gap-14 animate-fade-in">
        {/* Galeria de imagens e dicas */}
        <section className="flex flex-col gap-8">
          <h2 className="text-lg sm:text-xl font-bold text-[#023047] mb-2 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" /> Imagens da Máquina
          </h2>
          <div
            className="w-full flex flex-col gap-2 items-stretch rounded-2xl bg-[#f3f6fa] border border-gray-200 p-4 md:p-6 lg:p-8 shadow-sm"
            style={{ minHeight: 180, maxWidth: 460 }}
          >
            <ImageUploader imagens={imagens} setImagens={setImagens} max={5} />
            <p className="text-xs text-gray-500 mt-2 text-center">
              Adicione até 5 imagens reais, mostrando ângulos diferentes e detalhes importantes.
            </p>
          </div>
          <div className="bg-[#f7f7fa] border-l-4 border-blue-600 rounded-lg p-4 text-xs text-[#023047] shadow-sm">
            <b>Dicas para vender mais rápido:</b>
            <ul className="list-disc ml-5 mt-1 space-y-0.5">
              <li>Use fotos reais e de boa qualidade</li>
              <li>Informe o máximo de detalhes técnicos e estado</li>
              <li>Responda dúvidas rapidamente após o anúncio</li>
              <li>Anuncie preço justo e competitivo</li>
            </ul>
          </div>
        </section>
        {/* Formulário */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 flex flex-col justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#023047] mb-4 flex items-center gap-3">
              <Tag className="w-6 h-6 text-orange-500" /> Cadastrar Nova Máquina
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-[#023047] block mb-1 flex gap-1 items-center"><Tag size={15}/> Nome *</label>
                <input
                  type="text"
                  {...register("nome", { required: "O nome é obrigatório." })}
                  className={`w-full border rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 ${errors.nome ? "border-red-400" : "border-gray-300"}`}
                  placeholder="Ex: Pá carregadeira CAT 914G, Britador 90x60, etc."
                  autoFocus
                />
                {errors.nome && <span className="text-sm text-red-500">{errors.nome.message as string}</span>}
              </div>
              <div>
                <label className="font-semibold text-[#023047] block mb-1 flex gap-1 items-center"><DollarSign size={15}/> Preço (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  {...register("preco", { required: "O preço é obrigatório." })}
                  className={`w-full border rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 ${errors.preco ? "border-red-400" : "border-gray-300"}`}
                  placeholder="Ex: 220000"
                />
                {errors.preco && <span className="text-sm text-red-500">{errors.preco.message as string}</span>}
              </div>
              <div>
                <label className="font-semibold text-[#023047] block mb-1 flex gap-1 items-center"><Layers size={15}/> Categoria *</label>
                <select
                  {...register("categoria", { required: "Escolha uma categoria." })}
                  className={`w-full border rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 ${errors.categoria ? "border-red-400" : "border-gray-300"}`}
                >
                  <option value="">Selecione</option>
                  {categorias.map((c) => <option key={c}>{c}</option>)}
                </select>
                {errors.categoria && <span className="text-sm text-red-500">{errors.categoria.message as string}</span>}
              </div>
              <div>
                <label className="font-semibold text-[#023047] block mb-1 flex gap-1 items-center"><Calendar size={15}/> Ano</label>
                <input
                  type="number"
                  min="1950"
                  max={new Date().getFullYear()}
                  {...register("ano")}
                  className="w-full border rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 border-gray-300"
                  placeholder="Ex: 2022"
                />
              </div>
              <div>
                <label className="font-semibold text-[#023047] block mb-1 flex gap-1 items-center"><Tag size={15}/> Condição *</label>
                <select
                  {...register("condicao", { required: "Escolha a condição." })}
                  className={`w-full border rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 ${errors.condicao ? "border-red-400" : "border-gray-300"}`}
                >
                  <option value="">Selecione</option>
                  {condicoes.map((c) => <option key={c}>{c}</option>)}
                </select>
                {errors.condicao && <span className="text-sm text-red-500">{errors.condicao.message as string}</span>}
              </div>
              <div>
                <label className="font-semibold text-[#023047] block mb-1 flex gap-1 items-center">
                  <MapPin size={15}/> Estado *
                </label>
                <select
                  {...register("estado", { required: "Escolha o estado." })}
                  className={`w-full border rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 ${errors.estado ? "border-red-400" : "border-gray-300"}`}
                >
                  <option value="">Selecione</option>
                  {estados.map((e) => <option key={e}>{e}</option>)}
                </select>
                {errors.estado && <span className="text-sm text-red-500">{errors.estado.message as string}</span>}
              </div>
            </div>
            <div className="mt-4">
              <label className="font-semibold text-[#023047] block mb-1 flex gap-1 items-center">
                <BookOpen size={15}/> Descrição *
              </label>
              <textarea
                {...register("descricao", { required: "A descrição é obrigatória." })}
                className={`w-full border rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 ${errors.descricao ? "border-red-400" : "border-gray-300"}`}
                placeholder="Descreva tudo sobre a máquina: estado, acessórios, detalhes técnicos, motivo da venda, etc."
                rows={4}
              />
              {errors.descricao && <span className="text-sm text-red-500">{errors.descricao.message as string}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            {error && <div className="text-red-500 text-sm text-center font-semibold px-2 py-1 bg-red-50 rounded-xl border border-red-100 animate-pulse">{error}</div>}
            {success && <div className="text-green-600 text-sm text-center font-semibold px-2 py-1 bg-green-50 rounded-xl border border-green-100 animate-fade-in">{success}</div>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-400 to-blue-600 hover:from-orange-500 hover:to-blue-700 text-white font-bold rounded-2xl py-3 transition disabled:bg-blue-300 disabled:cursor-not-allowed text-lg shadow-lg mt-2 active:scale-95"
              style={{ fontSize: '1.22rem', height: '3.2rem', minHeight: 52 }}
            >
              {isSubmitting ? <Loader2 className="animate-spin w-6 h-6" /> : <Save className="w-5 h-5" />}
              {isSubmitting ? "Salvando..." : "Cadastrar máquina"}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        @media (max-width: 950px) {
          .max-w-5xl { max-width: 100vw !important; }
        }
        @media (max-width: 650px) {
          .max-w-5xl { max-width: 99vw !important; }
          .rounded-3xl, .rounded-2xl { border-radius: 0.8rem !important; }
          .p-12, .p-10, .p-8, .p-6, .p-4 { padding-left: 0.7rem !important; padding-right: 0.7rem !important; }
          h1, h2 { font-size: 1.08rem !important; }
        }
      `}</style>
    </main>
  );
}
