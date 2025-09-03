"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
} from "firebase/firestore";
import {
  Edit,
  Trash2,
  PlusCircle,
  ChevronLeft,
  RefreshCw,
  Search,
  Filter,
  ChevronRight,
  Tag as TagIcon,
  Download,
  Lock,
  BadgeCheck,
  XCircle,
  CheckCircle2,
  Package,
  MapPin,
  AlertTriangle,
  BadgeDollarSign,
} from "lucide-react";
import { withRoleProtection } from "@/utils/withRoleProtection";

/* ========================= Types ========================= */
type Produto = {
  id: string;
  nome: string;
  descricao?: string;
  preco?: number;
  imagens?: string[];
  categoria?: string;
  cidade?: string;
  estado?: string;
  status?: "Ativo" | "Inativo" | "Bloqueado" | "Pendente" | string;
  createdAt?: any;
  userId?: string;
  verificado?: boolean;   // opcional, caso use selo
  tags?: string[];        // opcional
};

/* ========================= Utils ========================= */
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
function hasImagem(p: Produto) {
  return Array.isArray(p.imagens) && p.imagens.length > 0 && !!p.imagens[0];
}
function asStatus(p: Produto): "Ativo" | "Inativo" | "Bloqueado" | "Pendente" {
  const s = (p.status || "Ativo").toString().toLowerCase();
  if (s === "ativo") return "Ativo";
  if (s === "inativo") return "Inativo";
  if (s === "bloqueado") return "Bloqueado";
  if (s === "pendente") return "Pendente";
  return "Ativo";
}

