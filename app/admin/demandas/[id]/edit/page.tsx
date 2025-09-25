// app/admin/demandas/[id]/page.tsx
"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/firebaseConfig";
import {
  doc, getDoc, updateDoc, deleteDoc, getDocs, collection, query, where, writeBatch,
  serverTimestamp, orderBy, limit, startAfter, startAt, endAt, onSnapshot,
  arrayRemove, arrayUnion,
} from "firebase/firestore";
import {
  Loader as LoaderIcon, ArrowLeft, Save, Trash2, Upload, Tag, Send, Users, Filter,
  DollarSign, ShieldCheck, Search, RefreshCw, CheckCircle2, LockOpen, CreditCard,
  Undo2, XCircle, Ban,
} from "lucide-react";
import ImageUploader from "@/components/ImageUploader";

// ✅ use a mesma fonte de categorias/subcategorias do restante do app
import { useTaxonomia } from "@/hooks/useTaxonomia";

/** ================== Tipos ================== */
type Usuario = {
  id: string;
  nome?: string;
  email?: string;
  whatsapp?: string;
  telefone?: string;
  estado?: string;
  ufs?: string[];
  atendeBrasil?: boolean;
  cidade?: string;
  categorias?: string[];
  categoriasAtuacaoPairs?: { categoria: string; subcategoria: string }[];
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
  unlockCap?: number;
  liberadoPara?: string[];
};

/** ================== Constantes ================== */
const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

/** ================== Helpers ================== */
const toReais = (cents?: number) =>
  `R$ ${((Number(cents || 0) / 100) || 0).toFixed(2).replace(".", ",")}`;

const reaisToCents = (val: string) => {
  const n = Number(val.replace(/\./g, "").replace(",", "."));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
};

const chip = (bg: string, fg: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px",
  borderRadius: 999, background: bg, color: fg, border: "1px solid #e5e7eb",
  fontSize: 12, fontWeight: 800, lineHeight: 1.2,
});

const isNonEmptyString = (v: any): v is string => typeof v === "string" && v.trim() !== "";

