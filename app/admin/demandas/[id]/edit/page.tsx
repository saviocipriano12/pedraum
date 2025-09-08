// app/admin/demandas/[id]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  where,
  writeBatch,
  serverTimestamp,
  orderBy,
  limit,
  startAfter,
  startAt,
  endAt,
  onSnapshot,
  arrayRemove,
  arrayUnion,
} from "firebase/firestore";
import {
  Loader as LoaderIcon,
  ArrowLeft,
  Save,
  Trash2,
  Upload,
  Tag,
  Send,
  Users,
  Filter,
  DollarSign,
  ShieldCheck,
  Search,
  RefreshCw,
  CheckCircle2,
  LockOpen,
  CreditCard,
  Undo2,
  XCircle,
  Ban,
} from "lucide-react";
import ImageUploader from "@/components/ImageUploader";

// --- Categorias globais para filtro (pode importar de onde centralizou a TAXONOMIA) ---
const TAXONOMIA: Record<string, string[]> = {
  "Equipamentos de Perfuração e Demolição": [],
  "Equipamentos de Carregamento e Transporte": [],
  "Britagem e Classificação": [],
  "Beneficiamento e Processamento Mineral": [],
  "Peças e Componentes Industriais": [],
  "Desgaste e Revestimento": [],
  "Automação, Elétrica e Controle": [],
  "Lubrificação e Produtos Químicos": [],
  "Equipamentos Auxiliares e Ferramentas": [],
  "EPIs (Equipamentos de Proteção Individual)": [],
  "Instrumentos de Medição e Controle": [],
  "Manutenção e Serviços Industriais": [],
  "Veículos e Pneus": [],
  "Outros": [],
};
const TODAS_CATEGORIAS = Object.keys(TAXONOMIA);
const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

/* ===================== Tipos ===================== */
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

type AssignmentStatus = "sent" | "viewed" | "unlocked" | "canceled";
type PaymentStatus = "pending" | "paid";

type Assignment = {
  id: string;
  demandId: string;
  supplierId: string;
  status: AssignmentStatus;
  pricing?: { amount?: number; currency?: string; exclusive?: boolean; cap?: number; soldCount?: number };
  paymentStatus?: PaymentStatus;
  createdAt?: any;
  updatedAt?: any;
  unlockedByAdmin?: boolean;
  unlockedAt?: any;
};

type Demanda = {
  titulo?: string;
  descricao?: string;
  categoria?: string;
  subcategoria?: string;
  estado?: string;
  cidade?: string;
  prazo?: string;
  orcamento?: number | string;
  whatsapp?: string;
  observacoes?: string;
  imagens?: string[];
  tags?: string[];
  pricingDefault?: { amount?: number; currency?: string };
  createdAt?: any;
  status?: string;
  userId?: string;
  // novos
  unlockCap?: number;
  liberadoPara?: string[];
};

/* ===================== Helpers ===================== */
const toReais = (cents?: number) =>
  `R$ ${((Number(cents || 0) / 100) || 0).toFixed(2).replace(".", ",")}`;
const reaisToCents = (val: string) => {
  const n = Number(val.replace(/\./g, "").replace(",", "."));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
};

function chip(colorBg: string, colorText: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 10px",
    borderRadius: 999,
    background: colorBg,
    color: colorText,
    border: "1px solid #e5e7eb",
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.2,
  };
}

