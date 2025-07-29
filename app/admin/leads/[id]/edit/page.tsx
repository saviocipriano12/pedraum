"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Loader2, Plus, Trash2, Save } from "lucide-react";

type Vendedor = { email: string; userId: string; status: string; dataPagamento?: any };

export default function EditLeadPage() {
  const { id } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Campos principais
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [valor, setValor] = useState<number | string>("");
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [premium, setPremium] = useState(false);
  const [origem, setOrigem] = useState("");
  const [observacao, setObservacao] = useState("");
  const [comprador, setComprador] = useState("");
  const [adminObs, setAdminObs] = useState("");

  // Campos vendedores
  const [vendEmail, setVendEmail] = useState("");
  const [vendUserId, setVendUserId] = useState("");
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);

  useEffect(() => {
    async function fetchLead() {
      setLoading(true);
      const ref = doc(db, "leads", id as string);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setLead(data);
        setNome(data.nome || "");
        setEmail(data.email || "");
        setTelefone(data.telefone || "");
        setValor(data.valor || "");
        setTipo(data.tipo || "");
        setStatus(data.status || "");
        setPremium(!!data.premium);
        setOrigem(data.origem || "");
        setObservacao(data.observacao || "");
        setComprador(data.comprador || "");
        setAdminObs(data.adminObs || "");
        setVendedores(data.vendedoresLiberados || []);
      }
      setLoading(false);
    }
    fetchLead();
  }, [id]);

  // --- Vendedores ---
  const addVendedor = () => {
    if (
      !vendEmail.trim() ||
      !vendUserId.trim() ||
      vendedores.some(v => v.email === vendEmail.trim() || v.userId === vendUserId.trim())
    ) {
      setError("Preencha e-mail, userId e evite duplicar vendedor.");
      return;
    }
    setVendedores([
      ...vendedores,
      { email: vendEmail.trim(), userId: vendUserId.trim(), status: "ofertado" }
    ]);
    setVendEmail("");
    setVendUserId("");
    setError(null);
  };

  const removeVendedor = (userId: string) => {
    setVendedores(vendedores.filter(v => v.userId !== userId));
  };

  const handleStatusChange = (userId: string, status: string) => {
    setVendedores(vendedores.map(v =>
      v.userId === userId ? { ...v, status } : v
    ));
  };

  // --- Salvar tudo ---
  async function handleSave(e: any) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    // Cria o array de userIds para facilitar o filtro depois
    const vendedoresUserIds = vendedores.map(v => v.userId);

    try {
      await updateDoc(doc(db, "leads", id as string), {
        nome,
        email,
        telefone,
        valor: Number(valor),
        tipo,
        status,
        premium,
        origem,
        observacao,
        comprador,
        adminObs,
        vendedoresLiberados: vendedores,
        vendedoresUserIds, // campo novo, para o filtro!
      });
      setSuccess("Alterações salvas com sucesso!");
      setTimeout(() => router.push("/admin/leads"), 1000);
    } catch (err) {
      setError("Erro ao salvar alterações.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-12 text-center text-lg text-blue-800"><Loader2 className="animate-spin inline" /> Carregando...</div>;
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl mx-auto p-8 bg-white rounded-xl shadow-xl space-y-7">
      <h1 className="text-2xl font-extrabold text-blue-900 mb-3">Editar Lead</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="font-bold text-blue-700">Nome:</label>
          <input className="border rounded-lg px-3 py-2 w-full"
            value={nome} onChange={e => setNome(e.target.value)} />
        </div>
        <div>
          <label className="font-bold text-blue-700">E-mail:</label>
          <input className="border rounded-lg px-3 py-2 w-full"
            value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="font-bold text-blue-700">Telefone:</label>
          <input className="border rounded-lg px-3 py-2 w-full"
            value={telefone} onChange={e => setTelefone(e.target.value)} />
        </div>
        <div>
          <label className="font-bold text-blue-700">Valor:</label>
          <input className="border rounded-lg px-3 py-2 w-full"
            type="number" min={0}
            value={valor} onChange={e => setValor(e.target.value)} />
        </div>
        <div>
          <label className="font-bold text-blue-700">Tipo:</label>
          <select className="border rounded-lg px-3 py-2 w-full"
            value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="">Selecione</option>
            <option value="produto">Produto</option>
            <option value="máquina">Máquina</option>
            <option value="serviço">Serviço</option>
            <option value="demanda">Demanda</option>
          </select>
        </div>
        <div>
          <label className="font-bold text-blue-700">Status:</label>
          <select className="border rounded-lg px-3 py-2 w-full"
            value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">Selecione</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="vendido">Vendido</option>
            <option value="cancelado">Cancelado</option>
            <option value="contatado">Contatado</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={premium}
            onChange={e => setPremium(e.target.checked)} />
          <label className="font-bold text-blue-700">Lead Premium?</label>
        </div>
        <div>
          <label className="font-bold text-blue-700">Origem / Interesse:</label>
          <input className="border rounded-lg px-3 py-2 w-full"
            value={origem} onChange={e => setOrigem(e.target.value)} />
        </div>
        <div>
          <label className="font-bold text-blue-700">Comprador (nome/email):</label>
          <input className="border rounded-lg px-3 py-2 w-full"
            value={comprador} onChange={e => setComprador(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="font-bold text-blue-700">Observação:</label>
        <textarea className="border rounded-lg px-3 py-2 w-full"
          value={observacao} onChange={e => setObservacao(e.target.value)} />
      </div>

      <div>
        <label className="font-bold text-blue-700">Observação Admin:</label>
        <textarea className="border rounded-lg px-3 py-2 w-full"
          value={adminObs} onChange={e => setAdminObs(e.target.value)} />
      </div>

      {/* --- Vendedores ofertados --- */}
      <div className="rounded-xl bg-blue-50 border p-4 mb-2">
        <label className="font-bold text-blue-700 mb-1 block">Adicionar Vendedor:</label>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            value={vendEmail}
            onChange={e => setVendEmail(e.target.value)}
            className="border rounded-lg px-3 py-2 flex-1"
            placeholder="vendedor@email.com"
          />
          <input
            value={vendUserId}
            onChange={e => setVendUserId(e.target.value)}
            className="border rounded-lg px-3 py-2 flex-1"
            placeholder="userId do vendedor"
          />
          <button type="button" onClick={addVendedor}
            className="bg-orange-500 px-4 py-2 rounded-lg text-white font-bold hover:bg-orange-600 flex items-center gap-1">
            <Plus size={18} /> Adicionar
          </button>
        </div>
        <h2 className="font-bold text-blue-700 mb-2">Vendedores Ofertados:</h2>
        <ul className="space-y-2">
          {vendedores.map((v, idx) => (
            <li key={v.userId} className="flex items-center gap-3 border rounded-lg p-2 bg-white">
              <span className="flex-1 font-semibold text-blue-900">
                {v.email} <span className="text-xs text-gray-400">({v.userId})</span>
              </span>
              <select value={v.status} onChange={e => handleStatusChange(v.userId, e.target.value)}
                className="rounded border px-2 py-1 text-sm">
                <option value="ofertado">Ofertado</option>
                <option value="pago">Pago</option>
              </select>
              <button type="button" onClick={() => removeVendedor(v.userId)}
                className="text-red-500 hover:text-red-700 ml-2"><Trash2 size={18} /></button>
            </li>
          ))}
          {vendedores.length === 0 && <li className="text-gray-400">Nenhum vendedor ofertado ainda.</li>}
        </ul>
      </div>

      {error && <div className="text-red-500 font-bold text-center">{error}</div>}
      {success && <div className="text-green-700 font-bold text-center">{success}</div>}

      {/* --- Botão Salvar --- */}
      <button type="submit"
        className="w-full bg-blue-700 text-white font-bold rounded-xl px-7 py-3 flex gap-2 items-center justify-center text-lg hover:bg-blue-900 transition mt-3 active:scale-95 shadow">
        <Save size={21} /> {loading ? "Salvando..." : "Salvar Alterações"}
      </button>
    </form>
  );
}