// Normaliza string para comparação robusta
const norm = (s?: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

// Monta o token usado em pairsSearch: cat::sub
function pairToken(cat?: string, sub?: string) {
  const c = norm(cat);
  const s = norm(sub);
  return c && s ? `${c}::${s}` : "";
}

/** ================== Página ================== */
export default function EditDemandaPage() {
  const router = useRouter();
  const params = useParams();
  const demandaId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params!.id[0]
      : "";

  // 🔗 mesma taxonomia do create/perfil
  const { categorias, loading: taxLoading } = useTaxonomia();

  /** ------- Estados principais ------- */
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);

  const [imagens, setImagens] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [form, setForm] = useState<Required<Pick<
    Demanda, "titulo"|"descricao"|"categoria"|"subcategoria"|"estado"|"cidade"|"prazo"|"observacoes"
  >> & { orcamento: string; whatsapp: string }>({
    titulo: "", descricao: "", categoria: "", subcategoria: "", estado: "", cidade: "",
    prazo: "", orcamento: "", whatsapp: "", observacoes: "",
  });

  const [createdAt, setCreatedAt] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  const [precoPadraoReais, setPrecoPadraoReais] = useState<string>("19,90");
  const [precoEnvioReais, setPrecoEnvioReais] = useState<string>("");

  const [unlockCap, setUnlockCap] = useState<number | null>(null);

  /** ------- Busca/lista de usuários ------- */
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [paging, setPaging] = useState<{ last?: any; ended?: boolean }>({ ended: false });
  const [selUsuarios, setSelUsuarios] = useState<string[]>([]);
  const [envLoading, setEnvLoading] = useState(false);

  /** ------- Enviados (stream) ------- */
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const jaEnviados = useMemo(() => new Set(assignments.map(a => a.supplierId)), [assignments]);

  /** ------- Filtros e busca ------- */
  const [busca, setBusca] = useState("");
  const [fCat, setFCat] = useState("");
  const [fSub, setFSub] = useState("");
  const [fUF, setFUF] = useState("");

  const debounceRef = useRef<any>(null);

  // Subcategorias dinâmicas do FORM (categoria da demanda)
  const subcatsForm = useMemo(
    () => (categorias.find(c => c.nome === form.categoria)?.subcategorias ?? []),
    [categorias, form.categoria]
  );

  // Subcategorias dinâmicas do FILTRO (enviar para usuários)
  const subcatsFiltro = useMemo(
    () => (categorias.find(c => c.nome === fCat)?.subcategorias ?? []),
    [categorias, fCat]
  );

  /** ================== Carregar Demanda ================== */
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

      // Pré-filtro sugerido pela demanda
      setFCat(d.categoria || "");
      setFSub(d.subcategoria || "");
      setFUF(d.estado || "");

      setLoading(false);
    }
    fetchDemanda();
  }, [demandaId, router]);

  /** ================== Stream assignments ================== */
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

  /** ================== Normaliza doc de usuário ================== */
  function docToUsuario(d: any): Usuario {
    const raw = d.data ? (d.data() as any) : (d as any);

    let categorias: string[] = [];
    if (Array.isArray(raw.categoriasAtuacao)) categorias = raw.categoriasAtuacao;
    else if (Array.isArray(raw.categorias)) categorias = raw.categorias;

    const ufsRaw =
      Array.isArray(raw.ufsAtendidas) ? raw.ufsAtendidas :
      Array.isArray(raw.ufs) ? raw.ufs :
      [];

    const ufsNorm = (ufsRaw || []).map((x: string) => (x || "").toString().trim().toUpperCase());
    if (raw.atendeBrasil && !ufsNorm.includes("BRASIL")) ufsNorm.push("BRASIL");

    const pairs = Array.isArray(raw.categoriasAtuacaoPairs) ? raw.categoriasAtuacaoPairs : [];

    return {
      id: d.id ?? raw.id,
      ...raw,
      categorias,
      ufs: ufsNorm,
      categoriasAtuacaoPairs: pairs,
      atendeBrasil: !!raw.atendeBrasil,
    } as Usuario;
  }

  /** ================== Busca “Servidor” com filtros ================== */
  async function smartFetchUsuarios(reset = true) {
    setLoadingUsuarios(true);
    try {
      const PAGE = 40;
      const merged = new Map<string, Usuario>();

      const hasBusca = !!busca.trim();
      const token = pairToken(fCat, fSub);
      const ufN  = (fUF || "").toString().trim().toUpperCase();

      // ===== A) Sem texto de busca: só filtros
      if (!hasBusca) {
        // 1) cat+sub -> pairsSearch (+ UF)
        if (token) {
          let qBase: any = query(collection(db, "usuarios"), where("pairsSearch", "array-contains", token));
          if (ufN) qBase = query(qBase, where("ufsSearch", "array-contains", ufN));

          let qFinal = query(qBase, orderBy("nome"), limit(PAGE));
          if (!reset && paging.last) qFinal = query(qBase, orderBy("nome"), startAfter(paging.last), limit(PAGE));

          const snap = await getDocs(qFinal);
          snap.forEach(d => merged.set(d.id, docToUsuario(d)));

          setUsuarios(Array.from(merged.values()));
          setPaging({ last: snap.docs[snap.docs.length - 1], ended: snap.size < PAGE });
          return;
        }

        // 2) só categoria: consultar “novo” e “legado” e unificar
        if (isNonEmptyString(fCat)) {
          const queries: any[] = [];

          let qNew: any = query(collection(db, "usuarios"), where("categoriesAll", "array-contains", fCat));
          if (ufN) qNew = query(qNew, where("ufsSearch", "array-contains", ufN));
          qNew = reset || !paging.last
            ? query(qNew, orderBy("nome"), limit(PAGE))
            : query(qNew, orderBy("nome"), startAfter(paging.last), limit(PAGE));
          queries.push(qNew);

          let qLegacy: any = query(collection(db, "usuarios"), where("categorias", "array-contains", fCat));
          if (ufN) qLegacy = query(qLegacy, where("ufsSearch", "array-contains", ufN));
          qLegacy = reset || !paging.last
            ? query(qLegacy, orderBy("nome"), limit(PAGE))
            : query(qLegacy, orderBy("nome"), startAfter(paging.last), limit(PAGE));
          queries.push(qLegacy);

          const snaps = await Promise.all(queries.map(getDocs));
          snaps.forEach(s => s.forEach(d => merged.set(d.id, docToUsuario(d))));

          const lastDoc =
            snaps
              .map(s => s.docs[s.docs.length - 1])
              .filter(Boolean)
              .at(-1);
          const ended = snaps.every(s => s.size < PAGE);

          const fUFN = ufN;
const fCatN = norm(fCat);
const refined = Array.from(merged.values()).filter(u => {
  const hitCat =
    (u.categorias || []).some(c => norm(c) === fCatN) ||
    (u.categoriasAtuacaoPairs || []).some(p => norm(p?.categoria) === fCatN);

  if (!hitCat) return false;

  const hitUF =
    !fUFN ||
    u.atendeBrasil === true ||
    (Array.isArray(u.ufs) && (u.ufs.includes("BRASIL") || u.ufs.includes(fUFN))) ||
    (u.estado && u.estado.toString().trim().toUpperCase() === fUFN);

  return hitUF;
});


          setUsuarios(refined);
          setPaging({ last: lastDoc, ended });
          return;
        }

        // 3) sem filtros -> pagina por nome
        {
          let q: any = query(collection(db, "usuarios"), orderBy("nome"), limit(PAGE));
          if (!reset && paging.last) q = query(collection(db, "usuarios"), orderBy("nome"), startAfter(paging.last), limit(PAGE));
          const snap = await getDocs(q);
          snap.forEach(d => merged.set(d.id, docToUsuario(d)));
          setUsuarios(Array.from(merged.values()));
          setPaging({ last: snap.docs[snap.docs.length - 1], ended: snap.size < PAGE });
          return;
        }
      }

      // ===== B) Com texto de busca
      const t = busca.trim();

      if (t.length >= 8) {
        try {
          const byId = await getDoc(doc(db, "usuarios", t));
          if (byId.exists()) merged.set(byId.id, docToUsuario(byId));
        } catch {}
      }

      try {
        const sEmailEq = await getDocs(
          query(collection(db, "usuarios"), where("email", "==", t.toLowerCase()), limit(1))
        );
        sEmailEq.forEach(d => merged.set(d.id, docToUsuario(d)));
      } catch {}

      const tCap = t.charAt(0).toUpperCase() + t.slice(1);
      const sNome = await getDocs(
        query(collection(db, "usuarios"), orderBy("nome"), startAt(tCap), endAt(tCap + "\uf8ff"), limit(40))
      );
      sNome.forEach(d => merged.set(d.id, docToUsuario(d)));

      try {
        const tLower = t.toLowerCase();
        const sEmail = await getDocs(
          query(collection(db, "usuarios"), orderBy("email"), startAt(tLower), endAt(tLower + "\uf8ff"), limit(40))
        );
        sEmail.forEach(d => merged.set(d.id, docToUsuario(d)));
      } catch {}

      const fCatN = norm(fCat);
      const fSubN = norm(fSub);
      const fUFN = ufN;
      const refined = Array.from(merged.values()).filter(u => {
        const hitCat =
          !fCatN ||
          (u.categorias || []).some(c => norm(c) === fCatN) ||
          (u.categoriasAtuacaoPairs || []).some(p => norm(p?.categoria) === fCatN);
        if (!hitCat) return false;

        const hitSub =
          !fSubN ||
          (u.categoriasAtuacaoPairs || []).some(
            p => norm(p?.categoria) === fCatN && norm(p?.subcategoria) === fSubN
          );
        if (!hitSub) return false;

        const hitUF =
          !fUFN ||
          u.atendeBrasil === true ||
          (Array.isArray(u.ufs) && (u.ufs.includes("BRASIL") || u.ufs.includes(fUFN))) ||
          (u.estado && u.estado.toString().trim().toUpperCase() === fUFN);

        return hitUF;
      });

      setUsuarios(refined);
      setPaging({ ended: true });
    } finally {
      setLoadingUsuarios(false);
    }
  }

  // load inicial
  useEffect(() => {
    smartFetchUsuarios(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recarrega quando os filtros mudarem
  useEffect(() => {
    smartFetchUsuarios(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fCat, fSub, fUF]);

  /** ================== Busca (debounce) ================== */
  function executarBusca() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => smartFetchUsuarios(true), 400);
  }
  useEffect(() => {
    executarBusca();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  /** ================== Refinos locais (extra safety) ================== */
  const candidatos = useMemo(() => {
    const fCatN = norm(fCat);
    const fSubN = norm(fSub);
    const fUFN = (fUF || "").toString().trim().toUpperCase();

    return usuarios.filter(u => {
      const hitCat =
        !fCatN ||
        (u.categorias || []).some(c => norm(c) === fCatN) ||
        (u.categoriasAtuacaoPairs || []).some(p => norm(p?.categoria) === fCatN);
      if (!hitCat) return false;

      const hitSub =
        !fSubN ||
        (u.categoriasAtuacaoPairs || []).some(
          p => norm(p?.categoria) === fCatN && norm(p?.subcategoria) === fSubN
        );
      if (!hitSub) return false;

      const hitUF =
        !fUFN ||
        u.atendeBrasil === true ||
        (Array.isArray(u.ufs) && (u.ufs.includes("BRASIL") || u.ufs.includes(fUFN))) ||
        (u.estado && u.estado.toString().trim().toUpperCase() === fUFN);

      return hitUF;
    });
  }, [usuarios, fCat, fSub, fUF]);

  /** ================== Handlers básicos ================== */
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    // reseta subcategoria ao trocar a categoria
    if (name === "categoria") {
      setForm((f) => ({ ...f, categoria: value, subcategoria: "" }));
      return;
    }
    setForm({ ...form, [name]: value });
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

  /** ================== Persistência da demanda ================== */
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

  /** ================== Envio p/ usuários ================== */
  function toggleUsuario(id: string, checked: boolean) {
    setSelUsuarios(prev => checked ? [...new Set([...prev, id])] : prev.filter(x => x !== id));
  }
  function selecionarTodosVisiveis() {
    setSelUsuarios(prev => Array.from(new Set([...prev, ...candidatos.filter(c=>!jaEnviados.has(c.id)).map(c => c.id)])));
  }
  function limparSelecao() { setSelUsuarios([]); }

  async function enviarParaSelecionados() {
    if (!selUsuarios.length) { alert("Selecione pelo menos um usuário."); return; }
    const cents = reaisToCents(precoEnvioReais || precoPadraoReais);
    if (!cents || cents < 100) { alert("Defina um preço válido em reais. Ex.: 19,90"); return; }

    setEnvLoading(true);
    try {
      const batch = writeBatch(db);
      selUsuarios.forEach((uid) => {
        if (jaEnviados.has(uid)) return;
        const aRef = doc(db, "demandAssignments", `${demandaId}_${uid}`);
        batch.set(aRef, {
          demandId: demandaId,
          supplierId: uid,
          status: "sent" as AssignmentStatus,
          pricing: { amount: cents, currency: "BRL", exclusive: false, cap: unlockCap ?? null, soldCount: 0 },
          paymentStatus: "pending" as PaymentStatus,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
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

  /** ================== Ações por assignment ================== */
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
      const dSnap = await getDoc(doc(db, "demandas", demandaId));
      const dData = dSnap.data() as Demanda;
      const cap = typeof dData?.unlockCap === "number" ? dData.unlockCap : null;

      const curUnlocked = assignments.filter(a => a.status === "unlocked").length;
      if (cap != null && curUnlocked >= cap) { alert(`Limite de desbloqueios atingido (${cap}).`); return; }

      await updateDoc(aRef, {
        status: "unlocked",
        unlockedByAdmin: true,
        unlockedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        paymentStatus: "paid",
      });
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
      await updateDoc(aRef, { status: "canceled", paymentStatus: "pending", updatedAt: serverTimestamp() });
      await updateDoc(doc(db, "demandas", demandaId), { liberadoPara: arrayRemove(supplierId), updatedAt: serverTimestamp() }).catch(() => {});
      await deleteDoc(doc(db, "demandas", demandaId, "acessos", supplierId)).catch(() => {});
    } catch (e: any) {
      console.error(e);
      alert("Erro ao cancelar envio.");
    }
  }
  async function reactivateAssignment(supplierId: string) {
    try {
      const aRef = doc(db, "demandAssignments", `${demandaId}_${supplierId}`);
      await updateDoc(aRef, { status: "sent", paymentStatus: "pending", updatedAt: serverTimestamp() });
    } catch (e: any) {
      console.error(e);
      alert("Erro ao reativar envio.");
    }
  }
  async function deleteAssignment(supplierId: string) {
    if (!window.confirm("Excluir completamente o envio? Isso remove o acesso e do painel do fornecedor.")) return;
    try {
      await updateDoc(doc(db, "demandas", demandaId), { liberadoPara: arrayRemove(supplierId), updatedAt: serverTimestamp() }).catch(() => {});
      await deleteDoc(doc(db, "demandas", demandaId, "acessos", supplierId)).catch(() => {});
      await deleteDoc(doc(db, "demandAssignments", `${demandaId}_${supplierId}`));
    } catch (e: any) {
      console.error(e);
      alert("Erro ao excluir envio.");
    }
  }

  /** ================== Contagens úteis ================== */
  const unlockedCount = useMemo(() => assignments.filter(a => a.status === "unlocked").length, [assignments]);
  const capInfo = unlockCap != null ? `${unlockedCount}/${unlockCap}` : String(unlockedCount);

  /** ================== Render ================== */
  if (loading) {
    return (
      <div style={centerBox}>
        <LoaderIcon className="animate-spin" size={28} />&nbsp; Carregando demanda...
      </div>
    );
  }

  return (
    <section style={{ maxWidth: 1320, margin: "0 auto", padding: "32px 2vw 60px" }}>
      <Link href="/admin/demandas" style={backLink}><ArrowLeft size={19} /> Voltar</Link>

      <div style={gridWrap}>
        {/* ================= Editar Demanda ================= */}
        <div style={card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <h2 style={cardTitle}>Editar Necessidade</h2>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <div style={{fontSize:12,color:"#64748b",fontWeight:800}}>Limite de desbloqueios</div>
              <input type="number" min={0} value={unlockCap ?? ""} onChange={(e) => setUnlockCap(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))} style={{...input, width: 110}} placeholder="Ex.: 5" />
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
            <input name="titulo" value={form.titulo} onChange={handleChange} required placeholder="Ex: Preciso de peça X / serviço Y" style={input} />

            <label style={label}>Descrição</label>
            <textarea name="descricao" value={form.descricao} onChange={handleChange} required placeholder="Detalhe sua necessidade..." style={{ ...input, minHeight: 110, resize: "vertical" }} />

            <div style={twoCols}>
              <div style={{ flex: 1 }}>
                <label style={label}>Categoria</label>
                <select
                  name="categoria"
                  value={form.categoria}
                  onChange={handleChange}
                  required
                  style={input}
                  disabled={taxLoading}
                >
                  <option value="">{taxLoading ? "Carregando..." : "Selecione"}</option>
                  {categorias.map((c) => (
                    <option key={c.slug} value={c.nome}>{c.nome}</option>
                  ))}
                </select>

                <select
                  name="subcategoria"
                  value={form.subcategoria}
                  onChange={handleChange}
                  required
                  style={input}
                  disabled={!form.categoria}
                >
                  <option value="">{form.categoria ? "Selecione" : "Selecione a categoria"}</option>
                  {subcatsForm.map((s) => (
                    <option key={s.slug} value={s.nome}>{s.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={twoCols}>
              <div style={{ flex: 1 }}>
                <label style={label}>Estado (UF)</label>
                <select name="estado" value={form.estado} onChange={handleChange} required style={input}>
                  <option value="">Selecione</option>
                  {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Cidade</label>
                <input name="cidade" value={form.cidade} onChange={handleChange} placeholder="Ex.: Belo Horizonte" style={input} />
              </div>
            </div>

            <div style={twoCols}>
              <div style={{ flex: 1 }}>
                <label style={label}>WhatsApp / Telefone (opcional)</label>
                <input name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="(xx) xxxxx-xxxx" style={input} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Orçamento estimado (opcional)</label>
                <input name="orcamento" value={form.orcamento} onChange={handleChange} type="number" min={0} placeholder="R$" style={input} />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <DollarSign size={16} /> Preço padrão do desbloqueio (R$)
              </span></label>
              <input value={precoPadraoReais} onChange={(e)=>setPrecoPadraoReais(e.target.value)} placeholder="Ex.: 19,90" style={input} />
              <div style={hintText}>Sugerido ao enviar para usuários. Pode ser sobrescrito no envio.</div>
            </div>

            <label style={label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Tag size={16} color="#fb8500" /> Referências <span style={{ color: "#94a3b8", fontWeight: 600, fontSize: 12 }}>(até 3)</span>
            </span></label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tags.map((tg, idx) => (
                <span key={idx} style={chipTag}>
                  {tg}
                  <button type="button" onClick={() => removeTag(idx)} style={chipClose}>×</button>
                </span>
              ))}
              {tags.length < 3 && (
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="Nova tag" maxLength={16} style={{ ...input, width: 140 }} />
              )}
            </div>

            <label style={label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Upload size={16} color="#2563eb" /> Anexar imagens (opcional)
            </span></label>
            <ImageUploader imagens={imagens} setImagens={setImagens} max={5} />

            <label style={label}>Observações (opcional)</label>
            <textarea name="observacoes" value={form.observacoes} onChange={handleChange} placeholder="Alguma observação extra?" style={{ ...input, minHeight: 70 }} />

            <div style={{ display:"flex", gap: 10, flexWrap: "wrap", marginTop: 14, justifyContent:"space-between" }}>
              <div />
              <div style={{ display:"flex", gap: 10, flexWrap:"wrap" }}>
                <button type="submit" disabled={salvando} style={primaryBtn}><Save size={20} /> {salvando ? "Salvando..." : "Salvar Alterações"}</button>
                <button type="button" disabled={removendo} onClick={handleDelete} style={dangerBtn}><Trash2 size={20} /> {removendo ? "Excluindo..." : "Excluir"}</button>
              </div>
            </div>
          </form>
        </div>

        {/* ================= Enviar demanda ================= */}
        <div style={card}>
          <h2 style={cardTitle}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Send size={20} color="#2563eb" /> Enviar esta demanda para usuários
          </span></h2>

          <div style={twoCols}>
            <div style={{ flex: 1 }}>
              <label style={label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <DollarSign size={16} /> Preço do envio (R$)
              </span></label>
              <input value={precoEnvioReais} onChange={(e)=>setPrecoEnvioReais(e.target.value)} placeholder={`Sugerido: ${precoPadraoReais}`} style={input} />
              <div style={hintText}>Digite em reais, ex.: 25,00.</div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <ShieldCheck size={16} /> Limite de desbloqueios (cap)
              </span></label>
              <input type="number" min={0} value={unlockCap ?? ""} onChange={(e) => setUnlockCap(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))} style={input} placeholder="Ex.: 5" />
              <div style={hintText}>A demanda respeita este limite total de desbloqueios.</div>
            </div>
          </div>

          {/* Filtros */}
          <div style={{ ...twoCols, marginTop: 10, alignItems: "flex-end", position:"sticky", top: 0, background:"#fff", zIndex: 1, paddingTop: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Search size={16} /> Buscar por nome, e-mail ou ID
              </span></label>
              <div style={{ position: "relative" }}>
                <input value={busca} onChange={(e)=>setBusca(e.target.value)} onKeyDown={(e)=> e.key === "Enter" ? smartFetchUsuarios(true) : undefined} placeholder="Digite e tecle Enter" style={{ ...input, paddingLeft: 36 }} />
                <Search size={16} style={{ position: "absolute", left: 10, top: 12, color: "#a3a3a3" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div>
                <label style={miniLabel}><Filter size={13} /> Categoria</label>
                <select
                  value={fCat}
                  onChange={(e)=>{ setFCat(e.target.value); setFSub(""); }}
                  style={{ ...input, width: 240 }}
                  disabled={taxLoading}
                >
                  <option value="">{taxLoading ? "Carregando..." : "Todas"}</option>
                  {categorias.map((c) => <option key={c.slug} value={c.nome}>{c.nome}</option>)}
                </select>

                <select
                  value={fSub}
                  onChange={(e)=>setFSub(e.target.value)}
                  style={{ ...input, width: 240 }}
                  disabled={!fCat}
                >
                  <option value="">{fCat ? "Todas" : "Selecione a Cat."}</option>
                  {subcatsFiltro.map((s) => <option key={s.slug} value={s.nome}>{s.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={miniLabel}><Filter size={13} /> UF</label>
                <select value={fUF} onChange={(e)=>setFUF(e.target.value)} style={{ ...input, width: 120 }}>
                  <option value="">Todas</option>
                  {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <button type="button" onClick={()=>smartFetchUsuarios(true)} style={ghostBtn}><RefreshCw size={16} /> Atualizar lista</button>
              <button type="button" onClick={()=>smartFetchUsuarios(false)} style={ghostBtn}><Search size={16} /> Carregar mais</button>
            </div>
          </div>

          {/* Lista de candidatos */}
          <div style={listBox}>
            <div style={listHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#334155", fontWeight: 800, fontSize: 13 }}>
                <Users size={16} /> Usuários
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Selecionados: <b>{selUsuarios.length}</b></div>
            </div>

            <div style={{ maxHeight: "56vh", overflow: "auto" }}>
              {candidatos.map((u) => {
                const nome = u.nome || u.email || `Usuário ${u.id}`;
                const contato = u.whatsapp || u.telefone || "—";
                const regioes = u.atendeBrasil ? "BRASIL" : (u.ufs?.length ? u.ufs.join(", ") : (u.estado || "—"));
                const cats = u.categorias?.length ? u.categorias.join(", ") : "—";
                const already = jaEnviados.has(u.id);
                const selected = selUsuarios.includes(u.id);
                return (
                  <label key={u.id} style={rowItem(already ? "#f1fff6" : selected ? "#f1f5ff" : "#fff")}>
                    <input type="checkbox" checked={selected || already} disabled={already} onChange={(e) => toggleUsuario(u.id, e.target.checked)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: "#0f172a" }}>
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome}</span>
                        {already && <span style={chip("#eef2ff", "#3730a3")}><CheckCircle2 size={12}/> enviado</span>}
                      </div>
                      <div style={subLine}>{u.email || "—"} • {contato} • {u.cidade || "—"}/{regioes}</div>
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
          </div>

          {/* Ações de envio */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button type="button" onClick={selecionarTodosVisiveis} style={ghostBtn}>Selecionar visíveis</button>
            <button type="button" onClick={limparSelecao} style={ghostBtn}>Limpar seleção</button>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={enviarParaSelecionados} disabled={envLoading || selUsuarios.length === 0} style={primaryBtn}>
              <Send size={18}/> {envLoading ? "Enviando..." : `Enviar (${selUsuarios.length})`}
            </button>
          </div>
        </div>

        {/* ================= Envios realizados ================= */}
        <div style={card}>
          <h2 style={cardTitle}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Users size={20} color="#2563eb" /> Envios realizados
          </span></h2>

          {assignments.length === 0 ? (
            <div style={emptyBox}>Nenhum envio ainda.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
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

/** ================= Assignment Row ================= */
function AssignmentRow({
  a, onPago, onPendente, onLiberar, onCancelar, onExcluir, onReativar,
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
    a.status === "unlocked" ? chip("#ecfdf5", "#065f46")
    : a.status === "canceled" ? chip("#fff1f2", "#9f1239")
    : a.status === "viewed" ? chip("#eef2ff", "#3730a3")
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
        <span style={payChip}><CreditCard size={12}/> {pago ? "pago" : "pendente"}</span>
      </div>

      <div style={{flex:0.6,textAlign:"right",fontWeight:900,color:"#0f172a"}}>{toReais(a.pricing?.amount)}</div>
      <div style={{flex:0.6,textAlign:"right",color:"#64748b",fontWeight:800}}>{a.pricing?.cap != null ? a.pricing.cap : "—"}</div>

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

/** ================= Estilos ================= */
const backLink: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
  color: "#2563eb", fontWeight: 800, fontSize: 16, textDecoration: "none"
};
const gridWrap: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr", gap: 18 };
const card: React.CSSProperties = {
  background: "#fff", borderRadius: 18, boxShadow: "0 2px 16px #0001",
  padding: "26px 22px"
};
const cardTitle: React.CSSProperties = { fontWeight: 900, fontSize: "1.55rem", color: "#023047", marginBottom: 10 };
const metaLine: React.CSSProperties = {
  display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12, color: "#94a3b8", fontSize: 13
};
const twoCols: React.CSSProperties = { display: "flex", gap: 14, flexWrap: "wrap" };
const label: React.CSSProperties = { fontWeight: 800, fontSize: 15, color: "#2563eb", marginBottom: 7, marginTop: 14, display: "block" };
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
const chipClose: React.CSSProperties = { border: "none", background: "transparent", color: "#fb8500", fontWeight: 900, cursor: "pointer" };
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
const emptyBox: React.CSSProperties = { background: "#f8fafc", border: "1px dashed #e2e8f0", borderRadius: 12, padding: 16, color: "#475569" };

const tableHeader: React.CSSProperties = {
  display: "flex", gap: 12, padding: "10px 12px", background: "#f8fafc",
  border: "1px solid #eef2f7", borderRadius: 12, fontSize: 12, color: "#475569", fontWeight: 900,
};
const tableRow: React.CSSProperties = {
  display: "flex", gap: 12, padding: "12px 12px", background: "#fff",
  border: "1px solid #e5e7eb", borderRadius: 12, alignItems: "center",
};
const avatarBox: React.CSSProperties = {
  width: 28, height: 28, borderRadius: "50%", background: "#f1f5f9",
  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900
};

const miniBtnGreen: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "#16a34a", color: "#fff",
  border: "1px solid #16a34a", fontWeight: 800, fontSize: 12, padding: "8px 10px",
  borderRadius: 9, cursor: "pointer", boxShadow: "0 2px 10px #16a34a22"
};
const miniBtnYellow: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "#f59e0b", color: "#fff",
  border: "1px solid #f59e0b", fontWeight: 800, fontSize: 12, padding: "8px 10px",
  borderRadius: 9, cursor: "pointer", boxShadow: "0 2px 10px #f59e0b22"
};
const miniBtnBlue: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "#2563eb", color: "#fff",
  border: "1px solid #2563eb", fontWeight: 800, fontSize: 12, padding: "8px 10px",
  borderRadius: 9, cursor: "pointer", boxShadow: "0 2px 10px #2563eb22"
};
const miniBtnOrange: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "#fb923c", color: "#fff",
  border: "1px solid #fb923c", fontWeight: 800, fontSize: 12, padding: "8px 10px",
  borderRadius: 9, cursor: "pointer", boxShadow: "0 2px 10px #fb923c22"
};
const miniBtnGray: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "#475569", color: "#fff",
  border: "1px solid #475569", fontWeight: 800, fontSize: 12, padding: "8px 10px",
  borderRadius: 9, cursor: "pointer", boxShadow: "0 2px 10px #47556922"
};
const miniBtnRed: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "#e11d48", color: "#fff",
  border: "1px solid #e11d48", fontWeight: 800, fontSize: 12, padding: "8px 10px",
  borderRadius: 9, cursor: "pointer", boxShadow: "0 2px 10px #e11d4822"
};

/** ================= Responsividade extra ================= */
if (typeof window !== "undefined") {
  const styleId = "pedraum-edit-demand-responsive-v3";
  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!style) { style = document.createElement("style"); style.id = styleId; document.head.appendChild(style); }
  style.innerHTML = `
    @media (min-width: 1100px) {
      section > div[style*="grid-template-columns: 1fr"] { grid-template-columns: 1fr 1fr !important; }
    }
    @media (max-width: 860px) {
      div[style*="display: flex"][style*="gap: 12px"][style*="align-items: center"][style*="border: 1px solid #e5e7eb"] {
        flex-direction: column !important;
        align-items: flex-start !important;
      }
      div[style*="display: flex"][style*="gap: 12px"][style*="padding: 10px 12px"][style*="border: 1px solid #eef2f7"] {
        display: none !important;
      }
      input, select, textarea { max-width: 100% !important; }
      .sticky { position: sticky; top: 0; }
    }
  `;
}
