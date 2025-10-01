"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/firebaseConfig";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query as fsQuery,
  where,
  orderBy,
  limit,
  startAfter,
  addDoc,
  serverTimestamp,
  getCountFromServer,
} from "firebase/firestore";
import type {
  QuerySnapshot,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import {
  Pencil,
  Trash2,
  UserCheck,
  User as UserIcon,
  PlusCircle,
  Search,
  Lock,
  ClipboardCopy,
  Filter,
  BadgeCheck,
  ShieldCheck,
  Tag as TagIcon,
  RefreshCw,
  Download,
  XCircle,
  Users,
  AlertTriangle,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { withRoleProtection } from "@/utils/withRoleProtection";
import { CheckCircle2 } from "lucide-react";

/* ========================= Types (defensivos) ========================= */
type UsuarioDoc = {
  id: string;
  nome?: string;
  email?: string;

  // organização técnica
  role?: "admin" | "usuario" | "patrocinador";
  tipo?: "admin" | "usuario" | "patrocinador"; // compat UI antiga
  status?:
    | "Ativo"
    | "Inativo"
    | "Bloqueado"
    | "Pendente"
    | "ativo"
    | "bloqueado"
    | "pendente";
  verificado?: boolean; // ← Fornecedor

  // localização
  cidade?: string;
  estado?: string;

  // datas
  createdAt?: any;
  lastLogin?: any;
  lastLoginAt?: any;

  // patrocínio
  planoTipo?: string;
  planoStatus?: "ativo" | "inadimplente" | "expirado";
  planoExpiraEm?: any;

  // atuação/cobertura (usados para filtros!)
  categoriesAll?: string[]; // lista de categorias
  pairsSearch?: string[]; // "categoria::subcategoria" normalizado
  ufsSearch?: string[]; // ["MG", "SP"] e/ou ["BRASIL"]

  // extras ocasionais
  whatsapp?: string;
  perfilCompleto?: boolean;
  tags?: string[];
  leadsInclusos?: number;
  leadsConsumidos?: number;
  consumo30d?: number;
};

function asRole(u: UsuarioDoc): "admin" | "usuario" | "patrocinador" {
  return (u.role as any) || (u.tipo as any) || "usuario";
}
function asStatus(
  u: UsuarioDoc
): "Ativo" | "Bloqueado" | "Pendente" | "Inativo" {
  const s = (u.status || "") as string;
  if (!s) return "Ativo";
  const n = s.toLowerCase();
  if (n === "ativo") return "Ativo";
  if (n === "bloqueado") return "Bloqueado";
  if (n === "pendente") return "Pendente";
  if (n === "inativo") return "Inativo";
  return (u.status as any) || "Ativo";
}
function tsToDate(ts?: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}
function formatDate(ts?: any) {
  const d = tsToDate(ts);
  return d ? d.toLocaleDateString("pt-BR") : "";
}
function daysFromNow(d?: Date | null) {
  if (!d) return Infinity;
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
const norm = (s = "") =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/* ========================= Página ========================= */
function UsuariosAdminPage() {
  /* ---------- estado base ---------- */
  const [usuarios, setUsuarios] = useState<UsuarioDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // paginação visual: +50 por clique
  const PAGE_CHUNK = 50;

  const lastDocRef = useRef<any | null>(null);
  const reachedEndRef = useRef(false);

  /* ---------- filtros principais ---------- */
  const [busca, setBusca] = useState("");
  const [fRole, setFRole] =
    useState<"" | "admin" | "usuario" | "patrocinador">("");
  const [fStatus, setFStatus] =
    useState<"" | "Ativo" | "Bloqueado" | "Pendente" | "Inativo">("");
  const [fFornecedor, setFFornecedor] = useState<"" | "sim" | "nao">("");
  const [fUF, setFUF] = useState(""); // UF do cadastro (estado)
  const [fCidade, setFCidade] = useState("");

  // atuação/cobertura
  const [fCategoria, setFCategoria] = useState("");
  const [fSubcat, setFSubcat] = useState(""); // depende de categoria
  const [fUFCobertura, setFUFCobertura] = useState(""); // via ufsSearch (“MG” ou “BRASIL”)

  // patrocínio
  const [fPatro, setFPatro] =
    useState<"" | "ativo" | "expira7" | "inadimplente" | "expirado">("");

  // avançados ocasionais
  const [fPerfilIncompleto, setFPerfilIncompleto] = useState(false);
  const [fSemWhats, setFSemWhats] = useState(false);
  const [fTag, setFTag] = useState("");

  // seleção em massa
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>(
    {}
  );

  /* ---------- ESTATÍSTICAS GLOBAIS (banco inteiro) ---------- */
  type GlobalStats = {
    total: number;
    admins: number;
    patrocinadoresAtivos: number;
    ativos: number;
    comWhats: number;
    perfisMelhorados: number;
  };
  const [stats, setStats] = useState<GlobalStats>({
    total: 0,
    admins: 0,
    patrocinadoresAtivos: 0,
    ativos: 0,
    comWhats: 0,
    perfisMelhorados: 0,
  });

  // tenta contar no servidor; se falhar, retorna null
  const tryCount = useCallback(async (coll: "usuarios" | "users", clauses: any[]) => {
    try {
      const q = fsQuery(collection(db, coll), ...clauses);
      const cs = await getCountFromServer(q);
      return Number(cs.data().count || 0);
    } catch {
      return null;
    }
  }, []);

  // busca todos os docs de uma coleção em lotes (para fallback e métricas derivadas)
  const fetchAllDocs = useCallback(
    async (coll: "usuarios" | "users", clauses: any[] = [], batch = 500): Promise<UsuarioDoc[]> => {
      const col = collection(db, coll);
      const out: UsuarioDoc[] = [];
      let cursor: any | null = null;
      while (true) {
        const q = fsQuery(col, ...clauses, ...(cursor ? [startAfter(cursor)] : []), limit(batch));
        const snap = await getDocs(q);
        if (!snap.empty) {
          out.push(...snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
          cursor = snap.docs[snap.docs.length - 1];
        }
        if (snap.docs.length < batch) break;
      }
      return out;
    },
    []
  );

  const fetchGlobalStats = useCallback(async () => {
    try {
      // contagens básicas via aggregation (rápidas quando há índice)
      async function countEither(clauses: any[]): Promise<number> {
        const a = await tryCount("usuarios", clauses);
        if (a !== null && a > 0) return a;
        const b = await tryCount("users", clauses);
        if (b !== null) return b ?? 0;
        return 0;
      }

      const totalUsuarios = (await tryCount("usuarios", [])) ?? 0;
      const totalUsers = (await tryCount("users", [])) ?? 0;

      const admins = await countEither([where("role", "==", "admin")]);
      const patrocinadoresAtivos = await countEither([
        where("role", "==", "patrocinador"),
        where("planoStatus", "==", "ativo"),
      ]);
      const ativos = await countEither([where("status", "in", ["Ativo", "ativo"])]).catch?.(() => 0) ?? 0;

      let total = totalUsuarios || totalUsers;
      let comWhats = 0;
      let perfisMelhorados = 0;

      // se as duas coleções têm dados, mescla client-side para deduplicar e derivar métricas
      if (totalUsuarios > 0 && totalUsers > 0) {
        const [allA, allB] = await Promise.all([fetchAllDocs("usuarios"), fetchAllDocs("users")]);
        const byId = new Map<string, UsuarioDoc>();
        [...allA, ...allB].forEach((u) => byId.set(u.id, u));
        const all = Array.from(byId.values());
        total = all.length;
        comWhats = all.filter((u) => !!u.whatsapp).length;
        perfisMelhorados = all.filter((u) => (u.categoriesAll?.length || 0) > 0).length;
      } else {
        const winner = totalUsuarios > 0 ? "usuarios" : "users";
        const all = await fetchAllDocs(winner);
        total = all.length;
        comWhats = all.filter((u) => !!u.whatsapp).length;
        perfisMelhorados = all.filter((u) => (u.categoriesAll?.length || 0) > 0).length;
      }

      setStats({
        total,
        admins,
        patrocinadoresAtivos,
        ativos,
        comWhats,
        perfisMelhorados,
      });
    } catch (e) {
      console.error("Falha ao calcular estatísticas globais:", e);
      // mantém o que já tinha; não quebra a tela
    }
  }, [fetchAllDocs, tryCount]);

  /* ---------- carregar users com filtros server-side quando possível (robusto e tipado) ---------- */
  const applyServerQuery = useCallback(
    async (reset: boolean) => {
      setLoading(true);

      const buildCatKey = (c: string, s: string) => `${norm(c)}::${norm(s)}`;

      // 1) Monta where[] a partir dos filtros
      const wheres: any[] = [];
      if (fRole) wheres.push(where("role", "==", fRole));
      if (fStatus) wheres.push(where("status", "==", fStatus));
      if (fFornecedor)
        wheres.push(where("verificado", "==", fFornecedor === "sim"));
      if (fUF) wheres.push(where("estado", "==", fUF));
      if (fCategoria)
        wheres.push(where("categoriesAll", "array-contains", fCategoria));
      if (fSubcat && fCategoria) {
        wheres.push(
          where("pairsSearch", "array-contains", buildCatKey(fCategoria, fSubcat))
        );
      }
      if (fUFCobertura)
        wheres.push(where("ufsSearch", "array-contains", fUFCobertura));
      if (fPatro === "ativo") wheres.push(where("planoStatus", "==", "ativo"));
      if (fPatro === "inadimplente")
        wheres.push(where("planoStatus", "==", "inadimplente"));
      if (fPatro === "expirado")
        wheres.push(where("planoStatus", "==", "expirado"));
      // “expira7” fica client-side

      // 2) Helpers com tipagem correta
      async function tryOnce(
        collName: "usuarios" | "users",
        useOrderBy: boolean
      ): Promise<QuerySnapshot<DocumentData>> {
        const base = collection(db, collName);
        const baseQ = useOrderBy
          ? fsQuery(base, ...wheres, orderBy("createdAt", "desc"))
          : fsQuery(base, ...wheres);

        const q =
          reset || !lastDocRef.current
            ? fsQuery(baseQ, limit(PAGE_CHUNK))
            : fsQuery(baseQ, startAfter(lastDocRef.current), limit(PAGE_CHUNK));

        return getDocs(q);
      }

      async function runAllStrategies() {
        // Tenta: usuarios c/ orderBy -> usuarios s/ orderBy -> users c/ orderBy -> users s/ orderBy
        const attempts: Array<() => Promise<QuerySnapshot<DocumentData>>> = [
          () => tryOnce("usuarios", true),
          () => tryOnce("usuarios", false),
          () => tryOnce("users", true),
          () => tryOnce("users", false),
        ];

        for (const run of attempts) {
          try {
            const snap = await run();
            if (!snap.empty) return { mode: "query" as const, snap };
          } catch {
            // índice/campo faltando — segue para a próxima
          }
        }

        // Dump completo de `usuarios`
        try {
          const allUsuarios = await getDocs(collection(db, "usuarios"));
          if (!allUsuarios.empty) {
            return {
              mode: "dump:usuarios" as const,
              docs: allUsuarios.docs,
            };
          }
        } catch {
          /* ignora */
        }

        // Dump completo de `users`
        try {
          const allUsers = await getDocs(collection(db, "users"));
          if (!allUsers.empty) {
            return { mode: "dump:users" as const, docs: allUsers.docs };
          }
        } catch {
          /* ignora */
        }

        // Nada
        return {
          mode: "empty" as const,
          docs: [] as QueryDocumentSnapshot<DocumentData>[],
        };
      }

      // 3) Execução + última rede de segurança
      try {
        const res = await runAllStrategies();

        const mapDocs = (arr: QueryDocumentSnapshot<DocumentData>[]) =>
          arr.map(
            (d) => ({ id: d.id, ...(d.data() as any) } as UsuarioDoc)
          );

        let docs: UsuarioDoc[] = [];
        let last: any = null;

        if (res.mode === "query") {
          docs = mapDocs(res.snap.docs);
          last = res.snap.docs.at(-1) ?? null;
        } else {
          docs = mapDocs(res.docs);
          // em dump desliga paginação
          reachedEndRef.current = true;
          last = null;
        }

        // Último fallback: se ainda não veio nada, merge dos dumps das duas coleções
        if (!docs.length) {
          try {
            const [a, b] = await Promise.allSettled([
              getDocs(collection(db, "usuarios")),
              getDocs(collection(db, "users")),
            ]);
            const arrA =
              a.status === "fulfilled"
                ? a.value.docs.map((d) => ({
                    id: d.id,
                    ...(d.data() as any),
                  }))
                : [];
            const arrB =
              b.status === "fulfilled"
                ? b.value.docs.map((d) => ({
                    id: d.id,
                    ...(d.data() as any),
                  }))
                : [];
            const byId = new Map<string, UsuarioDoc>();
            [...arrA, ...arrB].forEach((x) => byId.set(x.id, x as UsuarioDoc));
            docs = Array.from(byId.values());
            reachedEndRef.current = true;
            last = null;
          } catch {
            /* mantém vazio */
          }
        }

        // filtro “expira7” client-side
        const filtered = docs.filter((u) => {
          if (fPatro !== "expira7") return true;
          const ativo = u.planoStatus === "ativo";
          const exp = tsToDate(u.planoExpiraEm);
          return ativo && daysFromNow(exp) <= 7;
        });

        if (reset) setUsuarios(filtered);
        else setUsuarios((prev) => [...prev, ...filtered]);

        lastDocRef.current = last;
        if (res.mode === "query" && filtered.length < PAGE_CHUNK) {
          reachedEndRef.current = true;
        }

        console.log(
          `[usuarios] mode=${res.mode} fetched=${filtered.length} reset=${reset} whereCount=${wheres.length}`
        );
      } catch (err) {
        console.error("Erro inesperado; tentando dump total:", err);
        try {
          const [a, b] = await Promise.allSettled([
            getDocs(collection(db, "usuarios")),
            getDocs(collection(db, "users")),
          ]);
          const arrA =
            a.status === "fulfilled"
              ? a.value.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
              : [];
          const arrB =
            b.status === "fulfilled"
              ? b.value.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
              : [];
          const byId = new Map<string, UsuarioDoc>();
          [...arrA, ...arrB].forEach((x) => byId.set(x.id, x as UsuarioDoc));
          const all = Array.from(byId.values());
          if (reset) setUsuarios(all);
          else setUsuarios((prev) => [...prev, ...all]);
        } catch (fatal) {
          console.error("Dump total falhou também:", fatal);
          if (reset) setUsuarios([]);
        } finally {
          reachedEndRef.current = true;
          lastDocRef.current = null;
        }
      } finally {
        setLoading(false);
      }
    },
    [
      fRole,
      fStatus,
      fFornecedor,
      fUF,
      fCategoria,
      fSubcat,
      fUFCobertura,
      fPatro,
    ]
  );

  // primeira carga + quando filtros mudarem (reset da lista)
  useEffect(() => {
    lastDocRef.current = null;
    reachedEndRef.current = false;
    setUsuarios([]);
    setSelecionados({});
    applyServerQuery(true);
  }, [applyServerQuery]);

  // carrega estatísticas globais (independente dos filtros da lista)
  useEffect(() => {
    fetchGlobalStats();
  }, [fetchGlobalStats]);

  /* ---------- opções dinâmicas para selects (derivadas dos dados carregados) ---------- */
  const estadosDisponiveis = useMemo(() => {
    const s = new Set<string>();
    usuarios.forEach((u) => u.estado && s.add(u.estado));
    return Array.from(s).sort();
  }, [usuarios]);

  const cidadesDisponiveis = useMemo(() => {
    const s = new Set<string>();
    usuarios.forEach((u) => {
      if (!fUF || u.estado === fUF) {
        u.cidade && s.add(u.cidade);
      }
    });
    return Array.from(s).sort();
  }, [usuarios, fUF]);

  const categoriasDisponiveis = useMemo(() => {
    const s = new Set<string>();
    usuarios.forEach((u) =>
      (u.categoriesAll || []).forEach((c) => c && s.add(c))
    );
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [usuarios]);

  // subcategorias existentes para a categoria escolhida (extraídas de pairsSearch)
  const subcatsDisponiveis = useMemo(() => {
    if (!fCategoria) return [];
    const s = new Set<string>();
    const catKey = norm(fCategoria) + "::";
    usuarios.forEach((u) =>
      (u.pairsSearch || []).forEach((key) => {
        if (key.startsWith(catKey)) {
          const sub = key.slice(catKey.length);
          if (sub) s.add(sub.replaceAll("-", " ").replace(/\s+/g, " ").trim());
        }
      })
    );
    const arr = Array.from(s);
    // exibe capitalizado (apenas estética)
    return arr
      .map((sc) =>
        sc
          .split(" ")
          .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
          .join(" ")
      )
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [usuarios, fCategoria]);

  // UFs de cobertura (ufsSearch)
  const ufsCoberturaDisponiveis = useMemo(() => {
    const s = new Set<string>();
    usuarios.forEach((u) => (u.ufsSearch || []).forEach((uf) => uf && s.add(uf)));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [usuarios]);

  // tags disponíveis
  const tagsDisponiveis = useMemo(() => {
    const s = new Set<string>();
    usuarios.forEach((u) => (u.tags || []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [usuarios]);

  /* ---------- filtros client-side complementares ---------- */
  const listaFinal = useMemo(() => {
    const q = busca.trim().toLowerCase();

    return usuarios.filter((u) => {
      // Busca simples (nome/email/id/cidade)
      const okBusca =
        !q ||
        (u.nome || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.id || "").toLowerCase().includes(q) ||
        (u.cidade || "").toLowerCase().includes(q);

      // Cidade
      const okCidade = !fCidade || u.cidade === fCidade;

      // Patrocínio expira em 7d (client-side)
      let okPatro = true;
      if (fPatro === "expira7") {
        const ativo = u.planoStatus === "ativo";
        const exp = tsToDate(u.planoExpiraEm);
        okPatro = ativo && daysFromNow(exp) <= 7;
      }

      // Avançados
      const okPerfil = !fPerfilIncompleto || u.perfilCompleto === false;
      const okWhats = !fSemWhats || !u.whatsapp;
      const okTag = !fTag || (u.tags || []).includes(fTag);

      return okBusca && okCidade && okPatro && okPerfil && okWhats && okTag;
    });
  }, [usuarios, busca, fCidade, fPatro, fPerfilIncompleto, fSemWhats, fTag]);

  /* ---------- ações por linha ---------- */
  async function logAdmin(
    action: string,
    usuarioId: string,
    before: any,
    after: any
  ) {
    try {
      await addDoc(collection(db, "adminLogs"), {
        usuarioId,
        action,
        before,
        after,
        at: serverTimestamp(),
      });
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Excluir usuário permanentemente?")) return;
    const before = usuarios.find((u) => u.id === id);
    await deleteDoc(doc(db, "usuarios", id));
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
    await logAdmin("delete-usuario", id, before || null, null);
  }

  async function handleStatus(
    id: string,
    novo: "Ativo" | "Bloqueado" | "Pendente" | "Inativo"
  ) {
    const before = usuarios.find((u) => u.id === id);
    await updateDoc(doc(db, "usuarios", id), { status: novo });
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: novo } : u))
    );
    await logAdmin("update-status", id, before || null, { status: novo });
  }

  async function handleRole(
    id: string,
    novo: "admin" | "usuario" | "patrocinador"
  ) {
    const before = usuarios.find((u) => u.id === id);
    await updateDoc(doc(db, "usuarios", id), { role: novo, tipo: novo });
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role: novo, tipo: novo } : u))
    );
    await logAdmin("update-role", id, before || null, { role: novo });
  }

  async function handleApplyTag(id: string, tag: string) {
    const val = tag.trim();
    if (!val) return;
    const before = usuarios.find((u) => u.id === id);
    const tags = new Set([...(before?.tags || []), val]);
    await updateDoc(doc(db, "usuarios", id), { tags: Array.from(tags) });
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, tags: Array.from(tags) } : u))
    );
    await logAdmin("apply-tag", id, { tags: before?.tags || [] }, { tags: Array.from(tags) });
  }

  /* ---------- export CSV ---------- */
  function exportCSV() {
    const cols = [
      "id",
      "nome",
      "email",
      "role",
      "status",
      "fornecedor",
      "estado",
      "cidade",
      "categorias",
      "ufsCobertura",
      "createdAt",
      "lastLogin",
      "planoStatus",
    ];
    const lines = [cols.join(",")];
    listaFinal.forEach((u) => {
      const row = [
        u.id,
        (u.nome || "").replace(/,/g, " "),
        (u.email || "").replace(/,/g, " "),
        asRole(u),
        asStatus(u),
        String(!!u.verificado),
        u.estado || "",
        u.cidade || "",
        (u.categoriesAll || []).join("|"),
        (u.ufsSearch || []).join("|"),
        formatDate(u.createdAt),
        formatDate(u.lastLoginAt || u.lastLogin),
        u.planoStatus || "",
      ];
      lines.push(row.map((v) => `"${v}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------- seleção em massa ---------- */
  const idsSelecionados = useMemo(
    () => Object.entries(selecionados).filter(([, v]) => v).map(([id]) => id),
    [selecionados]
  );

  async function bulkStatus(novo: "Ativo" | "Bloqueado") {
    if (!idsSelecionados.length) return;
    if (
      !window.confirm(
        `Alterar status para "${novo}" em ${idsSelecionados.length} usuário(s)?`
      )
    )
      return;
    await Promise.all(idsSelecionados.map((id) => handleStatus(id, novo)));
    setSelecionados({});
  }

  async function bulkTag(tag: string) {
    const val = tag.trim();
    if (!idsSelecionados.length || !val) return;
    if (
      !window.confirm(
        `Aplicar tag "${val}" em ${idsSelecionados.length} usuário(s)?`
      )
    )
      return;
    await Promise.all(idsSelecionados.map((id) => handleApplyTag(id, val)));
    setSelecionados({});
  }

  /* ---------- UI ---------- */
  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", padding: "46px 0 30px 0" }}>
      <section style={{ maxWidth: 1380, margin: "0 auto", padding: "0 2vw" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 22,
          }}
        >
          <h1
            style={{
              fontWeight: 900,
              fontSize: "2.3rem",
              color: "#023047",
              margin: 0,
              letterSpacing: "-1px",
            }}
          >
            Gestão de Usuários
          </h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => {
                lastDocRef.current = null;
                reachedEndRef.current = false;
                setUsuarios([]);
                setLoading(true);
                Promise.all([applyServerQuery(true), fetchGlobalStats()]).finally(() => setLoading(false));
              }}
              title="Recarregar"
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: "10px 14px",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              <RefreshCw size={18} />
            </button>
            <Link
              href="/admin/usuarios/create"
              style={{
                background: "#FB8500",
                color: "#fff",
                borderRadius: 16,
                fontWeight: 800,
                fontSize: "1.05rem",
                padding: "12px 18px",
                textDecoration: "none",
                boxShadow: "0 2px 12px #0001",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <PlusCircle size={18} /> Novo Usuário
            </Link>
          </div>
        </div>

        {/* Cards resumo (globais) */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <ResumoCard label="Carregados" value={stats.total} icon={<Users size={18} />} color="#2563eb" />
          <ResumoCard label="Admins" value={stats.admins} icon={<ShieldCheck size={18} />} color="#4f46e5" />
          <ResumoCard
            label="Patrocinadores ativos"
            value={stats.patrocinadoresAtivos}
            icon={<BadgeCheck size={18} />}
            color="#059669"
          />
          <ResumoCard label="Ativos" value={stats.ativos} icon={<CheckCircle2 size={18} />} color="#10b981" />
          <ResumoCard label="Com WhatsApp" value={stats.comWhats} icon={<CheckCircle2 size={18} />} color="#22c55e" />
          <ResumoCard label="Perfis melhorados" value={stats.perfisMelhorados} icon={<TagIcon size={18} />} color="#f59e0b" />
        </div>

        {/* Busca + filtros */}
        <div style={{ display: "grid", gap: 10, marginBottom: 8 }}>
          {/* Linha 1 */}
          <div className="filtersTopRow">
            <div className="searchWrap">
              <Search size={18} className="searchIcon" />
              <input
                className="searchInput"
                placeholder="Buscar nome / e-mail / ID / cidade"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <div className="filtersActionsRight">
              <button onClick={exportCSV} className="btnIcon" title="Exportar CSV (lista filtrada)">
                <Download size={18} />
              </button>
            </div>
          </div>

          {/* Linha 2 — filtros principais */}
          <div className="filtersScroller">
            <select value={fRole} onChange={(e) => setFRole(e.target.value as any)} className="filterItem">
              <option value="">Tipo/Papel</option>
              <option value="admin">Admin</option>
              <option value="patrocinador">Patrocinador</option>
              <option value="usuario">Usuário</option>
            </select>

            <select value={fStatus} onChange={(e) => setFStatus(e.target.value as any)} className="filterItem">
              <option value="">Status</option>
              <option value="Ativo">Ativo</option>
              <option value="Bloqueado">Bloqueado</option>
              <option value="Pendente">Pendente</option>
              <option value="Inativo">Inativo</option>
            </select>

            <select
              value={fFornecedor}
              onChange={(e) => setFFornecedor(e.target.value as any)}
              className="filterItem"
            >
              <option value="">Fornecedor?</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>

            <select
              value={fUF}
              onChange={(e) => {
                setFUF(e.target.value);
                setFCidade("");
              }}
              className="filterItem"
            >
              <option value="">UF (cadastro)</option>
              {estadosDisponiveis.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>

            <select value={fCidade} onChange={(e) => setFCidade(e.target.value)} className="filterItem">
              <option value="">Cidade</option>
              {cidadesDisponiveis.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={fCategoria}
              onChange={(e) => {
                setFCategoria(e.target.value);
                setFSubcat("");
              }}
              className="filterItem"
            >
              <option value="">Categoria</option>
              {categoriasDisponiveis.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={fSubcat}
              onChange={(e) => setFSubcat(e.target.value)}
              className="filterItem"
              disabled={!fCategoria}
              title={fCategoria ? "Subcategoria" : "Selecione uma categoria"}
            >
              <option value="">{fCategoria ? "Subcategoria" : "—"}</option>
              {subcatsDisponiveis.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={fUFCobertura}
              onChange={(e) => setFUFCobertura(e.target.value)}
              className="filterItem"
            >
              <option value="">Cobertura (UF/BRASIL)</option>
              {ufsCoberturaDisponiveis.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>

            <select value={fPatro} onChange={(e) => setFPatro(e.target.value as any)} className="filterItem">
              <option value="">Patrocínio</option>
              <option value="ativo">Plano Ativo</option>
              <option value="expira7">Expira ≤7 dias</option>
              <option value="inadimplente">Inadimplente</option>
              <option value="expirado">Expirado</option>
            </select>

            <details className="filterItem detailsAdv">
              <summary className="btnAdv">
                <Filter size={16} /> Avançados <ChevronDown size={14} />
              </summary>
              <div className="advContent">
                <label className="chk">
                  <input
                    type="checkbox"
                    checked={fPerfilIncompleto}
                    onChange={(e) => setFPerfilIncompleto(e.target.checked)}
                  />{" "}
                  Perfil incompleto
                </label>
                <label className="chk">
                  <input
                    type="checkbox"
                    checked={fSemWhats}
                    onChange={(e) => setFSemWhats(e.target.checked)}
                  />{" "}
                  Sem WhatsApp
                </label>
                <select
                  value={fTag}
                  onChange={(e) => setFTag(e.target.value)}
                  className="filterItem"
                  style={{ minWidth: 160 }}
                >
                  <option value="">Tag</option>
                  {tagsDisponiveis.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </details>
          </div>
        </div>

        {/* Chips de filtros aplicados */}
        <Chips
          values={[
            busca && { label: `Busca: "${busca}"`, onClear: () => setBusca("") },
            fRole && { label: `Tipo: ${fRole}`, onClear: () => setFRole("") },
            fStatus && { label: `Status: ${fStatus}`, onClear: () => setFStatus("") },
            fFornecedor && {
              label: `Fornecedor: ${fFornecedor}`,
              onClear: () => setFFornecedor(""),
            },
            fUF && { label: `UF: ${fUF}`, onClear: () => setFUF("") },
            fCidade && { label: `Cidade: ${fCidade}`, onClear: () => setFCidade("") },
            fCategoria && {
              label: `Categoria: ${fCategoria}`,
              onClear: () => {
                setFCategoria("");
                setFSubcat("");
              },
            },
            fSubcat && { label: `Subcategoria: ${fSubcat}`, onClear: () => setFSubcat("") },
            fUFCobertura && {
              label: `Cobertura: ${fUFCobertura}`,
              onClear: () => setFUFCobertura(""),
            },
            fPatro && { label: `Patrocínio: ${fPatro}`, onClear: () => setFPatro("") },
            fPerfilIncompleto && {
              label: "Perfil incompleto",
              onClear: () => setFPerfilIncompleto(false),
            },
            fSemWhats && { label: "Sem WhatsApp", onClear: () => setFSemWhats(false) },
            fTag && { label: `Tag: ${fTag}`, onClear: () => setFTag("") },
          ].filter(Boolean) as any[]}
          onClearAll={() => {
            setBusca("");
            setFRole("");
            setFStatus("");
            setFFornecedor("");
            setFUF("");
            setFCidade("");
            setFCategoria("");
            setFSubcat("");
            setFUFCobertura("");
            setFPatro("");
            setFPerfilIncompleto(false);
            setFSemWhats(false);
            setFTag("");
          }}
        />

        {/* Toolbar em massa */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "10px 0 16px" }}>
          <span style={{ fontWeight: 800, color: "#64748b" }}>
            {idsSelecionados.length} selecionado(s)
          </span>
          <button onClick={() => bulkStatus("Bloqueado")} disabled={!idsSelecionados.length} style={btnDanger()}>
            <Lock size={16} /> Bloquear
          </button>
          <button onClick={() => bulkStatus("Ativo")} disabled={!idsSelecionados.length} style={btnSuccess()}>
            <UserCheck size={16} /> Desbloquear
          </button>
          <BulkTag onApply={(t) => bulkTag(t)} disabled={!idsSelecionados.length} />
          <button onClick={exportCSV} style={btnNeutral()} title="Exportar CSV (lista filtrada)">
            <Download size={16} /> Exportar CSV
          </button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => {
                if (reachedEndRef.current || loading) return;
                applyServerQuery(false);
              }}
              style={btnPrimary()}
              disabled={loading || reachedEndRef.current}
              title={reachedEndRef.current ? "Fim da lista" : "Carregar mais"}
            >
              Carregar mais
            </button>
          </div>
        </div>

        {/* Lista */}
        {loading && usuarios.length === 0 ? (
          <div style={{ color: "#219EBC", fontWeight: 700, padding: 44, textAlign: "center" }}>
            Carregando usuários...
          </div>
        ) : listaFinal.length === 0 ? (
          <div style={{ color: "#adb0b6", fontWeight: 600, padding: 44, textAlign: "center" }}>
            Nenhum resultado — experimente limpar os filtros.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: 22,
              marginBottom: 28,
            }}
          >
            {listaFinal.map((u) => {
              const role = asRole(u);
              const status = asStatus(u);
              const isSelected = !!selecionados[u.id];
              const expiraEm = tsToDate(u.planoExpiraEm);
              const dias = daysFromNow(expiraEm);
              const badgePlano =
                u.planoStatus === "expirado"
                  ? { bg: "#ffe6e6", fg: "#d90429", txt: "Expirado" }
                  : u.planoStatus === "inadimplente"
                  ? { bg: "#fff4e6", fg: "#c2410c", txt: "Inadimplente" }
                  : u.planoStatus === "ativo" && dias <= 7
                  ? { bg: "#fff7ed", fg: "#b45309", txt: `Expira em ${Math.max(dias, 0)}d` }
                  : u.planoStatus === "ativo"
                  ? { bg: "#e7faec", fg: "#059669", txt: "Plano Ativo" }
                  : undefined;

              return (
                <div
                  key={u.id}
                  style={{
                    background: "#fff",
                    borderRadius: 17,
                    boxShadow: "0 2px 20px #0001",
                    padding: "18px 20px 16px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    position: "relative",
                  }}
                >
                  <label style={{ position: "absolute", top: 14, left: 14 }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) =>
                        setSelecionados((s) => ({
                          ...s,
                          [u.id]: e.target.checked,
                        }))
                      }
                    />
                  </label>

                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #FB8500 60%, #2563eb 120%)",
                        color: "#fff",
                        fontWeight: 900,
                        fontSize: 22,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 10px #0001",
                      }}
                    >
                      {u.nome ? u.nome.charAt(0).toUpperCase() : <UserIcon size={28} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "1.08rem", color: "#023047" }}>
                        {u.nome || "—"}
                      </div>
                      <div
                        style={{
                          color: "#219ebc",
                          fontWeight: 700,
                          fontSize: 14,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>{u.email || "—"}</span>
                        {u.email && (
                          <span
                            title="Copiar e-mail"
                            onClick={() => navigator.clipboard.writeText(u.email!)}
                            style={{ cursor: "pointer", display: "inline-flex" }}
                            aria-label="Copiar e-mail"
                          >
                            <ClipboardCopy size={15} />
                          </span>
                        )}
                        {u.verificado ? (
                          <span title="Fornecedor (verificado)">
                            <BadgeCheck size={16} />
                          </span>
                        ) : null}
                      </div>
                      <div
                        style={{
                          color: "#94a3b8",
                          fontWeight: 600,
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>{u.id}</span>
                        <span
                          title="Copiar ID"
                          onClick={() => navigator.clipboard.writeText(u.id)}
                          style={{ cursor: "pointer", display: "inline-flex" }}
                          aria-label="Copiar ID"
                        >
                          <ClipboardCopy size={14} />
                        </span>
                      </div>
                      {(u.cidade || u.estado) && (
                        <div
                          style={{
                            color: "#64748b",
                            fontWeight: 700,
                            fontSize: 13,
                            marginTop: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <MapPin size={14} />
                          {u.cidade || "—"}
                          {u.estado ? ` - ${u.estado}` : ""}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={pill("#eef2ff", "#4f46e5")}>
                      {(role || "usuario").toUpperCase()}
                    </span>
                    <span
                      style={pill(
                        status === "Ativo" ? "#e7faec" : "#ffe6e6",
                        status === "Ativo" ? "#059669" : "#d90429"
                      )}
                    >
                      {status}
                    </span>
                    {badgePlano && (
                      <span style={pill(badgePlano.bg, badgePlano.fg)}>{badgePlano.txt}</span>
                    )}
                    {(u.categoriesAll || [])
                      .slice(0, 2)
                      .map((c) => (
                        <span key={c} style={pill("#f1f5f9", "#334155")}>
                          <TagIcon size={12} /> {c}
                        </span>
                      ))}
                  </div>

                  <div style={{ color: "#A0A0A0", fontSize: 12 }}>
                    {u.createdAt && <>Cadastro: {formatDate(u.createdAt)}</>}
                    {(u.lastLoginAt || u.lastLogin) && <> {" | "}Último login: {formatDate(u.lastLoginAt || u.lastLogin)}</>}
                  </div>

                  {/* ações */}
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <Link href={`/admin/usuarios/${u.id}/edit`} style={btnLink()}>
                      <Pencil size={15} /> Editar
                    </Link>

                    {asStatus(u) !== "Bloqueado" ? (
                      <button onClick={() => handleStatus(u.id, "Bloqueado")} style={btnDanger()}>
                        <Lock size={15} /> Bloquear
                      </button>
                    ) : (
                      <button onClick={() => handleStatus(u.id, "Ativo")} style={btnSuccess()}>
                        <UserCheck size={15} /> Ativar
                      </button>
                    )}

                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <label style={{ fontWeight: 800, color: "#64748b", fontSize: 12 }}>Papel:</label>
                      <select
                        value={asRole(u)}
                        onChange={(e) => handleRole(u.id, e.target.value as any)}
                        style={sel()}
                      >
                        <option value="usuario">Usuário</option>
                        <option value="patrocinador">Patrocinador</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <label style={{ fontWeight: 800, color: "#64748b", fontSize: 12 }}>Tag:</label>
                      <input
                        placeholder="ex.: fornecedor"
                        onKeyDown={(e) => {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (e.key === "Enter" && val) {
                            handleApplyTag(u.id, val);
                            (e.target as HTMLInputElement).value = "";
                          }
                        }}
                        style={{ ...sel(), width: 150 }}
                      />
                    </div>

                    <button onClick={() => handleDelete(u.id)} style={btnOutlineDanger()}>
                      <Trash2 size={15} /> Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mostrar CTA de carregar mais no fim também */}
        {!loading && !reachedEndRef.current && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
            <button onClick={() => applyServerQuery(false)} style={btnPrimary()} title="Carregar mais">
              Carregar mais
            </button>
          </div>
        )}
      </section>

      <style jsx>{`
        .filtersTopRow {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 10px;
        }
        .searchWrap {
          position: relative;
        }
        .searchIcon {
          position: absolute;
          top: 9px;
          left: 10px;
          color: #a0a0a0;
        }
        .searchInput {
          width: 100%;
          padding: 8px 8px 8px 35px;
          border-radius: 11px;
          border: 1px solid #e0e7ef;
          font-size: 15px;
          font-weight: 600;
          color: #023047;
          background: #fff;
        }
        .filtersActionsRight {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          justify-content: flex-end;
        }
        .filtersScroller {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: thin;
          -webkit-overflow-scrolling: touch;
        }
        .filtersScroller::-webkit-scrollbar {
          height: 8px;
        }
        .filtersScroller::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 8px;
        }
        .filterItem {
          border-radius: 10px;
          border: 1px solid #e0e7ef;
          font-weight: 800;
          color: #0f172a;
          padding: 8px 12px;
          background: #fff;
          white-space: nowrap;
          min-width: 160px;
        }
        .detailsAdv {
          min-width: unset;
        }
        .btnAdv {
          list-style: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #fff;
          font-weight: 800;
          padding: 8px 12px;
        }
        .advContent {
          margin-top: 8px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .chk {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 800;
          color: #334155;
          background: #fff;
          padding: 6px 10px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
        }

        @media (min-width: 1024px) {
          .filtersScroller {
            display: grid;
            grid-template-columns: repeat(9, minmax(160px, 1fr));
            gap: 10px;
            overflow: visible;
          }
          .filterItem {
            width: 100%;
            min-width: 0;
          }
          .detailsAdv {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </main>
  );
}

/* ========================= Subcomponentes / estilos ========================= */
function ResumoCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        background: "#fff",
        borderRadius: 13,
        padding: "9px 18px",
        fontWeight: 900,
        color: "#023047",
        border: `2px solid ${color}22`,
        fontSize: 16,
        boxShadow: "0 2px 12px #0001",
      }}
    >
      <span style={{ color, display: "flex", alignItems: "center" }}>{icon}</span>
      <span style={{ fontWeight: 800, fontSize: 19, marginLeft: 4 }}>{value}</span>
      <span style={{ color: "#697A8B", fontWeight: 700, marginLeft: 6 }}>{label}</span>
    </div>
  );
}

function Chips({
  values,
  onClearAll,
}: {
  values: { label: string; onClear: () => void }[];
  onClearAll: () => void;
}) {
  if (!values.length) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0 12px" }}>
      {values.map((c, i) => (
        <span
          key={i}
          style={{
            padding: "6px 10px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 999,
            fontWeight: 800,
            color: "#334155",
            display: "inline-flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          {c.label}
          <button
            onClick={c.onClear}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            ✕
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        style={{
          marginLeft: 4,
          background: "#f1f5f9",
          border: "1px solid #e2e8f0",
          borderRadius: 999,
          padding: "6px 12px",
          fontWeight: 900,
          color: "#475569",
          cursor: "pointer",
        }}
      >
        Limpar tudo
      </button>
    </div>
  );
}

function BulkTag({ onApply, disabled }: { onApply: (t: string) => void; disabled?: boolean }) {
  const [tag, setTag] = useState("");
  return (
    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <label style={{ fontWeight: 800, color: "#64748b" }}>Tag:</label>
      <input
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        placeholder="ex.: fornecedor"
        style={{ ...sel(), width: 160 }}
      />
      <button onClick={() => onApply(tag.trim())} disabled={disabled || !tag.trim()} style={btnNeutral()}>
        <TagIcon size={16} /> Aplicar
      </button>
    </div>
  );
}

/* ---------- helpers de estilo ---------- */
function sel() {
  return {
    borderRadius: 10,
    border: "1px solid #e0e7ef",
    fontWeight: 800,
    color: "#0f172a",
    padding: "8px 12px",
    background: "#fff",
  } as React.CSSProperties;
}
function pill(bg: string, fg: string) {
  return {
    borderRadius: 999,
    background: bg,
    color: fg,
    fontWeight: 900,
    fontSize: ".85rem",
    padding: "4px 10px",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties;
}
function btnLink() {
  return {
    background: "#e8f8fe",
    color: "#2563eb",
    border: "1px solid #e0ecff",
    fontWeight: 800,
    fontSize: ".95rem",
    padding: "7px 13px",
    borderRadius: 9,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties;
}
function btnDanger() {
  return {
    background: "#fff0f0",
    color: "#d90429",
    border: "1px solid #ffe5e5",
    fontWeight: 800,
    fontSize: ".95rem",
    padding: "7px 12px",
    borderRadius: 9,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties;
}
function btnOutlineDanger() {
  return {
    background: "#fff",
    color: "#d90429",
    border: "1px solid #ffe5e5",
    fontWeight: 800,
    fontSize: ".95rem",
    padding: "7px 12px",
    borderRadius: 9,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties;
}
function btnSuccess() {
  return {
    background: "#e7faec",
    color: "#059669",
    border: "1px solid #d0ffdd",
    fontWeight: 800,
    fontSize: ".95rem",
    padding: "7px 12px",
    borderRadius: 9,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties;
}
function btnPrimary() {
  return {
    background: "#eef2ff",
    color: "#4f46e5",
    border: "1px solid #e0e7ff",
    fontWeight: 800,
    fontSize: ".95rem",
    padding: "7px 12px",
    borderRadius: 9,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties;
}
function btnNeutral() {
  return {
    background: "#fff",
    color: "#334155",
    border: "1px solid #e5e7eb",
    fontWeight: 800,
    fontSize: ".95rem",
    padding: "7px 12px",
    borderRadius: 9,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties;
}

export default withRoleProtection(UsuariosAdminPage, { allowed: ["admin"] });
