// =============================
// app/create-service/page.tsx (Responsivo PREMIUM)
// =============================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, ArrowLeft, Layers, DollarSign, User, Tag, MapPin } from "lucide-react";

// Categorias ampliadas
const categorias = [
  "Mecânico de Máquinas Pesadas", "Elétrica Industrial", "Transporte de Equipamentos",
  "Soldador", "Montagem/Desmontagem", "Lubrificação e Manutenção", "Assistência Técnica",
  "Operação de Máquinas", "Treinamento de Operadores", "Manutenção Preventiva",
  "Calibração", "Consultoria Técnica", "Topografia", "Transporte de Cargas",
  "Segurança do Trabalho", "Locação de Equipamentos", "Outros"
];
const estados = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export default function CreateServicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    categoria: "",
    preco: "",
    prestador: "",
    estado: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const user = auth.currentUser;
    if (!user) {
      setError("Faça login para cadastrar um serviço.");
      setLoading(false);
      return;
    }

    if (!form.titulo || !form.descricao || !form.categoria || !form.estado || !form.prestador) {
      setError("Preencha todos os campos obrigatórios.");
      setLoading(false);
      return;
    }

    try {
      await addDoc(collection(db, "services"), {
        titulo: form.titulo,
        descricao: form.descricao,
        categoria: form.categoria,
        preco: form.preco || "Sob consulta",
        prestador: form.prestador,
        estado: form.estado,
        vendedorId: user.uid,
        prestadorNome: form.prestador,
        createdAt: serverTimestamp(),
      });
      setSuccess("Serviço cadastrado com sucesso!");
      setLoading(false);
      setForm({
        titulo: "",
        descricao: "",
        categoria: "",
        preco: "",
        prestador: "",
        estado: "",
      });
      setTimeout(() => router.push("/services"), 1300);
    } catch (err) {
      setLoading(false);
      setError("Erro ao cadastrar serviço. Tente novamente.");
      console.error(err);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#e0e7ef] flex flex-col items-center py-7 px-2 sm:px-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl px-3 py-5 sm:px-7 sm:py-8 md:px-10 md:py-11 lg:px-14 lg:py-14 animate-fade-in">
        <div className="flex items-center gap-3 mb-6 sm:mb-9">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 text-blue-700">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-blue-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-orange-500" /> Cadastrar Serviço
          </h1>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="font-semibold text-[#023047] mb-1 flex gap-1 items-center text-base sm:text-lg">
                <Tag size={17} /> Título do Serviço *
              </label>
              <input
                name="titulo"
                value={form.titulo}
                onChange={handleChange}
                className="w-full border rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 border-gray-300 transition"
                placeholder="Ex: Manutenção corretiva em britador"
                maxLength={80}
                required
                autoComplete="off"
              />
            </div>
            <div>
              <label className="font-semibold text-[#023047] mb-1 flex gap-1 items-center text-base sm:text-lg">
                <DollarSign size={17} /> Valor do Serviço (R$)
              </label>
              <input
                name="preco"
                value={form.preco}
                onChange={handleChange}
                type="number"
                min={0}
                step="0.01"
                className="w-full border rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-200 border-gray-300 transition"
                placeholder="Ex: 1200 (opcional)"
              />
            </div>
            <div>
              <label className="font-semibold text-[#023047] mb-1 flex gap-1 items-center text-base sm:text-lg">
                <Layers size={17} /> Categoria *
              </label>
              <select
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                className="w-full border rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-200 border-gray-300 transition"
                required
              >
                <option value="">Selecione</option>
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-[#023047] mb-1 flex gap-1 items-center text-base sm:text-lg">
                <MapPin size={17} /> Estado (UF) *
              </label>
              <select
                name="estado"
                value={form.estado}
                onChange={handleChange}
                className="w-full border rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-200 border-gray-300 transition"
                required
              >
                <option value="">Selecione</option>
                {estados.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-[#023047] mb-1 flex gap-1 items-center text-base sm:text-lg">
                <User size={17} /> Nome do Prestador *
              </label>
              <input
                name="prestador"
                value={form.prestador}
                onChange={handleChange}
                className="w-full border rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-200 border-gray-300 transition"
                placeholder="Seu nome ou nome da empresa"
                maxLength={48}
                required
                autoComplete="off"
              />
            </div>
          </div>
          <div>
            <label className="font-semibold text-[#023047] mb-1 flex gap-1 items-center text-base sm:text-lg">
              Descrição detalhada *
            </label>
            <textarea
              name="descricao"
              value={form.descricao}
              onChange={handleChange}
              className="w-full border rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 border-gray-300 transition"
              placeholder="Descreva com detalhes: tipo de serviço, experiência, materiais, área de atendimento, diferenciais, etc."
              rows={4}
              maxLength={400}
              required
            />
          </div>
          {error && <div className="text-red-500 text-sm text-center font-semibold px-2 py-1 bg-red-50 rounded-xl border border-red-100 animate-pulse">{error}</div>}
          {success && <div className="text-green-600 text-sm text-center font-semibold px-2 py-1 bg-green-50 rounded-xl border border-green-100 animate-fade-in">{success}</div>}
          <div className="flex flex-col sm:flex-row justify-end items-center pt-2 gap-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-orange-400 to-blue-600 hover:from-orange-500 hover:to-blue-700 text-white font-bold shadow-lg text-lg transition disabled:bg-blue-300 disabled:cursor-not-allowed active:scale-95"
              style={{ fontSize: "1.12rem", minHeight: 50 }}
            >
              {loading ? <Loader2 className="animate-spin inline-block mr-2" /> : null}
              Cadastrar Serviço
            </button>
          </div>
        </form>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .max-w-3xl { max-width: 99vw !important; }
        }
        @media (max-width: 650px) {
          .max-w-3xl { max-width: 100vw !important; }
          .rounded-3xl, .rounded-2xl { border-radius: 0.7rem !important; }
          .px-14, .px-10, .px-7, .px-3 { padding-left: 0.9rem !important; padding-right: 0.9rem !important; }
          h1, label { font-size: 1.02rem !important; }
        }
        input, select, textarea {
          font-size: 1rem !important;
          min-height: 44px;
        }
        @media (max-width: 480px) {
          input, select, textarea {
            font-size: .97rem !important;
            min-height: 40px;
          }
        }
      `}</style>
    </main>
  );
}
