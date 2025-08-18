"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/firebaseConfig";
import {
  doc, getDoc, updateDoc, deleteDoc,
  getDocs, collection, query, where,
  writeBatch, serverTimestamp, orderBy, limit, startAfter,
  startAt, endAt, onSnapshot
} from "firebase/firestore";
import {
  Loader as LoaderIcon, ArrowLeft, Save, Trash2, Upload, Tag,
  Send, Users, Filter, DollarSign, ShieldCheck, Search, RefreshCw, CheckCircle2, LockOpen, CreditCard, Undo2
} from "lucide-react";
import ImageUploader from "@/components/ImageUploader";

/* ===== tipos ===== */
type Usuario = {
  id: string;
  nome?: string;
  email?: string;
  whatsapp?: string;
  telefone?: string;
  estado?: string;
  ufs?: string[];
  cidade?: string;
  categorias?: string[];
  photoURL?: string;
};

type Assignment = {
  id: string;
  demandId: string;
  supplierId: string;
  status: "sent" | "viewed" | "unlocked";
  pricing?: { amount?: number; currency?: string; exclusive?: boolean; cap?: number; soldCount?: number };
  paymentStatus?: "pending" | "paid";
  createdAt?: any;
  updatedAt?: any;
  unlockedByAdmin?: boolean;
  unlockedAt?: any;
};