/* ========================= Página ========================= */
function AdminProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  // paginação
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25);
  const [pageCursor, setPageCursor] = useState<any | null>(null);
  const prevCursorsRef = useRef<any[]>([]);

  // filtros essenciais
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"" | "Ativo" | "Inativo" | "Bloqueado" | "Pendente">("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroUF, setFiltroUF] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");

  // período
  const [periodo, setPeriodo] = useState<"todos" | "hoje" | "7d" | "30d" | "custom">("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // preço
  const [precoMin, setPrecoMin] = useState<string>("");
  const [precoMax, setPrecoMax] = useState<string>("");

  // avançados
  const [filtroComImagem, setFiltroComImagem] = useState<"" | "com" | "sem">("");
  const [filtroVerificado, setFiltroVerificado] = useState<"" | "sim" | "nao">("");
  const [filtroTag, setFiltroTag] = useState("");

  // seleção em massa
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});

  /* ========================= Opções dinâmicas (baseadas nos carregados) ========================= */
  const categorias = useMemo(() => {
    const s = new Set<string>();
    produtos.forEach(p => p.categoria && s.add(p.categoria));
    return Array.from(s).sort();
  }, [produtos]);

  const estados = useMemo(() => {
    const s = new Set<string>();
    produtos.forEach(p => p.estado && s.add(p.estado));
    return Array.from(s).sort();
  }, [produtos]);

  const cidades = useMemo(() => {
    const s = new Set<string>();
    produtos.forEach(p => {
      if (!filtroUF || p.estado === filtroUF) p.cidade && s.add(p.cidade);
    });
    return Array.from(s).sort();
  }, [produtos, filtroUF]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    produtos.forEach(p => (p.tags || []).forEach(t => s.add(t)));
    return Array.from(s).sort();
  }, [produtos]);

  /* ========================= Fetch Paginado (com fallback) ========================= */
  async function fetchProdutos(reset = false) {
    setLoading(true);
    try {
      // intervalo de datas
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

      // wheres server-side (apenas os que Firestore suporta direto)
      const wheres: any[] = [];
      if (filtroStatus) wheres.push(where("status", "==", filtroStatus));
      if (filtroCategoria) wheres.push(where("categoria", "==", filtroCategoria));
      if (filtroUF) wheres.push(where("estado", "==", filtroUF));
      if (filtroCidade) wheres.push(where("cidade", "==", filtroCidade));
      if (filtroVerificado) wheres.push(where("verificado", "==", filtroVerificado === "sim"));

      if (di && df) {
        // exige índice quando combinado com orderBy
        wheres.push(where("createdAt", ">=", di));
        wheres.push(where("createdAt", "<=", df));
      }

      // preço (se vierem ambos, dá pra fazer server-side; se vier apenas um, manter client-side por simplicidade)
      const precoMinNum = precoMin ? Number(precoMin) : undefined;
      const precoMaxNum = precoMax ? Number(precoMax) : undefined;
      const aplicarPrecoNoCliente = !(precoMinNum !== undefined && !isNaN(precoMinNum) && precoMaxNum !== undefined && !isNaN(precoMaxNum));

      // tenta com orderBy(createdAt)
      async function run(ordered = true) {
        const base = ordered
          ? fsQuery(collection(db, "produtos"), ...wheres, orderBy("createdAt", "desc"))
          : fsQuery(collection(db, "produtos"), ...wheres);

        const q = (reset || !pageCursor)
          ? fsQuery(base, limit(pageSize))
          : fsQuery(base, startAfter(pageCursor), limit(pageSize));

        const snap = await getDocs(q);
        return { docs: snap.docs, last: snap.docs.at(-1) ?? null };
      }

      let res;
      try {
        res = await run(true);
      } catch (e) {
        // fallback sem orderBy (falta índice)
        console.warn("[produtos] fallback sem orderBy/índice:", e);
        res = await run(false);
      }

      let items = res.docs.map(d => ({ id: d.id, ...d.data() } as Produto));

      // filtros client-side complementares
      items = items.filter(p => {
        // busca
        const t = busca.trim().toLowerCase();
        const okBusca = !t
          || (p.nome || "").toLowerCase().includes(t)
          || (p.descricao || "").toLowerCase().includes(t)
          || (p.categoria || "").toLowerCase().includes(t)
          || (p.cidade || "").toLowerCase().includes(t)
          || (p.estado || "").toLowerCase().includes(t)
          || (p.id || "").toLowerCase().includes(t);

        // imagem
        let okImg = true;
        if (filtroComImagem === "com") okImg = hasImagem(p);
        if (filtroComImagem === "sem") okImg = !hasImagem(p);

        // preço (client quando necessário)
        let okPreco = true;
        if (aplicarPrecoNoCliente) {
          if (precoMinNum !== undefined && !isNaN(precoMinNum)) {
            okPreco = okPreco && (typeof p.preco === "number" ? p.preco >= precoMinNum : false);
          }
          if (precoMaxNum !== undefined && !isNaN(precoMaxNum)) {
            okPreco = okPreco && (typeof p.preco === "number" ? p.preco <= precoMaxNum : false);
          }
        }

        // tag
        const okTag = !filtroTag || (p.tags || []).includes(filtroTag);

        return okBusca && okImg && okPreco && okTag;
      });

      setProdutos(items);
      setPageCursor(res.last);
      if (reset) prevCursorsRef.current = [];
    } catch (e) {
      console.error("Erro ao buscar produtos:", e);
      setProdutos([]);
      setPageCursor(null);
    } finally {
      setLoading(false);
    }
  }

  // primeira carga + recarga ao trocar filtros server-side relevantes
  useEffect(() => {
    prevCursorsRef.current = [];
    setPageCursor(null);
    fetchProdutos(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filtroStatus,
    filtroCategoria,
    filtroUF,
    filtroCidade,
    filtroVerificado,
    periodo,
    dataInicio,
    dataFim,
    pageSize,
  ]);

  /* ========================= Client memo filtrado final (para busca/cliente leve) ========================= */
  const produtosFiltrados = useMemo(() => {
    // (já filtramos muita coisa no fetch; aqui dá pra aplicar algo residual se quiser)
    return produtos;
  }, [produtos]);

  /* ========================= Ações por item / massa ========================= */
  async function logAdminAction(action: string, produtoId: string, before: any, after: any) {
    try {
      await addDoc(collection(db, "adminLogs"), {
        produtoId,
        action,
        before,
        after,
        at: serverTimestamp(),
      });
    } catch (e) {
      console.warn("Falha ao gravar adminLogs:", e);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Excluir produto de forma permanente? Essa ação não pode ser desfeita.")) return;
    const before = produtos.find(p => p.id === id);
    await deleteDoc(doc(db, "produtos", id));
    setProdutos(ps => ps.filter(p => p.id !== id));
    await logAdminAction("delete-produto", id, before || null, null);
  }

  async function handleStatus(id: string, novo: "Ativo" | "Inativo" | "Bloqueado" | "Pendente") {
    const before = produtos.find(p => p.id === id);
    await updateDoc(doc(db, "produtos", id), { status: novo });
    setProdutos(ps => ps.map(p => (p.id === id ? { ...p, status: novo } : p)));
    await logAdminAction("update-status-produto", id, before || null, { status: novo });
  }

  async function handleApplyTag(id: string, tag: string) {
    if (!tag) return;
    const p = produtos.find(x => x.id === id);
    const tags = new Set([...(p?.tags || []), tag]);
    await updateDoc(doc(db, "produtos", id), { tags: Array.from(tags) });
    setProdutos(ps => ps.map(x => (x.id === id ? { ...x, tags: Array.from(tags) } : x)));
    await logAdminAction("apply-tag-produto", id, { tags: p?.tags || [] }, { tags: Array.from(tags) });
  }

  const idsSelecionados = useMemo(() => Object.keys(selecionados).filter(id => selecionados[id]), [selecionados]);

  async function bulkStatus(novo: "Ativo" | "Bloqueado" | "Inativo") {
    if (!idsSelecionados.length) return;
    if (!window.confirm(`Alterar status de ${idsSelecionados.length} produto(s) para ${novo}?`)) return;
    await Promise.all(idsSelecionados.map(async (id) => handleStatus(id, novo)));
    setSelecionados({});
  }

  async function bulkTag(tag: string) {
    if (!idsSelecionados.length || !tag) return;
    if (!window.confirm(`Aplicar a tag "${tag}" em ${idsSelecionados.length} produto(s)?`)) return;
    await Promise.all(idsSelecionados.map(async (id) => handleApplyTag(id, tag)));
    setSelecionados({});
  }

  /* ========================= Export CSV ========================= */
  function exportCSV() {
    const cols = [
      "id", "nome", "categoria", "preco", "status",
      "estado", "cidade", "createdAt", "userId", "verificado", "tags", "temImagem"
    ];
    const lines = [cols.join(",")];
    produtosFiltrados.forEach(p => {
      const row = [
        p.id,
        (p.nome || "").replace(/,/g, " "),
        p.categoria || "",
        p.preco != null ? String(p.preco).replace(".", ",") : "",
        asStatus(p),
        p.estado || "",
        p.cidade || "",
        formatDate(p.createdAt),
        p.userId || "",
        String(!!p.verificado),
        (p.tags || []).join("|"),
        hasImagem(p) ? "sim" : "nao",
      ];
      lines.push(row.map(v => `"${v}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `produtos-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ========================= Métricas simples ========================= */
  const total = produtos.length;
  const ativos = produtos.filter(p => asStatus(p) === "Ativo").length;
  const semImagem = produtos.filter(p => !hasImagem(p)).length;
  const novos7 = produtos.filter(p => {
    const c = tsToDate(p.createdAt);
    if (!c) return false;
    const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0,0,0,0);
    return c >= d;
  }).length;

  /* ========================= UI ========================= */
  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", padding: "46px 0 30px 0" }}>
      <section style={{ maxWidth: 1380, margin: "0 auto", padding: "0 2vw" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 22 }}>
          <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#2563eb", fontWeight: 800, textDecoration: "none" }}>
            <ChevronLeft size={18} /> Voltar ao Painel
          </Link>
          <h1 style={{ fontWeight: 900, fontSize: "2.3rem", color: "#023047", margin: 0, letterSpacing: "-1px" }}>
            Gestão de Produtos
          </h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => fetchProdutos(true)}
              title="Recarregar"
              style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontWeight: 800 }}
            >
              <RefreshCw size={18} />
            </button>
            <Link href="/create-produto" style={{
              background: "#FB8500", color: "#fff", borderRadius: 16, fontWeight: 800, fontSize: "1.05rem",
              padding: "12px 18px", textDecoration: "none", boxShadow: "0 2px 12px #0001", display: "inline-flex", alignItems: "center", gap: 8
            }}>
              <PlusCircle size={18} /> Novo Produto
            </Link>
          </div>
        </div>

        {/* Cards de resumo */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <ResumoCard label="Carregados" value={total} icon={<Package size={18} />} color="#2563eb" />
          <ResumoCard label="Ativos" value={ativos} icon={<CheckCircle2 size={18} />} color="#059669" />
          <ResumoCard label="Sem imagem" value={semImagem} icon={<XCircle size={18} />} color="#ef4444" />
          <ResumoCard label="Novos (7d)" value={novos7} icon={<AlertTriangle size={18} />} color="#d97706" />
        </div>

        {/* Busca + filtros */}
        <div className="filtersBar">
          {/* Linha 1: busca + ações */}
          <div className="filtersTopRow">
            <div className="searchWrap">
              <Search size={18} className="searchIcon" />
              <input
                className="searchInput"
                placeholder="Buscar por nome / descrição / categoria / cidade / estado / ID"
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>

            <div className="filtersActionsRight">
              <button onClick={exportCSV} className="btnIcon" title="Exportar CSV">
                <Download size={18} />
              </button>
            </div>
          </div>

          {/* Linha 2: filtros roláveis */}
          <div className="filtersScroller">
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as any)} className="filterItem">
              <option value="">Todos status</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
              <option value="Pendente">Pendente</option>
              <option value="Bloqueado">Bloqueado</option>
            </select>

            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="filterItem">
              <option value="">Categoria</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select value={filtroUF} onChange={e => { setFiltroUF(e.target.value); setFiltroCidade(""); }} className="filterItem">
              <option value="">UF</option>
              {estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>

            <select value={filtroCidade} onChange={e => setFiltroCidade(e.target.value)} className="filterItem">
              <option value="">Cidade</option>
              {cidades.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select value={periodo} onChange={e => setPeriodo(e.target.value as any)} className="filterItem">
              <option value="todos">Período: Todos</option>
              <option value="hoje">Hoje</option>
              <option value="7d">7 dias</option>
              <option value="30d">30 dias</option>
              <option value="custom">Custom</option>
            </select>

            {periodo === "custom" && (
              <>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="filterItem" />
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="filterItem" />
              </>
            )}

            <div className="filterItem" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <BadgeDollarSign size={16} />
              <input
                type="number"
                placeholder="Preço min"
                value={precoMin}
                onChange={e => setPrecoMin(e.target.value)}
                style={{ width: 110, border: "none", outline: "none" }}
              />
              <span>—</span>
              <input
                type="number"
                placeholder="Preço max"
                value={precoMax}
                onChange={e => setPrecoMax(e.target.value)}
                style={{ width: 110, border: "none", outline: "none" }}
              />
            </div>

            <select value={filtroComImagem} onChange={e => setFiltroComImagem(e.target.value as any)} className="filterItem">
              <option value="">Imagens</option>
              <option value="com">Com imagem</option>
              <option value="sem">Sem imagem</option>
            </select>

            <select value={filtroVerificado} onChange={e => setFiltroVerificado(e.target.value as any)} className="filterItem">
              <option value="">Verificado?</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>

            <details className="filterItem detailsAdv">
              <summary className="btnAdv">
                <Filter size={16} /> Avançados
              </summary>
              <div className="advContent">
                <select value={filtroTag} onChange={e => setFiltroTag(e.target.value)} style={sel()}>
                  <option value="">Tag</option>
                  {allTags.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </details>
          </div>
        </div>

        {/* Chips de filtros aplicados */}
        <Chips
          values={[
            busca && { label: `Busca: "${busca}"`, onClear: () => setBusca("") },
            filtroStatus && { label: `Status: ${filtroStatus}`, onClear: () => setFiltroStatus("") },
            filtroCategoria && { label: `Categoria: ${filtroCategoria}`, onClear: () => setFiltroCategoria("") },
            filtroUF && { label: `UF: ${filtroUF}`, onClear: () => setFiltroUF("") },
            filtroCidade && { label: `Cidade: ${filtroCidade}`, onClear: () => setFiltroCidade("") },
            periodo !== "todos" && { label: `Período: ${periodo}`, onClear: () => { setPeriodo("todos"); setDataInicio(""); setDataFim(""); } },
            (precoMin || precoMax) && { label: `Preço: ${precoMin || "—"} a ${precoMax || "—"}`, onClear: () => { setPrecoMin(""); setPrecoMax(""); } },
            filtroComImagem && { label: `Imagens: ${filtroComImagem}`, onClear: () => setFiltroComImagem("") },
            filtroVerificado && { label: `Verificado: ${filtroVerificado}`, onClear: () => setFiltroVerificado("") },
            filtroTag && { label: `Tag: ${filtroTag}`, onClear: () => setFiltroTag("") },
          ].filter(Boolean) as any[]}
          onClearAll={() => {
            setBusca("");
            setFiltroStatus(""); setFiltroCategoria("");
            setFiltroUF(""); setFiltroCidade("");
            setPeriodo("todos"); setDataInicio(""); setDataFim("");
            setPrecoMin(""); setPrecoMax("");
            setFiltroComImagem(""); setFiltroVerificado("");
            setFiltroTag("");
          }}
        />

        {/* Toolbar de ações em massa */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "10px 0 16px" }}>
          <span style={{ fontWeight: 800, color: "#64748b" }}>{idsSelecionados.length} selecionado(s)</span>
          <button onClick={() => bulkStatus("Bloqueado")} disabled={!idsSelecionados.length} style={btnDanger()}>
            <Lock size={16} /> Bloquear
          </button>
          <button onClick={() => bulkStatus("Ativo")} disabled={!idsSelecionados.length} style={btnSuccess()}>
            <CheckCircle2 size={16} /> Ativar
          </button>
          <BulkTag onApply={(t) => bulkTag(t)} disabled={!idsSelecionados.length} />
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
                fetchProdutos(true);
              }}
              style={btnNeutral()}
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              onClick={() => {
                if (pageCursor) {
                  prevCursorsRef.current.push(pageCursor);
                  fetchProdutos(false);
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
          <div style={{ color: "#219EBC", fontWeight: 700, padding: 44, textAlign: "center" }}>Carregando produtos...</div>
        ) : produtosFiltrados.length === 0 ? (
          <div style={{ color: "#adb0b6", fontWeight: 600, padding: 44, textAlign: "center" }}>
            Nenhum resultado — experimente limpar os filtros.
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: 22, marginBottom: 28
          }}>
            {produtosFiltrados.map(p => {
              const isSelected = !!selecionados[p.id];
              const status = asStatus(p);

              return (
                <div key={p.id} style={{
                  background: "#fff", borderRadius: 17, boxShadow: "0 2px 20px #0001",
                  padding: "18px 20px 16px 20px", display: "flex", flexDirection: "column",
                  gap: 10, position: "relative"
                }}>
                  {/* checkbox de seleção */}
                  <label style={{ position: "absolute", top: 14, left: 14 }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={e => setSelecionados(s => ({ ...s, [p.id]: e.target.checked }))}
                    />
                  </label>

                  {/* header do card */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {hasImagem(p) ? (
                      <img
                        src={p.imagens![0]}
                        alt={p.nome}
                        style={{
                          width: 64, height: 64, borderRadius: 12, objectFit: "cover",
                          border: "1px solid #eef2f7"
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 64, height: 64, borderRadius: 12, background: "#f3f4f6",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1px solid #eef2f7"
                      }}>
                        <Package size={28} color="#FB8500" />
                      </div>
                    )}

                    <div>
                      <div style={{ fontWeight: 900, fontSize: "1.12rem", color: "#023047" }}>{p.nome || "—"}</div>
                      <div style={{ color: "#FB8500", fontWeight: 700, fontSize: 14 }}>{p.categoria || "Sem categoria"}</div>
                      {(p.cidade || p.estado) && (
                        <div style={{ color: "#94a3b8", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                          <MapPin size={14} /> {p.cidade || "—"}{p.estado ? ` - ${p.estado}` : ""}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* badges */}
                  <div style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={pill(status === "Ativo" ? "#e7faec" : "#ffe6e6", status === "Ativo" ? "#059669" : "#d90429")}>{status}</span>
                    {p.verificado ? <span style={pill("#eef2ff", "#4f46e5")}><BadgeCheck size={12} /> Verificado</span> : null}
                    {(p.tags || []).slice(0, 3).map(t => <span key={t} style={pill("#f1f5f9", "#334155")}><TagIcon size={12} /> {t}</span>)}
                  </div>

                  {/* descrição */}
                  <div style={{ color: "#525252", fontSize: ".98rem", minHeight: 36, maxHeight: 72, overflow: "hidden" }}>
                    {p.descricao || <span style={{ color: "#A0A0A0" }}>Sem descrição.</span>}
                  </div>

                  {/* preço + datas */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: "#FB8500", fontWeight: 900, fontSize: 20 }}>
                      {typeof p.preco === "number" ? `R$ ${Number(p.preco).toLocaleString("pt-BR")}` : "—"}
                    </span>
                    <div style={{ color: "#A0A0A0", fontSize: 12, fontWeight: 700 }}>
                      {p.createdAt && <>Criado: {formatDate(p.createdAt)}</>}
                    </div>
                  </div>

                  {/* ações */}
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <Link href={`/admin/produtos/${p.id}/edit`} style={btnLink()}>
                      <Edit size={15} /> Editar
                    </Link>

                    {asStatus(p) !== "Bloqueado" ? (
                      <button onClick={() => handleStatus(p.id, "Bloqueado")} style={btnDanger()}>
                        <Lock size={15} /> Bloquear
                      </button>
                    ) : (
                      <button onClick={() => handleStatus(p.id, "Ativo")} style={btnSuccess()}>
                        <CheckCircle2 size={15} /> Ativar
                      </button>
                    )}

                    {/* quick tag */}
                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <label style={{ fontWeight: 800, color: "#64748b", fontSize: 12 }}>Tag:</label>
                      <input
                        placeholder="ex.: destaque"
                        onKeyDown={(e) => {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (e.key === "Enter" && val) {
                            handleApplyTag(p.id, val);
                            (e.target as HTMLInputElement).value = "";
                          }
                        }}
                        style={{ ...sel(), width: 150 }}
                      />
                    </div>

                    <button onClick={() => handleDelete(p.id)} style={btnOutlineDanger()}>
                      <Trash2 size={15} /> Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Estilos responsivos e helpers */}
      <style jsx>{`
        .filtersBar {
          display: grid;
          gap: 10px;
          margin-bottom: 8px;
        }
        .filtersTopRow {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 10px;
        }
        .searchWrap { position: relative; }
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

        .filtersScroller {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: thin;
          -webkit-overflow-scrolling: touch;
        }
        .filtersScroller::-webkit-scrollbar { height: 8px; }
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
        .detailsAdv { min-width: unset; }
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

        @media (min-width: 768px) {
          .filtersBar { gap: 12px; }
          .filtersScroller { flex-wrap: wrap; overflow: visible; }
          .filterItem { min-width: 180px; }
        }
        @media (min-width: 1024px) {
          .filtersTopRow { grid-template-columns: 1fr auto; }
          .filtersScroller {
            display: grid;
            grid-template-columns: repeat(6, minmax(160px, 1fr));
            gap: 10px;
          }
          .filterItem { width: 100%; min-width: 0; }
          .detailsAdv { grid-column: 1 / -1; }
        }
      `}</style>
    </main>
  );
}

/* ========================= Subcomponentes & estilos helpers ========================= */
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
      <input value={tag} onChange={e => setTag(e.target.value)} placeholder="ex.: destaque" style={{ ...sel(), width: 160 }} />
      <button onClick={() => onApply(tag.trim())} disabled={disabled || !tag.trim()} style={btnNeutral()}>
        <TagIcon size={16} /> Aplicar
      </button>
    </div>
  );
}

/* ===== estilos helpers ===== */
function sel() {
  return {
    borderRadius: 10, border: "1px solid #e0e7ef", fontWeight: 800,
    color: "#0f172a", padding: "8px 12px", background: "#fff"
  } as React.CSSProperties;
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
function btnNeutral() {
  return {
    background: "#fff", color: "#334155", border: "1px solid #e5e7eb",
    fontWeight: 800, fontSize: ".95rem", padding: "7px 12px", borderRadius: 9,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6
  } as React.CSSProperties;
}

export default withRoleProtection(AdminProdutosPage, { allowed: ["admin"] });
