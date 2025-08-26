"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/firebaseConfig";
import {
  collection, getDocs, deleteDoc, doc, updateDoc, query as fsQuery,
  where, orderBy, limit, startAfter, getCountFromServer, addDoc, serverTimestamp
} from "firebase/firestore";
import {
  Pencil, Trash2, UserCheck, UserX, User, PlusCircle, Search, Lock, ClipboardCopy,
  Filter, ChevronLeft, ChevronRight, BadgeCheck, ShieldCheck, Tag as TagIcon, RefreshCw,
  Download, CheckCircle2, XCircle, Users, AlertTriangle
} from "lucide-react";
import { withRoleProtection } from "@/utils/withRoleProtection";


/* ========================= Types (defensivos) ========================= */
type UsuarioDoc = {
  id: string;
  nome?: string;
  email?: string;
  tipo?: "admin" | "usuario" | "patrocinador";   // compat com campo antigo
  role?: "admin" | "usuario" | "patrocinador";   // compat com campo novo
  status?: "Ativo" | "Inativo" | "Bloqueado" | "Pendente" | "ativo" | "bloqueado" | "pendente";
  verificado?: boolean;

  whatsapp?: string;
  cidade?: string;
  estado?: string;

  createdAt?: any;
  lastLogin?: any;        // compat antigo
  lastLoginAt?: any;      // compat novo

  // Patrocínio
  planoTipo?: string;     // ex.: bronze/prata/ouro
  planoStatus?: "ativo" | "inadimplente" | "expirado";
  planoExpiraEm?: any;
  leadsInclusos?: number;
  leadsConsumidos?: number;

  // Qualidade
  perfilCompleto?: boolean;
  hasDocs?: boolean;
  tags?: string[];

  // Analytics opcional
  consumo30d?: number;    // usado para p95 (client)
  keywords?: string[];    // compat
};