export default function EditDemandaPage() {
  const router = useRouter();
  const params = useParams();
  const demandaId = typeof params?.id === "string" ? params.id : (params?.id as string[])[0];

  /* ===== dados da demanda ===== */
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [imagens, setImagens] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [form, setForm] = useState<any>({
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
  const [createdAt, setCreatedAt] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  /* ===== preço padrão da demanda ===== */
  const [precoPadraoReais, setPrecoPadraoReais] = useState<string>("19,90");

  /* ===== busca/envio para usuários ===== */
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [paging, setPaging] = useState<{ last?: any; ended?: boolean }>({ ended: false });
  const [selUsuarios, setSelUsuarios] = useState<string[]>([]);
  const [envLoading, setEnvLoading] = useState(false);

  // quem JÁ recebeu essa demanda (stream)
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const jaEnviados = useMemo(() => new Set(assignments.map(a => a.supplierId)), [assignments]);
  const statusPorUsuario = useMemo(() => {
    const m: Record<string, Assignment["status"]> = {};
    assignments.forEach(a => { m[a.supplierId] = a.status; });
    return m;
  }, [assignments]);
  const pagamentoPorUsuario = useMemo(() => {
    const m: Record<string, "pending"|"paid" | undefined> = {};
    assignments.forEach(a => { m[a.supplierId] = a.paymentStatus; });
    return m;
  }, [assignments]);

  // filtros e busca
  const [busca, setBusca] = useState("");
  const [fCat, setFCat] = useState("");
  const [fUF, setFUF] = useState("");

  // preço do envio atual (pode sobrescrever o padrão)
  const [precoEnvioReais, setPrecoEnvioReais] = useState<string>("");

  const debounceRef = useRef<any>(null);

  /* ===== carregar demanda ===== */
  useEffect(() => {
    async function fetchDemanda() {
      if (!demandaId) return;
      setLoading(true);
      const snap = await getDoc(doc(db, "demandas", demandaId));
      if (!snap.exists()) {
        alert("Demanda não encontrada.");
        router.push("/admin/demandas");
        return;
      }
      const data = snap.data() as any;
      setForm({
        titulo: data.titulo || "",
        descricao: data.descricao || "",
        categoria: data.categoria || "",
        tipo: data.tipo || "",
        estado: data.estado || "",
        cidade: data.cidade || "",
        prazo: data.prazo || "",
        orcamento: data.orcamento || "",
        whatsapp: data.whatsapp || "",
        observacoes: data.observacoes || "",
        status: data.status || "Aberta",
      });
      setTags(data.tags || []);
      setImagens(data.imagens || []);
      setUserId(data.userId || "");
      setCreatedAt(
        data.createdAt?.seconds
          ? new Date(data.createdAt.seconds * 1000).toLocaleString("pt-BR")
          : ""
      );
      // preço padrão (centavos → string reais)
      const cents = data?.pricingDefault?.amount ?? 1990;
      setPrecoPadraoReais((cents / 100).toFixed(2).replace(".", ","));
      setPrecoEnvioReais((cents / 100).toFixed(2).replace(".", ","));

      // filtros sugeridos
      setFCat(data.categoria || "");
      setFUF(data.estado || "");
      setLoading(false);
    }
    fetchDemanda();
  }, [demandaId, router]);

  /* ===== stream assignments já enviados p/ esta demanda ===== */
  useEffect(() => {
    if (!demandaId) return;
    const qAssign = query(
      collection(db, "demandAssignments"),
      where("demandId", "==", demandaId),
      limit(500)
    );
    const unsub = onSnapshot(qAssign, (snap) => {
      const arr: Assignment[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setAssignments(arr);
    }, (e) => {
      console.warn("Falha ao carregar envios:", e);
    });
    return () => unsub();
  }, [demandaId]);

  /* ===== catálogo base (ordenado por nome, paginação leve) ===== */
  useEffect(() => {
    loadUsuarios(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUsuarios(reset = false) {
    setLoadingUsuarios(true);
    try {
      const base = query(collection(db, "usuarios"), orderBy("nome"), limit(40));
      let qBuild: any = base;
      if (!reset && paging.last) qBuild = query(base, startAfter(paging.last));
      const snap = await getDocs(qBuild);
      const list: Usuario[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setUsuarios(prev => reset ? list : [...prev, ...list]);
      setPaging({ last: snap.docs[snap.docs.length - 1], ended: snap.size < 40 });
    } finally {
      setLoadingUsuarios(false);
    }
  }

  /* ===== busca por nome/email/ID (com debounce) ===== */
  async function executarBuscaNow(term: string) {
    setLoadingUsuarios(true);
    try {
      const t = term.trim();
      if (!t) {
        await loadUsuarios(true);
        return;
      }
      const resultados = new Map<string, Usuario>();

      // 1) por ID (doc)
      if (t.length >= 8) {
        try {
          const byId = await getDoc(doc(db, "usuarios", t));
          if (byId.exists()) resultados.set(byId.id, { id: byId.id, ...(byId.data() as any) });
        } catch {}
      }

      // 2) e-mail exato
      if (t.includes("@")) {
        const qEmailExato = query(collection(db, "usuarios"), where("email", "==", t.toLowerCase()));
        const s1 = await getDocs(qEmailExato);
        s1.forEach(d => resultados.set(d.id, { id: d.id, ...(d.data() as any) }));
      }

      // 3) prefixo por nome
      const tCap = t.charAt(0).toUpperCase() + t.slice(1);
      const qNome = query(
        collection(db, "usuarios"),
        orderBy("nome"),
        startAt(tCap),
        endAt(tCap + "\uf8ff"),
        limit(50)
      );
      const s2 = await getDocs(qNome);
      s2.forEach(d => resultados.set(d.id, { id: d.id, ...(d.data() as any) }));

      // 4) prefixo por email (se houver índice)
      const tLower = t.toLowerCase();
      try {
        const qEmail = query(
          collection(db, "usuarios"),
          orderBy("email"),
          startAt(tLower),
          endAt(tLower + "\uf8ff"),
          limit(50)
        );
        const s3 = await getDocs(qEmail);
        s3.forEach(d => resultados.set(d.id, { id: d.id, ...(d.data() as any) }));
      } catch {}

      setUsuarios(Array.from(resultados.values()));
      setPaging({ ended: true });
    } finally {
      setLoadingUsuarios(false);
    }
  }

  function executarBusca() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => executarBuscaNow(busca), 400);
  }

  useEffect(() => {
    executarBusca();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  /* ===== filtragem local (categoria/UF) ===== */
  const candidatos = useMemo(() => {
    return usuarios.filter(u => {
      const hitCat = !fCat || (u.categorias?.includes(fCat));
      const hitUF  = !fUF || (u.ufs?.includes(fUF) || u.estado === fUF);
      return hitCat && hitUF;
    });
  }, [usuarios, fCat, fUF]);

  /* ===== handlers ===== */
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
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

  // reais(string) -> centavos(number)
  function reaisParaCentavos(val: string): number {
    const n = Number(val.replace(/\./g, "").replace(",", "."));
    if (Number.isNaN(n)) return 0;
    return Math.round(n * 100);
  }

  // centavos(number) -> reais(string)
  function centavosParaReais(c: number | undefined): string {
    const v = (c ?? 0) / 100;
    return v.toFixed(2).replace(".", ",");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const cents = reaisParaCentavos(precoPadraoReais);
      await updateDoc(doc(db, "demandas", demandaId), {
        ...form,
        tags,
        imagens,
        pricingDefault: { amount: cents, currency: "BRL" },
        updatedAt: serverTimestamp(),
      });
      alert("Demanda atualizada com sucesso!");
      // mantém seleção e envios na UI
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar demanda!");
    }
    setSalvando(false);
  }

  async function handleDelete() {
    if (!window.confirm("Deseja mesmo excluir esta demanda? Esta ação é irreversível!")) return;
    setRemovendo(true);
    try {
      await deleteDoc(doc(db, "demandas", demandaId));
      alert("Demanda excluída.");
      router.push("/admin/demandas");
    } catch {
      alert("Erro ao excluir demanda.");
    }
    setRemovendo(false);
  }

  function toggleUsuario(id: string, checked: boolean) {
    setSelUsuarios(prev => checked ? [...new Set([...prev, id])] : prev.filter(x => x !== id));
  }
  function selecionarTodosVisiveis() {
    setSelUsuarios(prev => Array.from(new Set([...prev, ...candidatos.filter(c=>!jaEnviados.has(c.id)).map(c => c.id)])));
  }
  function limparSelecao() {
    setSelUsuarios([]);
  }

  async function enviarParaSelecionados() {
    if (!selUsuarios.length) {
      alert("Selecione pelo menos um usuário.");
      return;
    }
    const cents = reaisParaCentavos(precoEnvioReais || precoPadraoReais);
    if (!cents || cents < 100) {
      alert("Defina um preço válido em reais. Ex.: 19,90");
      return;
    }

    setEnvLoading(true);
    try {
      const batch = writeBatch(db);
      // para cada usuário (evita sobrescrever quem já recebeu)
      selUsuarios.forEach((uid) => {
        if (jaEnviados.has(uid)) return; // já enviado
        const aRef = doc(db, "demandAssignments", `${demandaId}_${uid}`);
        batch.set(
          aRef,
          {
            demandId: demandaId,
            supplierId: uid,
            status: "sent",
            pricing: {
              amount: cents,
              currency: "BRL",
              exclusive: false,
              cap: 3,
              soldCount: 0
            },
            paymentStatus: "pending",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });
      batch.update(doc(db, "demandas", demandaId), { lastSentAt: serverTimestamp() });
      await batch.commit();
      alert(`Enviado para ${selUsuarios.length} usuário(s).`);
      setSelUsuarios([]); // limpa apenas seleção de novos
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Falha ao enviar a demanda.");
    } finally {
      setEnvLoading(false);
    }
  }

  /* ===== ações por assignment (pagamento / liberar) ===== */

  async function setPaymentStatus(supplierId: string, status: "pending" | "paid") {
    try {
      const ref = doc(db, "demandAssignments", `${demandaId}_${supplierId}`);
      await updateDoc(ref, { paymentStatus: status, updatedAt: serverTimestamp() });
    } catch (e: any) {
      console.error(e);
      alert("Erro ao atualizar pagamento.");
    }
  }

  async function unlockAssignment(supplierId: string) {
    try {
      const ref = doc(db, "demandAssignments", `${demandaId}_${supplierId}`);
      await updateDoc(ref, {
        status: "unlocked",
        unlockedByAdmin: true,
        unlockedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      console.error(e);
      alert("Erro ao liberar contato.");
    }
  }

  /* ===== render ===== */

  if (loading) {
    return (
      <div style={centerBox}>
        <LoaderIcon className="animate-spin" size={28} />&nbsp; Carregando demanda...
      </div>
    );
  }

  return (
    <section style={{ maxWidth: 1240, margin: "0 auto", padding: "42px 2vw 60px 2vw" }}>
      <Link href="/admin/demandas" style={backLink}>
        <ArrowLeft size={19} /> Voltar
      </Link>

      <div style={gridWrap}>
        {/* ===== Card: Editar Demanda ===== */}
        <div style={card}>
          <h2 style={cardTitle}>Editar Necessidade</h2>

          <div style={metaLine}>
            <div><b>ID:</b> {demandaId}</div>
            {createdAt && <div><b>Criada:</b> {createdAt}</div>}
            {userId && <div><b>UserID:</b> {userId}</div>}
          </div>

          <form onSubmit={handleSubmit}>
            <label style={label}>Título da Demanda</label>
            <input
              name="titulo"
              value={form.titulo}
              onChange={handleChange}
              required
              placeholder="Ex: Preciso de mecânico para pá carregadeira"
              style={input}
            />

            <label style={label}>Descrição</label>
            <textarea
              name="descricao"
              value={form.descricao}
              onChange={handleChange}
              required
              placeholder="Detalhe sua necessidade, problema ou demanda aqui..."
              style={{ ...input, minHeight: 110, resize: "vertical" }}
            />

            <div style={twoCols}>
              <div style={{ flex: 1 }}>
                <label style={label}>Categoria</label>
                <input
                  name="categoria"
                  value={form.categoria}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Mecânico, Peça, Logística..."
                  style={input}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Tipo</label>
                <select name="tipo" value={form.tipo} onChange={handleChange} required style={input}>
                  <option value="">Selecione</option>
                  <option value="produto">Produto</option>
                  <option value="serviço">Serviço</option>
                  <option value="peça">Peça</option>
                  <option value="aluguel">Aluguel</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            <div style={twoCols}>
              <div style={{ flex: 1 }}>
                <label style={label}>Estado (UF)</label>
                <select name="estado" value={form.estado} onChange={handleChange} required style={input}>
                  <option value="">Selecione</option>
                  {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Orçamento estimado (opcional)</label>
                <input
                  name="orcamento"
                  value={form.orcamento}
                  onChange={handleChange}
                  type="number"
                  min={0}
                  placeholder="R$"
                  style={input}
                />
              </div>
            </div>

            <label style={label}>WhatsApp / Telefone (opcional)</label>
            <input
              name="whatsapp"
              value={form.whatsapp}
              onChange={handleChange}
              placeholder="(xx) xxxxx-xxxx"
              style={input}
            />

            {/* Preço padrão da demanda */}
            <div style={{ marginTop: 10 }}>
              <label style={label}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <DollarSign size={16} /> Preço padrão do desbloqueio (R$)
                </span>
              </label>
              <input
                value={precoPadraoReais}
                onChange={(e)=>setPrecoPadraoReais(e.target.value)}
                placeholder="Ex.: 19,90"
                style={input}
              />
              <div style={hintText}>Este valor será sugerido ao enviar para usuários. Você pode sobrescrever no envio.</div>
            </div>

            <label style={label}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Tag size={16} color="#fb8500" /> Referências <span style={{ color: "#94a3b8", fontWeight: 600, fontSize: 12 }}>(até 3)</span>
              </span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tags.map((tg, idx) => (
                <span key={idx} style={chip}>
                  {tg}
                  <button type="button" onClick={() => removeTag(idx)} style={chipClose}>×</button>
                </span>
              ))}
              {tags.length < 3 && (
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Nova tag"
                  maxLength={16}
                  style={{ ...input, width: 140 }}
                />
              )}
            </div>

            <label style={label}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Upload size={16} color="#2563eb" /> Anexar imagens (opcional)
              </span>
            </label>
            <ImageUploader imagens={imagens} setImagens={setImagens} max={5} />

            <label style={label}>Observações (opcional)</label>
            <textarea
              name="observacoes"
              value={form.observacoes}
              onChange={handleChange}
              placeholder="Alguma observação extra?"
              style={{ ...input, minHeight: 70 }}
            />

            <div style={{ ...twoCols, marginTop: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={label}>Status</label>
                <select name="status" value={form.status} onChange={handleChange} required style={input}>
                  <option value="Aberta">Aberta</option>
                  <option value="Finalizada">Finalizada</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="submit"
                  disabled={salvando}
                  style={primaryBtn}
                >
                  <Save size={20} /> {salvando ? "Salvando..." : "Salvar Alterações"}
                </button>
                <button
                  type="button"
                  disabled={removendo}
                  onClick={handleDelete}
                  style={dangerBtn}
                >
                  <Trash2 size={20} /> {removendo ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ===== Card: Enviar demanda para usuários ===== */}
        <div style={card}>
          <h2 style={cardTitle}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Send size={20} color="#2563eb" /> Enviar esta demanda para usuários
            </span>
          </h2>

          {/* preço do envio (sobrescreve o padrão se quiser) */}
          <div style={twoCols}>
            <div style={{ flex: 1 }}>
              <label style={label}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <DollarSign size={16} /> Preço do envio (R$)
                </span>
              </label>
              <input
                value={precoEnvioReais}
                onChange={(e)=>setPrecoEnvioReais(e.target.value)}
                placeholder={`Sugerido: ${precoPadraoReais}`}
                style={input}
              />
              <div style={hintText}>Sem centavos automáticos. Digite em reais (ex.: 25,00).</div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>Opções</label>
              <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#0f172a", opacity: .55 }}>
                  <input type="checkbox" disabled />
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <ShieldCheck size={16} /> Exclusivo (em breve)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* filtros e busca */}
          <div style={{ ...twoCols, marginTop: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={label}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Search size={16} /> Buscar por nome, e-mail ou ID
                </span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  value={busca}
                  onChange={(e)=>setBusca(e.target.value)}
                  onKeyDown={(e)=> e.key === "Enter" ? executarBuscaNow(busca) : undefined}
                  placeholder="Digite e tecle Enter ou clique em Buscar"
                  style={{ ...input, paddingLeft: 36 }}
                />
                <Search size={16} style={{ position: "absolute", left: 10, top: 12, color: "#a3a3a3" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div>
                <label style={miniLabel}>
                  <Filter size={13} /> Categoria
                </label>
                <select value={fCat} onChange={(e)=>setFCat(e.target.value)} style={{ ...input, width: 160 }}>
                  <option value="">Todas</option>
                  {form.categoria && <option value={form.categoria}>{form.categoria}</option>}
                </select>
              </div>
              <div>
                <label style={miniLabel}>
                  <Filter size={13} /> UF
                </label>
                <select value={fUF} onChange={(e)=>setFUF(e.target.value)} style={{ ...input, width: 120 }}>
                  <option value="">Todas</option>
                  {form.estado && <option value={form.estado}>{form.estado}</option>}
                </select>
              </div>
              <button type="button" onClick={()=>loadUsuarios(true)} style={ghostBtn}>
                <RefreshCw size={16} /> Atualizar
              </button>
              <button type="button" onClick={()=>executarBuscaNow(busca)} style={ghostBtn}>
                <Search size={16} /> Buscar
              </button>
            </div>
          </div>

          {/* lista de candidatos */}
          <div style={{ border: "1.5px solid #eaeef4", borderRadius: 14, overflow: "hidden", marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8fafc", borderBottom: "1px solid #eef2f7" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#334155", fontWeight: 800, fontSize: 13 }}>
                <Users size={16} /> Usuários
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Selecionados: <b>{selUsuarios.length}</b>
              </div>
            </div>

            <div style={{ maxHeight: "56vh", overflow: "auto" }}>
              {candidatos.map((u) => {
                const nome = u.nome || u.email || `Usuário ${u.id}`;
                const contato = u.whatsapp || u.telefone || "—";
                const regioes = u.ufs?.length ? u.ufs.join(", ") : (u.estado || "—");
                const cats = u.categorias?.length ? u.categorias.join(", ") : "—";
                const already = jaEnviados.has(u.id);
                const selected = selUsuarios.includes(u.id);
                const st = statusPorUsuario[u.id];
                const pay = pagamentoPorUsuario[u.id] || "pending";
                return (
                  <label key={u.id} style={rowItem(already ? "#f1fff6" : selected ? "#f1f5ff" : "#fff")}>
                    <input
                      type="checkbox"
                      checked={selected || already}
                      disabled={already}
                      onChange={(e) => toggleUsuario(u.id, e.target.checked)}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: "#0f172a" }}>
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome}</span>
                        {already && (
                          <span style={selPill}><CheckCircle2 size={12}/> enviado</span>
                        )}
                        {already && st === "unlocked" && (
                          <span style={pillGreen}><LockOpen size={12}/> liberado</span>
                        )}
                        {already && (
                          <span style={pay === "paid" ? pillPayGreen : pillPayYellow}>
                            <CreditCard size={12}/> {pay === "paid" ? "pago" : "pendente"}
                          </span>
                        )}
                      </div>
                      <div style={subLine}>
                        {u.email || "—"} • {contato} • {u.cidade || "—"}/{regioes}
                      </div>
                      <div style={subMicro}>Categorias: {cats}</div>
                    </div>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>#{u.id}</span>
                  </label>
                );
              })}

              {!loadingUsuarios && candidatos.length === 0 && (
                <div style={{ padding: "24px 12px", textAlign: "center", color: "#64748b", fontSize: 14 }}>
                  Nenhum usuário encontrado. Ajuste a busca ou os filtros.
                </div>
              )}

              {loadingUsuarios && (
                <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 14 }}>
                  <LoaderIcon className="animate-spin" size={16}/> Carregando...
                </div>
              )}
            </div>

            {!paging.ended && (
              <div style={{ display: "flex", justifyContent: "center", padding: 10, background: "#f8fafc", borderTop: "1px solid #eef2f7" }}>
                <button type="button" onClick={()=>loadUsuarios(false)} style={ghostBtn}>Carregar mais</button>
              </div>
            )}
          </div>

          {/* ações de envio */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button type="button" onClick={selecionarTodosVisiveis} style={ghostBtn}>Selecionar visíveis</button>
            <button type="button" onClick={limparSelecao} style={ghostBtn}>Limpar seleção</button>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={enviarParaSelecionados}
              disabled={envLoading || selUsuarios.length === 0}
              style={primaryBtn}
            >
              <Send size={18}/> {envLoading ? "Enviando..." : `Enviar (${selUsuarios.length})`}
            </button>
          </div>
        </div>

        {/* ===== Card: Envios realizados (controle admin) ===== */}
        <div style={card}>
          <h2 style={cardTitle}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Users size={20} color="#2563eb" /> Envios realizados
            </span>
          </h2>

          {assignments.length === 0 ? (
            <div style={emptyBox}>Nenhum envio ainda.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {assignments
                .slice()
                .sort((a,b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
                .map((a) => (
                <AssignmentRow
                  key={a.id}
                  a={a}
                  onPago={() => setPaymentStatus(a.supplierId, "paid")}
                  onPendente={() => setPaymentStatus(a.supplierId, "pending")}
                  onLiberar={() => unlockAssignment(a.supplierId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ===== Row de assignment com infos do usuário ===== */
function AssignmentRow({
  a,
  onPago,
  onPendente,
  onLiberar,
}: {
  a: Assignment;
  onPago: () => void;
  onPendente: () => void;
  onLiberar: () => void;
}) {
  const [user, setUser] = useState<Usuario | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await getDoc(doc(db, "usuarios", a.supplierId));
        if (s.exists()) setUser({ id: s.id, ...(s.data() as any) });
      } catch {}
    })();
  }, [a.supplierId]);

  const nome = user?.nome || user?.email || `Usuário ${a.supplierId}`;
  const contato = user?.whatsapp || user?.telefone || "—";
  const cidadeUf = `${user?.cidade || "—"}/${user?.estado || "—"}`;
  const status = a.status;
  const pago = a.paymentStatus === "paid";

  return (
    <div style={{
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 12,
      display: "grid",
      gridTemplateColumns: "1.2fr 1fr auto",
      gap: 10,
      alignItems: "center"
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt={nome} style={{ width: 28, height: 28, borderRadius: "50%" }}/>
          ) : (
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>
              {(nome || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome}</span>
        </div>
        <div style={subLine}>{user?.email || "—"} • {contato} • {cidadeUf}</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={status === "unlocked" ? pillGreen : selPill}>
          {status === "unlocked" ? <LockOpen size={12}/> : <CheckCircle2 size={12}/>} {status}
        </span>
        <span style={pago ? pillPayGreen : pillPayYellow}>
          <CreditCard size={12}/> {pago ? "pago" : "pendente"}
        </span>
        {a.pricing?.amount != null && (
          <span style={pillPrice}>
            R$ {(a.pricing.amount/100).toFixed(2).replace(".", ",")}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {!pago ? (
          <button onClick={onPago} style={miniBtnGreen}><CreditCard size={14}/> Marcar pago</button>
        ) : (
          <button onClick={onPendente} style={miniBtnYellow}><Undo2 size={14}/> Marcar pendente</button>
        )}
        {status !== "unlocked" && (
          <button onClick={onLiberar} style={miniBtnBlue}><LockOpen size={14}/> Liberar contato</button>
        )}
      </div>
    </div>
  );
}

/* ===== estilos ===== */
const backLink: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
  color: "#2563eb", fontWeight: 800, fontSize: 16, textDecoration: "none"
};
const gridWrap: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 18
};
const card: React.CSSProperties = {
  background: "#fff", borderRadius: 18, boxShadow: "0 2px 16px #0001",
  padding: "26px 22px"
};
const cardTitle: React.CSSProperties = {
  fontWeight: 900, fontSize: "1.55rem", color: "#023047", marginBottom: 10
};
const metaLine: React.CSSProperties = {
  display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12, color: "#94a3b8", fontSize: 13
};
const twoCols: React.CSSProperties = {
  display: "flex", gap: 14, flexWrap: "wrap"
};
const label: React.CSSProperties = {
  fontWeight: 800, fontSize: 15, color: "#2563eb", marginBottom: 7, marginTop: 14, display: "block"
};
const miniLabel: React.CSSProperties = {
  fontWeight: 800, fontSize: 12, color: "#64748b", marginBottom: 6, display: "block"
};
const input: React.CSSProperties = {
  width: "100%", marginTop: 6, padding: "12px 13px", borderRadius: 10,
  border: "1.5px solid #e5e7eb", fontSize: 16, color: "#023047",
  background: "#f8fafc", fontWeight: 600, outline: "none"
};
const chip: React.CSSProperties = {
  background: "#fff7ea", color: "#fb8500", fontWeight: 800,
  padding: "6px 10px", borderRadius: 12, border: "1px solid #ffe4c4",
  display: "inline-flex", alignItems: "center", gap: 8
};
const chipClose: React.CSSProperties = {
  border: "none", background: "transparent", color: "#fb8500", fontWeight: 900, cursor: "pointer"
};
const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  gap: 10, background: "#2563eb", color: "#fff", border: "none",
  fontWeight: 900, fontSize: "1rem", padding: "12px 16px", borderRadius: 12,
  cursor: "pointer", boxShadow: "0 2px 14px #0001"
};
const dangerBtn: React.CSSProperties = {
  ...primaryBtn, background: "#e11d48"
};
const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  gap: 8, background: "#f8fafc", color: "#0f172a", border: "1.5px solid #e5e7eb",
  fontWeight: 800, fontSize: "0.95rem", padding: "10px 14px", borderRadius: 10, cursor: "pointer"
};
const rowItem = (bg:string): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
  background: bg
});
const selPill: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px",
  borderRadius: 999, background: "#eef2ff", color: "#3730a3", border: "1px solid #e0e7ff", fontSize: 11, fontWeight: 800
};
const pillGreen: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px",
  borderRadius: 999, background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", fontSize: 11, fontWeight: 800
};
const pillPayGreen: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px",
  borderRadius: 999, background: "#ecfdf5", color: "#065f46",
  border: "1px solid #a7f3d0", fontSize: 11, fontWeight: 800
};
const pillPayYellow: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px",
  borderRadius: 999, background: "#fff7ed", color: "#9a3412",
  border: "1px solid #fed7aa", fontSize: 11, fontWeight: 800
};
const pillPrice: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px",
  borderRadius: 999, background: "#f1f5f9", color: "#0f172a",
  border: "1px solid #e2e8f0", fontSize: 11, fontWeight: 800
};

// botões mini (linhas de assignment)
const miniBtnGreen: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "#16a34a", color: "#fff", border: "1px solid #16a34a",
  fontWeight: 800, fontSize: 12, padding: "8px 10px", borderRadius: 9, cursor: "pointer",
  boxShadow: "0 2px 10px #16a34a22"
};
const miniBtnYellow: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "#f59e0b", color: "#fff", border: "1px solid #f59e0b",
  fontWeight: 800, fontSize: 12, padding: "8px 10px", borderRadius: 9, cursor: "pointer",
  boxShadow: "0 2px 10px #f59e0b22"
};
const miniBtnBlue: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "#2563eb", color: "#fff", border: "1px solid #2563eb",
  fontWeight: 800, fontSize: 12, padding: "8px 10px", borderRadius: 9, cursor: "pointer",
  boxShadow: "0 2px 10px #2563eb22"
};

const subLine: React.CSSProperties = { fontSize: 12, color: "#64748b", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const subMicro: React.CSSProperties = { fontSize: 11, color: "#94a3b8", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const hintText: React.CSSProperties = { fontSize: 11, color: "#94a3b8", marginTop: 6 };
const centerBox: React.CSSProperties = { minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" };
const emptyBox: React.CSSProperties = {
  background: "#f8fafc", border: "1px dashed #e2e8f0", borderRadius: 12,
  padding: 16, color: "#475569"
};

/* ===== responsividade: quebra em duas colunas em telas >= 1100px ===== */
if (typeof window !== "undefined") {
  const styleId = "pedraum-edit-demand-responsive";
  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = styleId;
    document.head.appendChild(style);
  }
  style.innerHTML = `
    @media (min-width: 1100px) {
      section > div[style*="grid-template-columns: 1fr"] {
        grid-template-columns: 1fr 1fr !important;
      }
      /* Ajusta as colunas do bloco de assignment para caber melhor em telas largas */
      div[style*="grid-template-columns: 1.2fr 1fr auto"] {
        grid-template-columns: 1.2fr 1fr auto !important;
      }
    }
    @media (max-width: 640px) {
      /* Em telas pequenas, colapsa a linha do assignment para vertical */
      div[style*="grid-template-columns: 1.2fr 1fr auto"] {
        grid-template-columns: 1fr !important;
      }
    }
  `;
}