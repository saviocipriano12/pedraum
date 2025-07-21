"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, ArrowLeft, Plus, Upload, Tag } from "lucide-react";
// Se já tiver um componente ImageUploader, importe aqui:
import ImageUploader from "@/components/ImageUploader"; // Ajuste o caminho se necessário

export default function CreateDemandaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imagens, setImagens] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    categoria: "",
    tipo: "",
    estado: "",
    cidade: "",
    prazo: "",
    orcamento: "",
    whatsapp: "",
    observacoes: "",
    status: "Aberta",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim() && tags.length < 3) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
      e.preventDefault();
    }
  }
  function removeTag(idx: number) {
    setTags(tags.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await addDoc(collection(db, "demandas"), {
      ...form,
      tags,
      imagens,
      createdAt: serverTimestamp(),
    });
    setLoading(false);
    router.push("/demandas");
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-2 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 text-blue-700">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-2xl md:text-3xl font-extrabold text-blue-900">Cadastrar Demanda</h1>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md px-4 sm:px-7 py-7 space-y-4">
        {/* Bloco 1: Dados principais */}
        <div>
          <label className="block font-bold text-blue-800 mb-1">Título da Demanda</label>
          <input
            name="titulo"
            value={form.titulo}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-lg focus:ring-2 focus:ring-blue-300 outline-none"
            required
            placeholder="Ex: Preciso de mecânico para pá carregadeira"
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
            placeholder="Detalhe sua necessidade, problema ou demanda aqui..."
          />
        </div>
        {/* Bloco 2: Categoria/tipo/locais */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <label className="block font-bold text-blue-800 mb-1">Categoria</label>
            <input
              name="categoria"
              value={form.categoria}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
              placeholder="Ex: Mecânico, Peça, Logística..."
              required
            />
          </div>
          <div className="flex-1">
            <label className="block font-bold text-blue-800 mb-1">Tipo</label>
            <select
              name="tipo"
              value={form.tipo}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-100 outline-none"
              required
            >
              <option value="">Selecione</option>
              <option value="produto">Produto</option>
              <option value="serviço">Serviço</option>
              <option value="peça">Peça</option>
              <option value="aluguel">Aluguel</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
         <div className="flex-1">
  <label className="block font-bold text-blue-800 mb-1">Estado (UF)</label>
  <select
    name="estado"
    value={form.estado}
    onChange={handleChange}
    className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
    required
  >
    <option value="">Selecione o Estado</option>
    <option value="AC">Acre (AC)</option>
    <option value="AL">Alagoas (AL)</option>
    <option value="AP">Amapá (AP)</option>
    <option value="AM">Amazonas (AM)</option>
    <option value="BA">Bahia (BA)</option>
    <option value="CE">Ceará (CE)</option>
    <option value="DF">Distrito Federal (DF)</option>
    <option value="ES">Espírito Santo (ES)</option>
    <option value="GO">Goiás (GO)</option>
    <option value="MA">Maranhão (MA)</option>
    <option value="MT">Mato Grosso (MT)</option>
    <option value="MS">Mato Grosso do Sul (MS)</option>
    <option value="MG">Minas Gerais (MG)</option>
    <option value="PA">Pará (PA)</option>
    <option value="PB">Paraíba (PB)</option>
    <option value="PR">Paraná (PR)</option>
    <option value="PE">Pernambuco (PE)</option>
    <option value="PI">Piauí (PI)</option>
    <option value="RJ">Rio de Janeiro (RJ)</option>
    <option value="RN">Rio Grande do Norte (RN)</option>
    <option value="RS">Rio Grande do Sul (RS)</option>
    <option value="RO">Rondônia (RO)</option>
    <option value="RR">Roraima (RR)</option>
    <option value="SC">Santa Catarina (SC)</option>
    <option value="SP">São Paulo (SP)</option>
    <option value="SE">Sergipe (SE)</option>
    <option value="TO">Tocantins (TO)</option>
  </select>
</div>

        </div>
        {/* Bloco 3: Prazo, orçamento, contato */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <label className="block font-bold text-blue-800 mb-1">Prazo (urgência)</label>
            <select
              name="prazo"
              value={form.prazo}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
              required
            >
              <option value="">Selecione</option>
              <option value="urgente">Urgente</option>
              <option value="até 3 dias">Até 3 dias</option>
              <option value="até 7 dias">Até 7 dias</option>
              <option value="até 15 dias">Até 15 dias</option>
              <option value="flexível">Flexível</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block font-bold text-blue-800 mb-1">Orçamento estimado (opcional)</label>
            <input
              name="orcamento"
              value={form.orcamento}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
              type="number"
              placeholder="R$"
              min={0}
            />
          </div>
        </div>
        <div>
          <label className="block font-bold text-blue-800 mb-1">WhatsApp / Telefone (opcional)</label>
          <input
            name="whatsapp"
            value={form.whatsapp}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="(xx) xxxxx-xxxx"
          />
        </div>
        {/* Bloco 4: Tags */}
        <div>
          <label className="block font-bold text-blue-800 mb-1 flex items-center gap-1"><Tag size={17} /> Referencias <span className="font-normal text-xs text-gray-500">(até 3)</span></label>
          <div className="flex items-center gap-2 flex-wrap">
            {tags.map((tg, idx) => (
              <span key={idx} className="bg-orange-100 text-orange-800 font-bold px-3 py-1 rounded-xl flex items-center gap-1 text-sm">
                {tg}
                <button type="button" onClick={() => removeTag(idx)} className="text-orange-500 ml-1 hover:text-red-500 font-black text-base">×</button>
              </span>
            ))}
            {tags.length < 3 && (
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="border border-gray-300 rounded-xl px-3 py-1 w-32"
                placeholder="Nova tag"
                maxLength={16}
              />
            )}
          </div>
        </div>
        {/* Bloco 5: Upload de imagens */}
        <div>
          <label className="block font-bold text-blue-800 mb-1 flex items-center gap-1">
            <Upload size={17} /> Anexar imagens (opcional)
          </label>
          <ImageUploader imagens={imagens} setImagens={setImagens} max={5} />
        </div>
        {/* Bloco 6: Observações finais */}
        <div>
          <label className="block font-bold text-blue-800 mb-1">Observações (opcional)</label>
          <textarea
            name="observacoes"
            value={form.observacoes}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 min-h-[40px] focus:ring-2 focus:ring-blue-100 outline-none"
            placeholder="Alguma observação extra? (opcional)"
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between items-center pt-4">
  <div className="flex-1 w-full sm:w-auto">
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
  <button
    type="submit"
    disabled={loading}
    className="
      w-full sm:w-auto 
      mt-6 sm:mt-7 
      px-8 py-3 
      rounded-xl 
      bg-orange-500 
      text-white font-extrabold 
      hover:bg-orange-600 
      transition-all shadow 
      disabled:opacity-70 
      disabled:cursor-not-allowed 
      flex items-center justify-center gap-2 text-lg
      text-center
    "
    style={{ letterSpacing: ".01em", minWidth: 190 }}
  >
    {loading ? <Loader2 className="animate-spin inline-block" size={23} /> : <Plus size={22} />}
    {loading ? "Cadastrando..." : "Cadastrar Demanda"}
  </button>
</div>

      </form>
    </div>
  );
}
