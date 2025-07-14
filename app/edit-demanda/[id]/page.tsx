"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Loader2, ArrowLeft, CheckCircle2, AlertTriangle, Plus } from "lucide-react";

export default function EditDemandaPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", msg: "" });
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    categoria: "",
    tipo: "",
    estado: "",
    cidade: "",
    prazo: "",
    orcamento: "",
    telefone: "",
    tags: [],
    status: "Aberta",
    observacoes: ""
  });

  // Buscar dados existentes
  useEffect(() => {
    if (!id) return;
    async function fetchDemanda() {
      setLoading(true);
      const ref = doc(db, "demandas", String(id));
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setForm({
          ...form,
          ...snap.data(),
          tags: snap.data().tags || []
        });
      }
      setLoading(false);
    }
    fetchDemanda();
    // eslint-disable-next-line
  }, [id]);

  // Manipulador de mudança (inputs/textareas/selects)
  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // Manipulador de tags (até 3)
  function handleAddTag(e: any) {
    e.preventDefault();
    const novaTag = (e.target.tag.value || "").trim();
    if (novaTag && !form.tags.includes(novaTag) && form.tags.length < 3) {
      setForm({ ...form, tags: [...form.tags, novaTag] });
    }
    e.target.tag.value = "";
  }
  function handleRemoveTag(tag: string) {
    setForm({ ...form, tags: form.tags.filter(t => t !== tag) });
  }

  // Salvar alterações
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: "", msg: "" });
    try {
      await updateDoc(doc(db, "demandas", String(id)), {
        ...form,
        updatedAt: new Date()
      });
      setFeedback({ type: "success", msg: "Demanda atualizada com sucesso!" });
      setTimeout(() => router.push("/demandas"), 1500);
    } catch (err) {
      setFeedback({ type: "error", msg: "Erro ao salvar alterações. Tente novamente." });
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 text-blue-900 font-bold">
        <Loader2 className="animate-spin mr-3" /> Carregando demanda...
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-2 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 text-blue-700">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-2xl md:text-3xl font-extrabold text-blue-900">Editar Demanda</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md px-3 sm:px-6 py-6 space-y-4">
        {/* Feedback */}
        {feedback.msg && (
          <div className={`mb-2 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 
            ${feedback.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
            {feedback.type === "success" ? <CheckCircle2 size={18}/> : <AlertTriangle size={18}/>}
            {feedback.msg}
          </div>
        )}

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
            <label className="block font-bold text-blue-800 mb-1">Tipo</label>
            <select
              name="tipo"
              value={form.tipo}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
              required
            >
              <option value="">Selecione o tipo</option>
              <option value="Produto">Produto</option>
              <option value="Serviço">Serviço</option>
              <option value="Peça">Peça</option>
              <option value="Logística">Logística</option>
              <option value="Aluguel">Aluguel</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-4">
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
          <div className="flex-1">
            <label className="block font-bold text-blue-800 mb-1">Cidade</label>
            <input
              name="cidade"
              value={form.cidade}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
              required
            />
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-4">
          <div className="flex-1">
            <label className="block font-bold text-blue-800 mb-1">Prazo (urgência)</label>
            <select
              name="prazo"
              value={form.prazo}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
            >
              <option value="">Selecione o prazo</option>
              <option value="Urgente">Urgente</option>
              <option value="Em até 7 dias">Em até 7 dias</option>
              <option value="Em até 15 dias">Em até 15 dias</option>
              <option value="Em até 30 dias">Em até 30 dias</option>
              <option value="Sem prazo definido">Sem prazo definido</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block font-bold text-blue-800 mb-1">Orçamento estimado (opcional)</label>
            <input
              name="orcamento"
              type="number"
              min={0}
              value={form.orcamento}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
              placeholder="R$"
            />
          </div>
        </div>
        <div>
          <label className="block font-bold text-blue-800 mb-1">WhatsApp / Telefone (opcional)</label>
          <input
            name="telefone"
            value={form.telefone}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="(xx) xxxxx-xxxx"
          />
        </div>
        {/* Tags */}
        <div>
          <label className="block font-bold text-blue-800 mb-1">Tags (até 3)</label>
          <form onSubmit={handleAddTag} className="flex gap-2">
            <input
              name="tag"
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Nova tag"
              maxLength={18}
            />
            <button
              type="submit"
              className="bg-blue-600 px-4 py-2 rounded-xl text-white font-bold hover:bg-blue-700 transition flex items-center gap-1"
              disabled={form.tags.length >= 3}
            >
              <Plus size={18}/> Adicionar
            </button>
          </form>
          <div className="flex gap-2 mt-2 flex-wrap">
            {form.tags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 font-semibold text-xs flex items-center gap-2 border"
              >
                {tag}
                <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1 text-blue-500 hover:text-red-500">&times;</button>
              </span>
            ))}
          </div>
        </div>
        {/* Observações */}
        <div>
          <label className="block font-bold text-blue-800 mb-1">Observações (opcional)</label>
          <textarea
            name="observacoes"
            value={form.observacoes}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-100 outline-none"
            placeholder="Alguma observação extra?"
          />
        </div>
        <div>
          <label className="block font-bold text-blue-800 mb-1">Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
            required
          >
            <option value="Aberta">Aberta</option>
            <option value="Finalizada">Finalizada</option>
          </select>
        </div>
        {/* Botão salvar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-orange-500 text-white font-extrabold hover:bg-orange-600 transition-all shadow disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ minWidth: 170, letterSpacing: ".01em", justifyContent: "center" }}
          >
            {saving ? <Loader2 className="animate-spin inline-block" size={23} /> : null}
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
