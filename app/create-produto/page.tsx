"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import ImageUploader from "@/components/ImageUploader";
import {
  Loader2, Save, Tag, DollarSign, Layers, Calendar, MapPin, BookOpen, Package
} from "lucide-react";

const categorias = [
  "Peças", "Máquina Pesada", "Equipamento de Mineração", "Ferramentas", "Outros"
];
const condicoes = ["Nova", "Seminova", "Usada"];
const estados = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export default function CreateProdutoPage() {
  const router = useRouter();
  const [imagens, setImagens] = useState<string[]>([]);
  const [form, setForm] = useState({
    nome: "",
    tipo: "produto",
    categoria: "",
    preco: "",
    cidade: "",
    estado: "",
    ano: "",
    condicao: "",
    descricao: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const user = auth.currentUser;
    if (!user) {
      setError("Você precisa estar logado para cadastrar um produto.");
      setLoading(false);
      return;
    }

    if (!form.nome || !form.tipo || !form.preco || !form.estado || !form.cidade || !form.descricao || !form.categoria) {
      setError("Preencha todos os campos obrigatórios.");
      setLoading(false);
      return;
    }

    if (imagens.length === 0) {
      setError("Envie pelo menos uma imagem.");
      setLoading(false);
      return;
    }

    try {
      await addDoc(collection(db, "produtos"), {
        ...form,
        preco: parseFloat(form.preco),
        imagens,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        visivel: true,
      });
      setSuccess("Produto cadastrado com sucesso!");
      setForm({
        nome: "",
        tipo: "produto",
        categoria: "",
        preco: "",
        cidade: "",
        estado: "",
        ano: "",
        condicao: "",
        descricao: ""
      });
      setImagens([]);
      setTimeout(() => router.push("/vitrine"), 1200);
    } catch (err) {
      setError("Erro ao cadastrar. Tente novamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#e0e7ef] flex flex-col items-center py-8 px-2 sm:px-4">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl p-4 sm:p-7 md:p-10 lg:p-14 grid grid-cols-1 md:grid-cols-2 gap-7 md:gap-14 animate-fade-in">
        <section className="flex flex-col gap-8">
          <h2 className="text-lg sm:text-xl font-bold text-[#023047] mb-2 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" /> Imagens do Produto
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
            <b>Dicas para anunciar melhor:</b>
            <ul className="list-disc ml-5 mt-1 space-y-0.5">
              <li>Use fotos reais e com boa qualidade</li>
              <li>Informe o máximo de detalhes técnicos</li>
              <li>Anuncie com preço competitivo</li>
            </ul>
          </div>
        </section>
        <form onSubmit={handleSubmit} className="space-y-5 flex flex-col justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#023047] mb-4 flex items-center gap-3">
              <Package className="w-6 h-6 text-orange-500" /> Cadastrar Produto
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-[#023047] block mb-1 flex gap-1 items-center"><Tag size={15}/> Nome *</label>
                <input
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  className="w-full border rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 border-gray-300"
                  placeholder="Ex: Pá carregadeira, motor, filtro, etc."
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-[#023047] block mb-1 flex gap-1 items-center"><Layers size={15}/> Tipo *</label>
                <select
                  name="tipo"
                  value={form.tipo}
                  onChange={handleChange}
                  className="w-full border rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 border-gray-300"
                  required
                >
                  <option value="produto">Produto</option>
                  <option value="máquina">Máquina</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-[#023047] block mb-1 flex gap-1 items-center"><Tag size={15}/> Categoria *</label>
                <select
                  name="categoria"
                  value={form.categoria}
                  onChange={handleChange}
                  className="w-full border rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 border-gray-300"
                  required
                >
                  <option value="">Selecione</option>
                  {categorias.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="font-semibold text-[#023047] block mb-1 flex gap-1 items-center"><DollarSign size={15}/> Preço (R$) *</label>
                <input
                  name="preco"
                  value={form.preco}
                  onChange={handleChange}
                  type="number"
                  className="w-full border rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 border-gray-300"
                  placeholder="Ex: 15000"
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-[#023047] block mb-1 flex gap-1 items-center"><Calendar size={15}/> Ano (opcional)</label>
                <input
                  name="ano"
                  value={form.ano}
                  onChange={handleChange}
                  type="number"
                  className="w-full border rounded-xl p-3 text-base border-gray-300"
                  placeholder="Ex: 2021"
                />
              </div>
              <div>
                <label className="font-semibold text-[#023047] block mb-1 flex gap-1 items-center"><Tag size={15}/> Condição</label>
                <select
                  name="condicao"
                  value={form.condicao}
                  onChange={handleChange}
                  className="w-full border rounded-xl p-3 text-base border-gray-300"
                >
                  <option value="">Selecione</option>
                  {condicoes.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="font-semibold text-[#023047] block mb-1 flex gap-1 items-center"><MapPin size={15}/> Cidade *</label>
                <input
                  name="cidade"
                  value={form.cidade}
                  onChange={handleChange}
                  className="w-full border rounded-xl p-3 text-base border-gray-300"
                  placeholder="Ex: Contagem"
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-[#023047] block mb-1 flex gap-1 items-center"><MapPin size={15}/> Estado *</label>
                <select
                  name="estado"
                  value={form.estado}
                  onChange={handleChange}
                  className="w-full border rounded-xl p-3 text-base border-gray-300"
                  required
                >
                  <option value="">Selecione</option>
                  {estados.map((e) => <option key={e}>{e}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="font-semibold text-[#023047] block mb-1 flex gap-1 items-center"><BookOpen size={15}/> Descrição *</label>
              <textarea
                name="descricao"
                value={form.descricao}
                onChange={handleChange}
                className="w-full border rounded-xl p-3 text-base border-gray-300"
                placeholder="Descreva com detalhes o produto, condição, uso, etc."
                rows={4}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            {error && <div className="text-red-500 text-sm text-center font-semibold px-2 py-1 bg-red-50 rounded-xl border border-red-100 animate-pulse">{error}</div>}
            {success && <div className="text-green-600 text-sm text-center font-semibold px-2 py-1 bg-green-50 rounded-xl border border-green-100 animate-fade-in">{success}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-400 to-blue-600 hover:from-orange-500 hover:to-blue-700 text-white font-bold rounded-2xl py-3 transition disabled:bg-blue-300 disabled:cursor-not-allowed text-lg shadow-lg mt-2 active:scale-95"
              style={{ fontSize: '1.22rem', height: '3.2rem', minHeight: 52 }}
            >
              {loading ? <Loader2 className="animate-spin w-6 h-6" /> : <Save className="w-5 h-5" />}
              {loading ? "Salvando..." : "Cadastrar Produto"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