/* ===================== Página ===================== */
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

  const [form, setForm] = useState<Required<Pick<
    Demanda,
    "titulo" | "descricao" | "categoria" | "subcategoria" | "estado" | "cidade" | "prazo" | "observacoes"
  >> & { orcamento: string; whatsapp: string }>({
    titulo: "",
    descricao: "",
    categoria: "",
    subcategoria: "",
    estado: "",
    cidade: "",
    prazo: "",
    orcamento: "",
    whatsapp: "",
    observacoes: "",
  });

  const [createdAt, setCreatedAt] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  /* ===== preço padrão + envio ===== */
  const [precoPadraoReais, setPrecoPadraoReais] = useState<string>("19,90");
  const [precoEnvioReais, setPrecoEnvioReais] = useState<string>("");

  /* ===== CAP (limite de desbloqueios) ===== */
  const [unlockCap, setUnlockCap] = useState<number | null>(null);

  /* ===== busca/envio para usuários ===== */
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [paging, setPaging] = useState<{ last?: any; ended?: boolean }>({ ended: false });
  const [selUsuarios, setSelUsuarios] = useState<string[]>([]);
  const [envLoading, setEnvLoading] = useState(false);

  // já enviados (stream)
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const jaEnviados = useMemo(() => new Set(assignments.map(a => a.supplierId)), [assignments]);

  // estados de busca
  const [busca, setBusca] = useState("");
  const [fCat, setFCat] = useState("");
  const [fUF, setFUF] = useState("");

  const debounceRef = useRef<any>(null);

  /* ===================== carregar demanda ===================== */
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
      const d = snap.data() as Demanda;

      setForm({
        titulo: d.titulo || "",
        descricao: d.descricao || "",
        categoria: d.categoria || "",
        subcategoria: d.subcategoria || "",
        estado: d.estado || "",
        cidade: d.cidade || "",
        prazo: d.prazo || "",
        orcamento: d.orcamento ? String(d.orcamento) : "",
        whatsapp: d.whatsapp || "",
        observacoes: d.observacoes || "",
      });
      setTags(d.tags || []);
      setImagens(d.imagens || []);
      setUserId(d.userId || "");

      setCreatedAt(
        d.createdAt?.seconds
          ? new Date(d.createdAt.seconds * 1000).toLocaleString("pt-BR")
          : ""
      );

      const cents = d?.pricingDefault?.amount ?? 1990;
      setPrecoPadraoReais((cents / 100).toFixed(2).replace(".", ","));
      setPrecoEnvioReais((cents / 100).toFixed(2).replace(".", ","));

      setUnlockCap(typeof d.unlockCap === "number" ? d.unlockCap : null);

      // filtros sugeridos
      setFCat(d.categoria || "");
      setFUF(d.estado || "");

      setLoading(false);
    }
    fetchDemanda();
  }, [demandaId, router]);

  /* ===================== stream assignments ===================== */
  useEffect(() => {
    if (!demandaId) return;
    const qAssign = query(
      collection(db, "demandAssignments"),
      where("demandId", "==", demandaId),
      limit(1000)
    );
    const unsub = onSnapshot(
      qAssign,
      (snap) => {
        const arr: Assignment[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setAssignments(arr);
      },
      (e) => console.warn("Falha ao carregar envios:", e)
    );
    return () => unsub();
  }, [demandaId]);
function docToUsuario(d: any): Usuario {
  const raw = d.data ? (d.data() as any) : (d as any); // aceita Firestore Doc ou objeto cru
  // 1) tenta categoriasAtuacao (legado salvo no PerfilPage)
  // 2) tenta categoriasAtuacaoPairs (novo: extrai as "categorias principais")
  // 3) por fim, usa categorias (se já existir no usuário)
  let categorias: string[] = [];
  if (Array.isArray(raw.categoriasAtuacao)) {
    categorias = raw.categoriasAtuacao;
  } else if (Array.isArray(raw.categoriasAtuacaoPairs)) {
    categorias = raw.categoriasAtuacaoPairs
      .map((p: any) => p?.categoria)
      .filter(Boolean);
  } else if (Array.isArray(raw.categorias)) {
    categorias = raw.categorias;
  }

  // UF(s): alguns perfis guardam ufsAtendidas (perfil novo) ou ufs (antigo)
  const ufs = Array.isArray(raw.ufsAtendidas)
    ? raw.ufsAtendidas
    : Array.isArray(raw.ufs)
    ? raw.ufs
    : [];

  return {
    id: d.id ?? raw.id,
    ...raw,
    categorias,
    ufs,
  } as Usuario;
}

  /* ===================== catálogo usuários ===================== */
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
      const list: Usuario[] = snap.docs.map(docToUsuario);
      setUsuarios(prev => reset ? list : [...prev, ...list]);
      setPaging({ last: snap.docs[snap.docs.length - 1], ended: snap.size < 40 });
    } finally {
      setLoadingUsuarios(false);
    }
  }

  /* ===================== busca (debounce) ===================== */
  async function executarBuscaNow(term: string) {
    setLoadingUsuarios(true);
    try {
      const t = term.trim();
      if (!t) {
        await loadUsuarios(true);
        return;
      }
      const resultados = new Map<string, Usuario>();

      if (t.length >= 8) {
  try {
    const byId = await getDoc(doc(db, "usuarios", t));
    if (byId.exists()) resultados.set(byId.id, docToUsuario(byId));
  } catch {}
}

const qEmailExato = query(collection(db, "usuarios"), where("email", "==", t.toLowerCase()));
const s1 = await getDocs(qEmailExato);
s1.forEach(d => resultados.set(d.id, docToUsuario(d)));


      const tCap = t.charAt(0).toUpperCase() + t.slice(1);
     const qNome = query(
  collection(db, "usuarios"),
  orderBy("nome"),
  startAt(tCap),
  endAt(tCap + "\uf8ff"),
  limit(50)
);
const s2 = await getDocs(qNome);
s2.forEach(d => resultados.set(d.id, docToUsuario(d)));


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
s3.forEach(d => resultados.set(d.id, docToUsuario(d)));

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

  /* ===================== filtragem local ===================== */
  const candidatos = useMemo(() => {
    return usuarios.filter(u => {
      const hitCat = !fCat || (u.categorias?.includes(fCat));
      const hitUF  = !fUF || (u.ufs?.includes(fUF) || u.estado === fUF);
      return hitCat && hitUF;
    });
  }, [usuarios, fCat, fUF]);

  /* ===================== Handlers básicos ===================== */
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

  /* ===================== Persistência ===================== */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const cents = reaisToCents(precoPadraoReais);
      await updateDoc(doc(db, "demandas", demandaId), {
        ...form,
        orcamento: form.orcamento ? Number(form.orcamento) : null,
        tags,
        imagens,
        pricingDefault: { amount: cents, currency: "BRL" },
        unlockCap: unlockCap ?? null,
        updatedAt: serverTimestamp(),
      });
      alert("Demanda atualizada com sucesso!");
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

  /* ===================== Envio p/ usuários ===================== */
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
    const cents = reaisToCents(precoEnvioReais || precoPadraoReais);
    if (!cents || cents < 100) {
      alert("Defina um preço válido em reais. Ex.: 19,90");
      return;
    }

    setEnvLoading(true);
    try {
      const batch = writeBatch(db);
      selUsuarios.forEach((uid) => {
        if (jaEnviados.has(uid)) return;
        const aRef = doc(db, "demandAssignments", `${demandaId}_${uid}`);
        batch.set(
          aRef,
          {
            demandId: demandaId,
            supplierId: uid,
            status: "sent" as AssignmentStatus,
            pricing: {
              amount: cents,
              currency: "BRL",
              exclusive: false,
              cap: unlockCap ?? null,
              soldCount: 0,
            },
            paymentStatus: "pending" as PaymentStatus,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });
      batch.update(doc(db, "demandas", demandaId), { lastSentAt: serverTimestamp() });
      await batch.commit();
      alert(`Enviado para ${selUsuarios.length} usuário(s).`);
      setSelUsuarios([]);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Falha ao enviar a demanda.");
    } finally {
      setEnvLoading(false);
    }
  }

  /* ===================== Ações por assignment ===================== */
  async function setPaymentStatus(supplierId: string, status: PaymentStatus) {
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
      const aRef = doc(db, "demandAssignments", `${demandaId}_${supplierId}`);

      // Checa cap atual
      const dSnap = await getDoc(doc(db, "demandas", demandaId));
      const dData = dSnap.data() as Demanda;
      const cap = typeof dData?.unlockCap === "number" ? dData.unlockCap : null;

      const curUnlocked = assignments.filter(a => a.status === "unlocked").length;
      if (cap != null && curUnlocked >= cap) {
        alert(`Limite de desbloqueios atingido (${cap}).`);
        return;
      }

      // Libera
      await updateDoc(aRef, {
        status: "unlocked",
        unlockedByAdmin: true,
        unlockedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        paymentStatus: "paid",
      });

      // garante liberação no doc da demanda
      await updateDoc(doc(db, "demandas", demandaId), {
        liberadoPara: arrayUnion(supplierId),
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      console.error(e);
      alert("Erro ao liberar contato.");
    }
  }

  async function cancelAssignment(supplierId: string) {
    if (!window.confirm("Cancelar o envio? O fornecedor não poderá pagar/desbloquear.")) return;
    try {
      const aRef = doc(db, "demandAssignments", `${demandaId}_${supplierId}`);
      await updateDoc(aRef, {
        status: "canceled",
        paymentStatus: "pending",
        updatedAt: serverTimestamp(),
      });
      // Remove acesso se existia
      await updateDoc(doc(db, "demandas", demandaId), {
        liberadoPara: arrayRemove(supplierId),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
      await deleteDoc(doc(db, "demandas", demandaId, "acessos", supplierId)).catch(() => {});
    } catch (e: any) {
      console.error(e);
      alert("Erro ao cancelar envio.");
    }
  }

  async function reactivateAssignment(supplierId: string) {
    try {
      const aRef = doc(db, "demandAssignments", `${demandaId}_${supplierId}`);
      await updateDoc(aRef, {
        status: "sent",
        paymentStatus: "pending",
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      console.error(e);
      alert("Erro ao reativar envio.");
    }
  }

  async function deleteAssignment(supplierId: string) {
    if (!window.confirm("Excluir completamente o envio? Isso remove o acesso e do painel do fornecedor.")) return;
    try {
      // remove do array liberadoPara (se estiver)
      await updateDoc(doc(db, "demandas", demandaId), {
        liberadoPara: arrayRemove(supplierId),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
      // remove subdoc de acesso
      await deleteDoc(doc(db, "demandas", demandaId, "acessos", supplierId)).catch(() => {});
      // apaga assignment
      await deleteDoc(doc(db, "demandAssignments", `${demandaId}_${supplierId}`));
    } catch (e: any) {
      console.error(e);
      alert("Erro ao excluir envio.");
    }
  }

  /* ===================== Contagens úteis ===================== */
  const unlockedCount = useMemo(
    () => assignments.filter(a => a.status === "unlocked").length,
    [assignments]
  );
  const capInfo = unlockCap != null ? `${unlockedCount}/${unlockCap}` : String(unlockedCount);

  /* ===================== Render ===================== */
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
        {/* ================= Card: Editar Demanda ================= */}
        <div style={card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <h2 style={cardTitle}>Editar Necessidade</h2>

            {/* CAP compacto no topo */}
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontSize:12,color:"#64748b",fontWeight:800}}>Limite de desbloqueios</div>
              <input
                type="number"
                min={0}
                value={unlockCap ?? ""}
                onChange={(e) => setUnlockCap(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
                style={{...input, width: 100}}
                placeholder="Ex.: 5"
              />
              <div style={{fontSize:12,color:"#64748b",fontWeight:800}}>Liberados: <b>{capInfo}</b></div>
            </div>
          </div>

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
              placeholder="Ex: Preciso de peça X / serviço Y"
              style={input}
            />

            <label style={label}>Descrição</label>
            <textarea
              name="descricao"
              value={form.descricao}
              onChange={handleChange}
              required
              placeholder="Detalhe sua necessidade..."
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
                  placeholder="Ex: Peça / Serviço / Automação ..."
                  style={input}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Subcategoria</label>
                <input
                  name="subcategoria"
                  value={form.subcategoria}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Mandíbulas, Rolamentos, CLP..."
                  style={input}
                />
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
                <label style={label}>Cidade</label>
                <input
                  name="cidade"
                  value={form.cidade}
                  onChange={handleChange}
                  placeholder="Ex.: Belo Horizonte"
                  style={input}
                />
              </div>
            </div>

            <div style={twoCols}>
              <div style={{ flex: 1 }}>
                <label style={label}>WhatsApp / Telefone (opcional)</label>
                <input
                  name="whatsapp"
                  value={form.whatsapp}
                  onChange={handleChange}
                  placeholder="(xx) xxxxx-xxxx"
                  style={input}
                />
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
              <div style={hintText}>Sugerido ao enviar para usuários. Pode ser sobrescrito no envio.</div>
            </div>

            <label style={label}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Tag size={16} color="#fb8500" /> Referências <span style={{ color: "#94a3b8", fontWeight: 600, fontSize: 12 }}>(até 3)</span>
              </span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tags.map((tg, idx) => (
                <span key={idx} style={chipTag}>
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

            <div style={{ display:"flex", gap: 10, flexWrap: "wrap", marginTop: 14, justifyContent:"space-between" }}>
              <div />
              <div style={{ display:"flex", gap: 10, flexWrap:"wrap" }}>
                <button type="submit" disabled={salvando} style={primaryBtn}>
                  <Save size={20} /> {salvando ? "Salvando..." : "Salvar Alterações"}
                </button>
                <button type="button" disabled={removendo} onClick={handleDelete} style={dangerBtn}>
                  <Trash2 size={20} /> {removendo ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ================= Card: Enviar demanda ================= */}
        <div style={card}>
          <h2 style={cardTitle}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Send size={20} color="#2563eb" /> Enviar esta demanda para usuários
            </span>
          </h2>

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
              <div style={hintText}>Digite em reais, ex.: 25,00.</div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={16} /> Limite de desbloqueios (cap)
                </span>
              </label>
              <input
                type="number"
                min={0}
                value={unlockCap ?? ""}
                onChange={(e) => setUnlockCap(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
                style={input}
                placeholder="Ex.: 5"
              />
              <div style={hintText}>A demanda respeita este limite total de desbloqueios.</div>
            </div>
          </div>

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
<select value={fCat} onChange={(e)=>setFCat(e.target.value)} style={{ ...input, width: 220 }}>
  <option value="">Todas</option>
  {TODAS_CATEGORIAS.map((c) => (
    <option key={c} value={c}>{c}</option>
  ))}
</select>

              </div>
              <div>
                <label style={miniLabel}>
                  <Filter size={13} /> UF
                </label>
<select value={fUF} onChange={(e)=>setFUF(e.target.value)} style={{ ...input, width: 140 }}>
  <option value="">Todas</option>
  {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
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
          <div style={listBox}>
            <div style={listHeader}>
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
                        {already && <span style={chip("#eef2ff", "#3730a3")}><CheckCircle2 size={12}/> enviado</span>}
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

        {/* ================= Card: Envios realizados ================= */}
        <div style={card}>
          <h2 style={cardTitle}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Users size={20} color="#2563eb" /> Envios realizados
            </span>
          </h2>

          {assignments.length === 0 ? (
            <div style={emptyBox}>Nenhum envio ainda.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {/* Cabeçalho da tabela */}
              <div style={tableHeader}>
                <div style={{flex: 1.7}}>Fornecedor</div>
                <div style={{flex: 1}}>Status</div>
                <div style={{flex: 0.8}}>Pagamento</div>
                <div style={{flex: 0.6, textAlign:"right"}}>Preço</div>
                <div style={{flex: 0.6, textAlign:"right"}}>Cap</div>
                <div style={{flex: 1.6, textAlign:"right"}}>Ações</div>
              </div>

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
                    onCancelar={() => cancelAssignment(a.supplierId)}
                    onExcluir={() => deleteAssignment(a.supplierId)}
                    onReativar={() => reactivateAssignment(a.supplierId)}
                  />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ================= Assignment Row ================= */
function AssignmentRow({
  a,
  onPago,
  onPendente,
  onLiberar,
  onCancelar,
  onExcluir,
  onReativar,
}: {
  a: Assignment;
  onPago: () => void;
  onPendente: () => void;
  onLiberar: () => void;
  onCancelar: () => void;
  onExcluir: () => void;
  onReativar: () => void;
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
  const pago = a.paymentStatus === "paid";

  const stChip =
    a.status === "unlocked"
      ? chip("#ecfdf5", "#065f46")
      : a.status === "canceled"
      ? chip("#fff1f2", "#9f1239")
      : a.status === "viewed"
      ? chip("#eef2ff", "#3730a3")
      : chip("#f1f5f9", "#111827");

  const payChip = pago ? chip("#ecfdf5", "#065f46") : chip("#fff7ed", "#9a3412");

  return (
    <div style={tableRow}>
      <div style={{flex:1.7,minWidth:0}}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt={nome} style={{ width: 28, height: 28, borderRadius: "50%" }}/>
          ) : (
            <div style={avatarBox}>{(nome || "?").charAt(0).toUpperCase()}</div>
          )}
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome}</span>
        </div>
        <div style={subLine}>{user?.email || "—"} • {contato} • {cidadeUf}</div>
      </div>

      <div style={{flex:1}}>
        <span style={stChip}>
          {a.status === "unlocked" ? <LockOpen size={12}/> :
           a.status === "canceled" ? <Ban size={12}/> :
           a.status === "viewed" ? <CheckCircle2 size={12}/> : <CheckCircle2 size={12}/> }
          {a.status}
        </span>
      </div>

      <div style={{flex:0.8}}>
        <span style={payChip}>
          <CreditCard size={12}/> {pago ? "pago" : "pendente"}
        </span>
      </div>

      <div style={{flex:0.6,textAlign:"right",fontWeight:900,color:"#0f172a"}}>
        {toReais(a.pricing?.amount)}
      </div>

      <div style={{flex:0.6,textAlign:"right",color:"#64748b",fontWeight:800}}>
        {a.pricing?.cap != null ? a.pricing.cap : "—"}
      </div>

      <div style={{flex:1.6,display:"flex",gap:8,justifyContent:"flex-end",flexWrap:"wrap"}}>
        {!pago ? (
          <button onClick={onPago} style={miniBtnGreen}><CreditCard size={14}/> Marcar pago</button>
        ) : (
          <button onClick={onPendente} style={miniBtnYellow}><Undo2 size={14}/> Pendente</button>
        )}

        {a.status !== "unlocked" && a.status !== "canceled" && (
          <button onClick={onLiberar} style={miniBtnBlue}><LockOpen size={14}/> Liberar contato</button>
        )}

        {a.status !== "canceled" && a.status !== "unlocked" && (
          <button onClick={onCancelar} style={miniBtnOrange}><Ban size={14}/> Cancelar envio</button>
        )}

        {a.status === "canceled" && (
          <button onClick={onReativar} style={miniBtnGray}><RefreshCw size={14}/> Reativar envio</button>
        )}

        <button onClick={onExcluir} style={miniBtnRed}><XCircle size={14}/> Excluir envio</button>
      </div>
    </div>
  );
}

/* ===================== Estilos ===================== */
const backLink: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
  color: "#2563eb", fontWeight: 800, fontSize: 16, textDecoration: "none"
};
const gridWrap: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr", gap: 18 };
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
const twoCols: React.CSSProperties = { display: "flex", gap: 14, flexWrap: "wrap" };
const label: React.CSSProperties = {
  fontWeight: 800, fontSize: 15, color: "#2563eb", marginBottom: 7, marginTop: 14, display: "block"
};
const miniLabel: React.CSSProperties = { fontWeight: 800, fontSize: 12, color: "#64748b", marginBottom: 6, display: "block" };
const input: React.CSSProperties = {
  width: "100%", marginTop: 6, padding: "12px 13px", borderRadius: 10,
  border: "1.5px solid #e5e7eb", fontSize: 16, color: "#023047",
  background: "#f8fafc", fontWeight: 600, outline: "none"
};
const chipTag: React.CSSProperties = {
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
const dangerBtn: React.CSSProperties = { ...primaryBtn, background: "#e11d48" };
const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  gap: 8, background: "#f8fafc", color: "#0f172a", border: "1.5px solid #e5e7eb",
  fontWeight: 800, fontSize: "0.95rem", padding: "10px 14px", borderRadius: 10, cursor: "pointer"
};
const listBox: React.CSSProperties = { border: "1.5px solid #eaeef4", borderRadius: 14, overflow: "hidden", marginTop: 14 };
const listHeader: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "10px 12px", background: "#f8fafc", borderBottom: "1px solid #eef2f7"
};
const rowItem = (bg:string): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
  background: bg
});
const subLine: React.CSSProperties = { fontSize: 12, color: "#64748b", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const subMicro: React.CSSProperties = { fontSize: 11, color: "#94a3b8", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const hintText: React.CSSProperties = { fontSize: 11, color: "#94a3b8", marginTop: 6 };
const centerBox: React.CSSProperties = { minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" };
const emptyBox: React.CSSProperties = {
  background: "#f8fafc", border: "1px dashed #e2e8f0", borderRadius: 12,
  padding: 16, color: "#475569"
};

/* ===== tabela Envios (mais legível) ===== */
const tableHeader: React.CSSProperties = {
  display: "flex",
  gap: 12,
  padding: "10px 12px",
  background: "#f8fafc",
  border: "1px solid #eef2f7",
  borderRadius: 12,
  fontSize: 12,
  color: "#475569",
  fontWeight: 900,
};
const tableRow: React.CSSProperties = {
  display: "flex",
  gap: 12,
  padding: "12px 12px",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  alignItems: "center",
};
const avatarBox: React.CSSProperties = {
  width: 28, height: 28, borderRadius: "50%", background: "#f1f5f9",
  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900
};

/* ===== mini botões ===== */
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
const miniBtnOrange: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "#fb923c", color: "#fff", border: "1px solid #fb923c",
  fontWeight: 800, fontSize: 12, padding: "8px 10px", borderRadius: 9, cursor: "pointer",
  boxShadow: "0 2px 10px #fb923c22"
};
const miniBtnGray: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "#475569", color: "#fff", border: "1px solid #475569",
  fontWeight: 800, fontSize: 12, padding: "8px 10px", borderRadius: 9, cursor: "pointer",
  boxShadow: "0 2px 10px #47556922"
};
const miniBtnRed: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "#e11d48", color: "#fff", border: "1px solid #e11d48",
  fontWeight: 800, fontSize: 12, padding: "8px 10px", borderRadius: 9, cursor: "pointer",
  boxShadow: "0 2px 10px #e11d4822"
};

/* ===== responsividade ===== */
if (typeof window !== "undefined") {
  const styleId = "pedraum-edit-demand-responsive-v2";
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
    }
    @media (max-width: 860px) {
      /* Tabela de envios: quebra para leitura melhor no mobile */
      div[style*="display: flex"][style*="gap: 12px"][style*="align-items: center"][style*="border: 1px solid #e5e7eb"] {
        flex-direction: column !important;
        align-items: flex-start !important;
      }
      div[style*="display: flex"][style*="gap: 12px"][style*="padding: 10px 12px"][style*="border: 1px solid #eef2f7"] {
        display: none !important; /* esconde header em mobile */
      }
    }
  `;
}