/* ========================= Utils ========================= */
function asRole(u: UsuarioDoc): "admin" | "usuario" | "patrocinador" {
  return (u.role as any) || (u.tipo as any) || "usuario";
}
function asStatus(u: UsuarioDoc): "Ativo" | "Bloqueado" | "Pendente" | "Inativo" {
  const s = (u.status || "") as string;
  if (!s) return "Ativo";
  const norm = s.toLowerCase();
  if (norm === "ativo") return "Ativo";
  if (norm === "bloqueado") return "Bloqueado";
  if (norm === "pendente") return "Pendente";
  if (norm === "inativo") return "Inativo";
  // fallback: manter como veio, mas tipado
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
function hasSaldo(u: UsuarioDoc) {
  const inc = u.leadsInclusos ?? 0;
  const con = u.leadsConsumidos ?? 0;
  return inc - con > 0;
}

/* ========================= Página ========================= */
function ListaUsuariosAdmin() {
  const [usuarios, setUsuarios] = useState<UsuarioDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25);
  const [pageCursor, setPageCursor] = useState<any | null>(null);
  const prevCursorsRef = useRef<any[]>([]);

  // Filtros Essenciais
  const [busca, setBusca] = useState("");
  const [filtroRole, setFiltroRole] = useState<"" | "admin" | "usuario" | "patrocinador">("");
  const [filtroStatus, setFiltroStatus] = useState<"" | "Ativo" | "Bloqueado" | "Pendente" | "Inativo">("");
  const [filtroVerificado, setFiltroVerificado] = useState<"" | "sim" | "nao">("");
  const [filtroUF, setFiltroUF] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");

  // Período
  const [periodo, setPeriodo] = useState<"hoje" | "7d" | "30d" | "custom" | "todos">("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // Patrocínio
  const [filtroPlano, setFiltroPlano] = useState<"" | "ativo" | "expira7" | "inadimplente" | "expirado">("");

  // Avançados
  const [filtroPerfilIncompleto, setFiltroPerfilIncompleto] = useState(false);
  const [filtroSemWhats, setFiltroSemWhats] = useState(false);
  const [filtroSemCidadeEstado, setFiltroSemCidadeEstado] = useState(false);
  const [filtroSemLogin30d, setFiltroSemLogin30d] = useState(false);
  const [filtroTag, setFiltroTag] = useState("");

  // Leads
  const [filtroLeads, setFiltroLeads] = useState<"" | "com" | "sem" | "alto">("");

  // Seleção em massa
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});

  // Dados auxiliares (UF/Cidade/Tags)
  const estados = useMemo(() => {
    const s = new Set<string>();
    usuarios.forEach(u => u.estado && s.add(u.estado));
    return Array.from(s).sort();
  }, [usuarios]);
  const cidades = useMemo(() => {
    const s = new Set<string>();
    usuarios.forEach(u => {
      if (!filtroUF || (u.estado === filtroUF)) {
        u.cidade && s.add(u.cidade);
      }
    });
    return Array.from(s).sort();
  }, [usuarios, filtroUF]);
  const allTags = useMemo(() => {
    const s = new Set<string>();
    usuarios.forEach(u => (u.tags || []).forEach(t => s.add(t)));
    return Array.from(s).sort();
  }, [usuarios]);

  // p95 consumo30d (se houver)
  const p95Consumo = useMemo(() => {
    const arr = usuarios.map(u => u.consumo30d ?? 0).filter(v => typeof v === "number");
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil(0.95 * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }, [usuarios]);

  /* ========================= Fetch Paginado (server-side when possible) ========================= */
  async function fetchUsuarios(reset = false) {
  setLoading(true);

  // 1) Detecta se devemos usar o "modo antigo"
  const noServerFilters =
    !filtroRole && !filtroStatus && !filtroUF && !filtroVerificado &&
    (periodo === "todos"); // sem recorte por data

  try {
    // Helper para montar intervalo de datas (quando houver)
    let di: Date | null = null, df: Date | null = null;
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    if (periodo === "hoje") { di = today0; df = todayEnd; }
    else if (periodo === "7d") { df = todayEnd; di = new Date(); di.setDate(di.getDate() - 7); di.setHours(0,0,0,0); }
    else if (periodo === "30d") { df = todayEnd; di = new Date(); di.setDate(di.getDate() - 30); di.setHours(0,0,0,0); }
    else if (periodo === "custom" && dataInicio && dataFim) {
      di = new Date(dataInicio + "T00:00:00");
      df = new Date(dataFim + "T23:59:59");
    }

    // 2) MODO ANTIGO — sem filtros server-side
    if (noServerFilters) {
      // lê tudo de 'usuarios'; se vier vazio, tenta 'users'
      const snap1 = await getDocs(collection(db, "usuarios"));
      let docs = snap1.docs;
      if (!docs.length) {
        const snap2 = await getDocs(collection(db, "users"));
        docs = snap2.docs;
      }
      const items = docs.map(d => ({ id: d.id, ...d.data() } as any));
      setUsuarios(items);
      setPageCursor(null);                 // sem paginação nesse modo
      if (reset) prevCursorsRef.current = [];
      console.log("Carregados (modo antigo):", items.length);
      return;
    }

    // 3) MODO NOVO — com filtros server-side (performático)
    async function tryQuery(collName: "usuarios" | "users") {
      const col = collection(db, collName);
      const wheres: any[] = [];

      if (filtroRole)        wheres.push(where("role", "==", filtroRole));
      if (filtroStatus)      wheres.push(where("status", "==", filtroStatus));
      if (filtroUF)          wheres.push(where("estado", "==", filtroUF));
      if (filtroVerificado)  wheres.push(where("verificado", "==", filtroVerificado === "sim"));
      if (di && df) { wheres.push(where("createdAt", ">=", di)); wheres.push(where("createdAt", "<=", df)); }

      // 3.1 tenta com orderBy + paginação
      try {
        const base = fsQuery(col, ...wheres, orderBy("createdAt", "desc"));
        const q = (reset || !pageCursor)
          ? fsQuery(base, limit(pageSize))
          : fsQuery(base, startAfter(pageCursor), limit(pageSize));
        const snap = await getDocs(q);
        return { docs: snap.docs, last: snap.docs.at(-1) ?? null };
      } catch (e) {
        // 3.2 fallback sem orderBy (caso falte índice)
        console.warn(`[${collName}] fallback sem orderBy/índice`, e);
        const q = (reset || !pageCursor)
          ? fsQuery(col, ...wheres, limit(pageSize))
          : fsQuery(col, ...wheres, startAfter(pageCursor), limit(pageSize));
        const snap = await getDocs(q);
        return { docs: snap.docs, last: snap.docs.at(-1) ?? null };
      }
    }

    // Tenta 'usuarios' -> fallback 'users' se vazio
    let res = await tryQuery("usuarios");
    if (!res.docs.length) {
      const alt = await tryQuery("users");
      if (alt.docs.length) res = alt;
    }

    const items = res.docs.map(d => ({ id: d.id, ...d.data() } as any));
    setUsuarios(items);
    setPageCursor(res.last);
    if (reset) prevCursorsRef.current = [];
    console.log("Carregados (modo novo):", items.length);

  } catch (e) {
    console.error("Erro ao buscar usuários:", e);
    setUsuarios([]);
    setPageCursor(null);
  } finally {
    setLoading(false);
  }
}


  // primeira carga + recargas quando filtros server-side mudam
  useEffect(() => {
    prevCursorsRef.current = []; // reset histórico ao trocar filtros
    setPageCursor(null);
    fetchUsuarios(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroRole, filtroStatus, filtroUF, filtroVerificado, periodo, dataInicio, dataFim, pageSize]);

  /* ========================= Client-side filters complementares ========================= */
  const usuariosFiltrados = useMemo(() => {
    const texto = busca.trim().toLowerCase();

    return usuarios.filter(u => {
      // Busca (nome/email/id/cidade)
      const okBusca = !texto ||
        (u.nome || "").toLowerCase().includes(texto) ||
        (u.email || "").toLowerCase().includes(texto) ||
        (u.id || "").toLowerCase().includes(texto) ||
        (u.cidade || "").toLowerCase().includes(texto);

      // Cidade (se selecionada)
      const okCidade = !filtroCidade || (u.cidade === filtroCidade);

      // Patrocínio
      let okPlano = true;
      if (filtroPlano) {
        const status = (u.planoStatus || "").toLowerCase();
        const expiraEm = tsToDate(u.planoExpiraEm);
        if (filtroPlano === "ativo") okPlano = status === "ativo";
        else if (filtroPlano === "inadimplente") okPlano = status === "inadimplente";
        else if (filtroPlano === "expirado") okPlano = status === "expirado";
        else if (filtroPlano === "expira7") {
          okPlano = status === "ativo" && daysFromNow(expiraEm) <= 7;
        }
      }

      // Avançados
      const okPerfil = !filtroPerfilIncompleto || u.perfilCompleto === false;
      const okWhats = !filtroSemWhats || !u.whatsapp;
      const okCidUF = !filtroSemCidadeEstado || !(u.cidade && u.estado);
      const last = tsToDate(u.lastLoginAt || u.lastLogin);
      const diasSemLogin = !last ? Infinity : Math.floor((Date.now() - last.getTime()) / 86400000);
      const okLogin30 = !filtroSemLogin30d || diasSemLogin >= 30;
      const okTag = !filtroTag || (u.tags || []).includes(filtroTag);

      // Leads
      let okLeads = true;
      if (filtroLeads === "com") okLeads = hasSaldo(u);
      if (filtroLeads === "sem") okLeads = !hasSaldo(u);
      if (filtroLeads === "alto") okLeads = (u.consumo30d ?? 0) >= p95Consumo && p95Consumo > 0;

      return okBusca && okCidade && okPlano && okPerfil && okWhats && okCidUF && okLogin30 && okTag && okLeads;
    });
  }, [
    usuarios, busca, filtroCidade, filtroPlano, filtroPerfilIncompleto, filtroSemWhats,
    filtroSemCidadeEstado, filtroSemLogin30d, filtroTag, filtroLeads, p95Consumo
  ]);

  /* ========================= Ações por linha ========================= */
  async function logAdminAction(action: string, usuarioId: string, before: any, after: any) {
    try {
      await addDoc(collection(db, "adminLogs"), {
        usuarioId,
        action,
        before,
        after,
        at: serverTimestamp()
      });
    } catch (e) {
      console.warn("Falha ao gravar adminLogs:", e);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Excluir usuário de forma permanente? Essa ação não pode ser desfeita.")) return;
    const before = usuarios.find(u => u.id === id);
    await deleteDoc(doc(db, "usuarios", id));
    setUsuarios(us => us.filter(u => u.id !== id));
    await logAdminAction("delete-usuario", id, before || null, null);
  }

  async function handleStatus(id: string, novo: "Ativo" | "Bloqueado" | "Pendente" | "Inativo") {
    const before = usuarios.find(u => u.id === id);
    await updateDoc(doc(db, "usuarios", id), { status: novo });
    setUsuarios(us => us.map(u => u.id === id ? { ...u, status: novo } : u));
    await logAdminAction("update-status", id, before || null, { status: novo });
  }

  async function handleRole(id: string, novo: "admin" | "usuario" | "patrocinador") {
    const before = usuarios.find(u => u.id === id);
    await updateDoc(doc(db, "usuarios", id), { role: novo, tipo: novo });
    setUsuarios(us => us.map(u => u.id === id ? { ...u, role: novo, tipo: novo } : u));
    await logAdminAction("update-role", id, before || null, { role: novo, tipo: novo });
  }

  async function handlePlano(
    id: string,
    patch: Partial<Pick<UsuarioDoc, "planoTipo" | "planoStatus" | "planoExpiraEm" | "leadsInclusos" | "leadsConsumidos">>
  ) {
    const before = usuarios.find(u => u.id === id);
    await updateDoc(doc(db, "usuarios", id), patch as any);
    setUsuarios(us => us.map(u => u.id === id ? { ...u, ...patch } : u));
    await logAdminAction("update-plano", id, before || null, patch);
  }

  async function handleApplyTag(id: string, tag: string) {
    if (!tag) return;
    const u = usuarios.find(x => x.id === id);
    const tags = new Set([...(u?.tags || []), tag]);
    await updateDoc(doc(db, "usuarios", id), { tags: Array.from(tags) });
    setUsuarios(us => us.map(x => x.id === id ? { ...x, tags: Array.from(tags) } : x));
    await logAdminAction("apply-tag", id, { tags: u?.tags || [] }, { tags: Array.from(tags) });
  }

  /* ========================= Ações em massa ========================= */
  const idsSelecionados = useMemo(() => Object.keys(selecionados).filter(id => selecionados[id]), [selecionados]);

  async function bulkStatus(novo: "Ativo" | "Bloqueado") {
    if (!idsSelecionados.length) return;
    if (!window.confirm(`Alterar status de ${idsSelecionados.length} usuário(s) para ${novo}?`)) return;
    await Promise.all(idsSelecionados.map(async (id) => handleStatus(id, novo)));
    setSelecionados({});
  }

  async function bulkTag(tag: string) {
    if (!idsSelecionados.length || !tag) return;
    if (!window.confirm(`Aplicar a tag "${tag}" em ${idsSelecionados.length} usuário(s)?`)) return;
    await Promise.all(idsSelecionados.map(async (id) => handleApplyTag(id, tag)));
    setSelecionados({});
  }

  async function bulkPromotePatrocinador(planoTipo: string) {
    if (!idsSelecionados.length) return;
    if (!window.confirm(`PROMOVER ${idsSelecionados.length} usuário(s) para patrocinador com plano "${planoTipo}"?`)) return;
    if (!window.confirm(`Confirma novamente? Essa ação altera o papel e define plano.`)) return;
    await Promise.all(idsSelecionados.map(async (id) => {
      await handleRole(id, "patrocinador");
      await handlePlano(id, { planoTipo, planoStatus: "ativo" });
    }));
    setSelecionados({});
  }

  /* ========================= Export CSV ========================= */
  function exportCSV() {
    const cols = [
      "id", "nome", "email", "role", "status", "verificado",
      "estado", "cidade", "createdAt", "lastLoginAt",
      "planoTipo", "planoStatus", "planoExpiraEm",
      "leadsInclusos", "leadsConsumidos", "tags"
    ];
    const lines = [cols.join(",")];
    usuariosFiltrados.forEach(u => {
      const row = [
        u.id,
        (u.nome || "").replace(/,/g, " "),
        (u.email || "").replace(/,/g, " "),
        asRole(u),
        asStatus(u),
        String(!!u.verificado),
        u.estado || "",
        u.cidade || "",
        formatDate(u.createdAt),
        formatDate(u.lastLoginAt || u.lastLogin),
        u.planoTipo || "",
        u.planoStatus || "",
        formatDate(u.planoExpiraEm),
        String(u.leadsInclusos ?? ""),
        String(u.leadsConsumidos ?? ""),
        (u.tags || []).join("|")
      ];
      lines.push(row.map(v => `"${v}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usuarios-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ========================= Métricas simples ========================= */
  const total = usuarios.length;
  const admins = usuarios.filter(u => asRole(u) === "admin").length;
  const patrocinadoresAtivos = usuarios.filter(u => asRole(u) === "patrocinador" && (u.planoStatus === "ativo")).length;
  const expiram7 = usuarios.filter(u => (u.planoStatus === "ativo") && daysFromNow(tsToDate(u.planoExpiraEm)) <= 7).length;
  const novos7 = usuarios.filter(u => {
    const c = tsToDate(u.createdAt);
    if (!c) return false;
    const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0,0,0,0);
    return c >= d;
  }).length;
  const semWhats = usuarios.filter(u => !u.whatsapp).length;
  const perfilIncomp = usuarios.filter(u => u.perfilCompleto === false).length;

  /* ========================= UI ========================= */
  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", padding: "46px 0 30px 0" }}>
      <section style={{ maxWidth: 1380, margin: "0 auto", padding: "0 2vw" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 22 }}>
          <h1 style={{ fontWeight: 900, fontSize: "2.3rem", color: "#023047", margin: 0, letterSpacing: "-1px" }}>
            Gestão de Usuários
          </h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => fetchUsuarios(true)}
              title="Recarregar"
              style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontWeight: 800 }}
            >
              <RefreshCw size={18} />
            </button>
            <Link href="/admin/usuarios/create" style={{
              background: "#FB8500", color: "#fff", borderRadius: 16, fontWeight: 800, fontSize: "1.05rem",
              padding: "12px 18px", textDecoration: "none", boxShadow: "0 2px 12px #0001", display: "inline-flex", alignItems: "center", gap: 8
            }}>
              <PlusCircle size={18} /> Novo Usuário
            </Link>
          </div>
        </div>

        {/* Cards */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <ResumoCard label="Carregados" value={total} icon={<Users size={18} />} color="#2563eb" />
          <ResumoCard label="Admins" value={admins} icon={<ShieldCheck size={18} />} color="#4f46e5" />
          <ResumoCard label="Patrocinadores ativos" value={patrocinadoresAtivos} icon={<BadgeCheck size={18} />} color="#059669" />
          <ResumoCard label="Expiram ≤7d" value={expiram7} icon={<AlertTriangle size={18} />} color="#d97706" />
          <ResumoCard label="Novos (7d)" value={novos7} icon={<UserCheck size={18} />} color="#0ea5e9" />
          <ResumoCard label="Sem WhatsApp" value={semWhats} icon={<XCircle size={18} />} color="#ef4444" />
          <ResumoCard label="Perfis incompletos" value={perfilIncomp} icon={<AlertTriangle size={18} />} color="#f59e0b" />
        </div>

        {/* Busca + Filtros */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", top: 9, left: 10, color: "#a0a0a0" }} />
            <input
              style={{
                padding: "8px 8px 8px 35px", borderRadius: 11, border: "1px solid #e0e7ef",
                minWidth: 240, fontSize: 15, fontWeight: 600, color: "#023047"
              }}
              placeholder="Buscar nome / email / ID / cidade"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          <select value={filtroRole} onChange={e => setFiltroRole(e.target.value as any)} style={sel()}>
            <option value="">Todos papéis</option>
            <option value="admin">Admin</option>
            <option value="patrocinador">Patrocinador</option>
            <option value="usuario">Usuário</option>
          </select>

          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as any)} style={sel()}>
            <option value="">Todos status</option>
            <option value="Ativo">Ativo</option>
            <option value="Bloqueado">Bloqueado</option>
            <option value="Pendente">Pendente</option>
            <option value="Inativo">Inativo</option>
          </select>

          <select value={filtroVerificado} onChange={e => setFiltroVerificado(e.target.value as any)} style={sel()}>
            <option value="">Verificado?</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>

          <select value={filtroUF} onChange={e => { setFiltroUF(e.target.value); setFiltroCidade(""); }} style={sel()}>
            <option value="">UF</option>
            {estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>

          <select value={filtroCidade} onChange={e => setFiltroCidade(e.target.value)} style={sel()}>
            <option value="">Cidade</option>
            {cidades.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={periodo} onChange={e => setPeriodo(e.target.value as any)} style={sel()}>
            <option value="todos">Período: Todos</option>
            <option value="hoje">Hoje</option>
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
            <option value="custom">Custom</option>
          </select>

          {periodo === "custom" && (
            <>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={sel()} />
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={sel()} />
            </>
          )}

          <select value={filtroPlano} onChange={e => setFiltroPlano(e.target.value as any)} style={sel()}>
            <option value="">Patrocínio</option>
            <option value="ativo">Plano Ativo</option>
            <option value="expira7">Expira ≤7 dias</option>
            <option value="inadimplente">Inadimplente</option>
            <option value="expirado">Expirado</option>
          </select>

          <details>
            <summary style={{ cursor: "pointer", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Filter size={16} /> Avançados
            </summary>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <label style={chk()}><input type="checkbox" checked={filtroPerfilIncompleto} onChange={e => setFiltroPerfilIncompleto(e.target.checked)} /> Perfil incompleto</label>
              <label style={chk()}><input type="checkbox" checked={filtroSemWhats} onChange={e => setFiltroSemWhats(e.target.checked)} /> Sem WhatsApp</label>
              <label style={chk()}><input type="checkbox" checked={filtroSemCidadeEstado} onChange={e => setFiltroSemCidadeEstado(e.target.checked)} /> Sem cidade/UF</label>
              <label style={chk()}><input type="checkbox" checked={filtroSemLogin30d} onChange={e => setFiltroSemLogin30d(e.target.checked)} /> Sem login ≥30d</label>
              <select value={filtroTag} onChange={e => setFiltroTag(e.target.value)} style={sel()}>
                <option value="">Tag</option>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={filtroLeads} onChange={e => setFiltroLeads(e.target.value as any)} style={sel()}>
                <option value="">Leads</option>
                <option value="com">Com saldo</option>
                <option value="sem">Sem saldo</option>
                <option value="alto">Consumo alto (p95/30d)</option>
              </select>
            </div>
          </details>
        </div>

        {/* Chips de filtros aplicados */}
        <Chips
          values={[
            busca && { label: `Busca: "${busca}"`, onClear: () => setBusca("") },
            filtroRole && { label: `Papel: ${filtroRole}`, onClear: () => setFiltroRole("") },
            filtroStatus && { label: `Status: ${filtroStatus}`, onClear: () => setFiltroStatus("") },
            filtroVerificado && { label: `Verificado: ${filtroVerificado}`, onClear: () => setFiltroVerificado("") },
            filtroUF && { label: `UF: ${filtroUF}`, onClear: () => setFiltroUF("") },
            filtroCidade && { label: `Cidade: ${filtroCidade}`, onClear: () => setFiltroCidade("") },
            periodo !== "todos" && { label: `Período: ${periodo}`, onClear: () => { setPeriodo("todos"); setDataInicio(""); setDataFim(""); } },
            filtroPlano && { label: `Patrocínio: ${filtroPlano}`, onClear: () => setFiltroPlano("") },
            filtroPerfilIncompleto && { label: "Perfil incompleto", onClear: () => setFiltroPerfilIncompleto(false) },
            filtroSemWhats && { label: "Sem WhatsApp", onClear: () => setFiltroSemWhats(false) },
            filtroSemCidadeEstado && { label: "Sem cidade/UF", onClear: () => setFiltroSemCidadeEstado(false) },
            filtroSemLogin30d && { label: "Sem login ≥30d", onClear: () => setFiltroSemLogin30d(false) },
            filtroTag && { label: `Tag: ${filtroTag}`, onClear: () => setFiltroTag("") },
            filtroLeads && { label: `Leads: ${filtroLeads}`, onClear: () => setFiltroLeads("") },
          ].filter(Boolean) as any[]}
          onClearAll={() => {
            setBusca("");
            setFiltroRole(""); setFiltroStatus(""); setFiltroVerificado("");
            setFiltroUF(""); setFiltroCidade("");
            setPeriodo("todos"); setDataInicio(""); setDataFim("");
            setFiltroPlano("");
            setFiltroPerfilIncompleto(false); setFiltroSemWhats(false);
            setFiltroSemCidadeEstado(false); setFiltroSemLogin30d(false);
            setFiltroTag(""); setFiltroLeads("");
          }}
        />

        {/* Toolbar de ações em massa */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "10px 0 16px" }}>
          <span style={{ fontWeight: 800, color: "#64748b" }}>{idsSelecionados.length} selecionado(s)</span>
          <button onClick={() => bulkStatus("Bloqueado")} disabled={!idsSelecionados.length} style={btnDanger()}>
            <Lock size={16} /> Bloquear
          </button>
          <button onClick={() => bulkStatus("Ativo")} disabled={!idsSelecionados.length} style={btnSuccess()}>
            <UserCheck size={16} /> Desbloquear
          </button>
          <BulkTag onApply={(t) => bulkTag(t)} disabled={!idsSelecionados.length} />
          <button onClick={() => bulkPromotePatrocinador("padrao")} disabled={!idsSelecionados.length} style={btnPrimary()}>
            <BadgeCheck size={16} /> Tornar Patrocinador
          </button>
          <button onClick={exportCSV} style={btnNeutral()}>
            <Download size={16} /> Exportar CSV
          </button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontWeight: 800, color: "#64748b" }}>Tamanho:</label>
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value) as any)} style={sel()}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <button
              onClick={() => {
                if (!prevCursorsRef.current.length) return;
                const prev = prevCursorsRef.current.pop();
                setPageCursor(prev || null);
                fetchUsuarios(true);
              }}
              style={btnNeutral()}
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              onClick={() => {
                if (pageCursor) {
                  prevCursorsRef.current.push(pageCursor);
                  fetchUsuarios(false);
                }
              }}
              style={btnNeutral()}
            >
              Próxima <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ color: "#219EBC", fontWeight: 700, padding: 44, textAlign: "center" }}>Carregando usuários...</div>
        ) : usuariosFiltrados.length === 0 ? (
          <div style={{ color: "#adb0b6", fontWeight: 600, padding: 44, textAlign: "center" }}>
            Nenhum resultado — experimente limpar os filtros.
          </div>
        ) : (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: 22, marginBottom: 28
          }}>
            {usuariosFiltrados.map(u => {
              const role = asRole(u);
              const status = asStatus(u);
              const isSelected = !!selecionados[u.id];
              const expiraEm = tsToDate(u.planoExpiraEm);
              const dias = daysFromNow(expiraEm);
              const badgePlano =
                u.planoStatus === "expirado" ? { bg:"#ffe6e6", fg:"#d90429", txt:"Expirado" } :
                u.planoStatus === "inadimplente" ? { bg:"#fff4e6", fg:"#c2410c", txt:"Inadimplente" } :
                (u.planoStatus === "ativo" && dias <= 7) ? { bg:"#fff7ed", fg:"#b45309", txt:`Expira em ${Math.max(dias,0)}d` } :
                u.planoStatus === "ativo" ? { bg:"#e7faec", fg:"#059669", txt:"Plano Ativo" } : undefined;

              return (
                <div key={u.id} style={{
                  background: "#fff", borderRadius: 17, boxShadow: "0 2px 20px #0001",
                  padding: "18px 20px 16px 20px", display: "flex", flexDirection: "column",
                  gap: 10, position: "relative"
                }}>
                  <label style={{ position: "absolute", top: 14, left: 14 }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={e => setSelecionados(s => ({ ...s, [u.id]: e.target.checked }))}
                    />
                  </label>

                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 54, height: 54, borderRadius: "50%",
                      background: "linear-gradient(135deg, #FB8500 60%, #2563eb 120%)",
                      color: "#fff", fontWeight: 900, fontSize: 22,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 2px 10px #0001"
                    }}>
                      {u.nome ? u.nome.charAt(0).toUpperCase() : <User size={28} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "1.08rem", color: "#023047" }}>{u.nome || "—"}</div>
                      <div style={{ color: "#219ebc", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{u.email || "—"}</span>
                        {u.email && (
                          <ClipboardCopy size={15} onClick={() => navigator.clipboard.writeText(u.email!)} style={{ cursor: "pointer" }} />
                        )}
                        {u.verificado ? (
  <span title="Verificado" aria-label="Verificado">
    <BadgeCheck size={16} />
  </span>
) : null}

                      </div>
                      <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{u.id}</span>
                        <ClipboardCopy size={14} onClick={() => navigator.clipboard.writeText(u.id)} style={{ cursor: "pointer" }} />
                      </div>
                      {(u.cidade || u.estado) && (
                        <div style={{ color: "#64748b", fontWeight: 700, fontSize: 13, marginTop: 2 }}>
                          {u.cidade || "—"}{u.estado ? ` - ${u.estado}` : ""}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={pill("#eef2ff", "#4f46e5")}>{(role || "usuario").toUpperCase()}</span>
                    <span style={pill(status === "Ativo" ? "#e7faec" : "#ffe6e6", status === "Ativo" ? "#059669" : "#d90429")}>{status}</span>
                    {badgePlano && <span style={pill(badgePlano.bg, badgePlano.fg)}>{badgePlano.txt}</span>}
                    {(u.tags || []).slice(0, 3).map(t => <span key={t} style={pill("#f1f5f9", "#334155")}><TagIcon size={12} /> {t}</span>)}
                  </div>

                  <div style={{ color: "#A0A0A0", fontSize: 12 }}>
                    {u.createdAt && <>Cadastro: {formatDate(u.createdAt)}</>}
                    {(u.lastLoginAt || u.lastLogin) && <> {" | "} Último login: {formatDate(u.lastLoginAt || u.lastLogin)}</>}
                  </div>

                  {/* Ações */}
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

                    {/* Trocar papel */}
                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <label style={{ fontWeight: 800, color: "#64748b", fontSize: 12 }}>Papel:</label>
                      <select
                        value={asRole(u)}
                        onChange={e => handleRole(u.id, e.target.value as any)}
                        style={sel()}
                      >
                        <option value="usuario">Usuário</option>
                        <option value="patrocinador">Patrocinador</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    {/* Ajustar plano (rápido) */}
                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <label style={{ fontWeight: 800, color: "#64748b", fontSize: 12 }}>Plano:</label>
                      <select
                        value={u.planoStatus || ""}
                        onChange={e => handlePlano(u.id, { planoStatus: e.target.value as any })}
                        style={sel()}
                      >
                        <option value="">—</option>
                        <option value="ativo">Ativo</option>
                        <option value="inadimplente">Inadimplente</option>
                        <option value="expirado">Expirado</option>
                      </select>
                    </div>

                    {/* Quick tag */}
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

                    {/* Excluir (mantido, mas com confirmação forte) */}
                    <button onClick={() => handleDelete(u.id)} style={btnOutlineDanger()}>
                      <Trash2 size={15} /> Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </section>
    </main>
  );
}

/* ========================= Subcomponentes ========================= */
function ResumoCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 9,
      background: "#fff", borderRadius: 13, padding: "9px 18px",
      fontWeight: 900, color: "#023047", border: `2px solid ${color}22`, fontSize: 16,
      boxShadow: "0 2px 12px #0001"
    }}>
      <span style={{ color, display: "flex", alignItems: "center" }}>{icon}</span>
      <span style={{ fontWeight: 800, fontSize: 19, marginLeft: 4 }}>{value}</span>
      <span style={{ color: "#697A8B", fontWeight: 700, marginLeft: 6 }}>{label}</span>
    </div>
  );
}

function Chips({ values, onClearAll }: { values: { label: string; onClear: () => void }[]; onClearAll: () => void }) {
  if (!values.length) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0 12px" }}>
      {values.map((c, i) => (
        <span key={i} style={{ padding: "6px 10px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 999, fontWeight: 800, color: "#334155", display: "inline-flex", gap: 8, alignItems: "center" }}>
          {c.label}
          <button onClick={c.onClear} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b" }}>✕</button>
        </span>
      ))}
      <button onClick={onClearAll} style={{ marginLeft: 4, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 999, padding: "6px 12px", fontWeight: 900, color: "#475569", cursor: "pointer" }}>
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
      <input value={tag} onChange={e => setTag(e.target.value)} placeholder="ex.: fornecedor" style={{ ...sel(), width: 160 }} />
      <button onClick={() => onApply(tag.trim())} disabled={disabled || !tag.trim()} style={btnNeutral()}>
        <TagIcon size={16} /> Aplicar
      </button>
    </div>
  );
}

/* ========================= Estilos helpers ========================= */
function sel() {
  return {
    borderRadius: 10, border: "1px solid #e0e7ef", fontWeight: 800,
    color: "#0f172a", padding: "8px 12px", background: "#fff"
  } as React.CSSProperties;
}
function chk() {
  return { display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 800, color: "#334155", background: "#fff", padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 10 } as React.CSSProperties;
}
function pill(bg: string, fg: string) {
  return { borderRadius: 999, background: bg, color: fg, fontWeight: 900, fontSize: ".85rem", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 6 } as React.CSSProperties;
}
function btnLink() {
  return {
    background: "#e8f8fe", color: "#2563eb", border: "1px solid #e0ecff",
    fontWeight: 800, fontSize: ".95rem", padding: "7px 13px", borderRadius: 9,
    textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6
  } as React.CSSProperties;
}
function btnDanger() {
  return {
    background: "#fff0f0", color: "#d90429", border: "1px solid #ffe5e5",
    fontWeight: 800, fontSize: ".95rem", padding: "7px 12px", borderRadius: 9,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6
  } as React.CSSProperties;
}
function btnOutlineDanger() {
  return {
    background: "#fff", color: "#d90429", border: "1px solid #ffe5e5",
    fontWeight: 800, fontSize: ".95rem", padding: "7px 12px", borderRadius: 9,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6
  } as React.CSSProperties;
}
function btnSuccess() {
  return {
    background: "#e7faec", color: "#059669", border: "1px solid #d0ffdd",
    fontWeight: 800, fontSize: ".95rem", padding: "7px 12px", borderRadius: 9,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6
  } as React.CSSProperties;
}
function btnPrimary() {
  return {
    background: "#eef2ff", color: "#4f46e5", border: "1px solid #e0e7ff",
    fontWeight: 800, fontSize: ".95rem", padding: "7px 12px", borderRadius: 9,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6
  } as React.CSSProperties;
}
function btnNeutral() {
  return {
    background: "#fff", color: "#334155", border: "1px solid #e5e7eb",
    fontWeight: 800, fontSize: ".95rem", padding: "7px 12px", borderRadius: 9,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6
  } as React.CSSProperties;
}
<style jsx>{`
  .filtersBar {
    display: grid;
    gap: 10px;
    margin-bottom: 8px;
  }

  /* Linha superior: busca + ações à direita */
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
  .btnIcon {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 10px 14px;
    cursor: pointer;
    font-weight: 800;
  }
  .btnCta {
    background: #FB8500;
    color: #fff;
    border-radius: 16px;
    font-weight: 800;
    font-size: 1.05rem;
    padding: 12px 18px;
    text-decoration: none;
    box-shadow: 0 2px 12px #0001;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }

  /* Linha de filtros: rolagem horizontal no mobile */
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
    min-width: 140px; /* dá pegada boa pra rolagem no mobile */
  }

  .detailsAdv {
    min-width: unset; /* deixa o botão “Avançados” compacto */
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

  /* ================== BREAKPOINTS ================== */

  /* >= 768px (tablet): vira grid de filtros em 2 linhas/colunas */
  @media (min-width: 768px) {
    .filtersBar {
      gap: 12px;
    }
    .filtersScroller {
      flex-wrap: wrap;
      overflow: visible;
    }
    .filterItem { min-width: 180px; }
  }

  /* >= 1024px (desktop): mais conforto e alinhamento */
  @media (min-width: 1024px) {
    .filtersTopRow {
      grid-template-columns: 1fr auto;
    }
    .filtersScroller {
      display: grid;
      grid-template-columns: repeat(6, minmax(160px, 1fr));
      gap: 10px;
    }
    .filterItem { width: 100%; min-width: 0; }
    .detailsAdv { grid-column: 1 / -1; } /* avançados quebram pra nova linha */
  }
`}</style>

export default withRoleProtection(ListaUsuariosAdmin, { allowed: ["admin"] });
