"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { db } from "@/firebaseConfig";
import {
  collection,
  getDocs,
  orderBy,
  limit,
  startAfter,
  query,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  ClipboardList,
  MapPin,
  Calendar,
  Plus,
  Eye,
  Users,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ================== Utils ================== */
function toDate(ts?: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}
function resumo(str: string = "", len = 120) {
  if (!str) return "";
  return str.length <= len ? str : str.slice(0, len - 3) + "...";
}
function fmtData(ts?: any) {
  const d = toDate(ts);
  return d ? d.toLocaleDateString("pt-BR") : "-";
}
function isFechada(d: any) {
  // aceita `status: "fechada"` ou `fechada: true`
  const s = (d?.status || "").toString().toLowerCase();
  return s === "fechada" || !!d?.fechada;
}

/* ================== Tipos ================== */
type SortKey = "recentes" | "views_desc" | "interessados_desc";

export default function VitrineDemandas() {
  // lista e paginação
  
  const [demandas, setDemandas] = useState<any[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const pageSize = 24;
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const finishedRef = useRef<boolean>(false);

  // filtros
  const [categoria, setCategoria] = useState("");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [somenteAbertas, setSomenteAbertas] = useState(true);
// começa mostrando as oficiais
const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<string[]>(CATEGORIAS_DEMANDAS);

  // ordenação
  const [sortKey, setSortKey] = useState<SortKey>("recentes");

  // busca (debounce)
  const [buscaRaw, setBuscaRaw] = useState("");
  const [busca, setBusca] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setBusca(buscaRaw.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [buscaRaw]);

  // selects dependentes
  const [estadosDisponiveis, setEstadosDisponiveis] = useState<string[]>([]);
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState<string[]>([]);

  // carregar primeira página
  useEffect(() => {
    (async () => {
      setCarregandoLista(true);
      setDemandas([]);
      lastDocRef.current = null;
      finishedRef.current = false;

      const qRef = query(
        collection(db, "demandas"),
        orderBy("createdAt", "desc"),
        limit(pageSize)
      );
      const snap = await getDocs(qRef);

      const list: any[] = [];
      let last: QueryDocumentSnapshot<DocumentData> | null = null;
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
        last = doc;
      });

      lastDocRef.current = last;
      if (!last || snap.empty) finishedRef.current = true;

      // estados únicos
      const estSet = new Set<string>();
      list.forEach((x) => x.estado && estSet.add(x.estado));
      setEstadosDisponiveis(Array.from(estSet).sort());

      setDemandas(list);
      setCarregandoLista(false);
    })();
  }, []);
  
const CATEGORIAS_DEMANDAS = [
  "Equipamentos de Perfuração e Demolição",
  "Equipamentos de Carregamento e Transporte",
  "Britagem e Classificação",
  "Beneficiamento e Processamento Mineral",
  "Peças e Componentes Industriais",
  "Desgaste e Revestimento",
  "Automação, Elétrica e Controle",
  "Lubrificação e Produtos Químicos",
  "Equipamentos Auxiliares e Ferramentas",
  "EPIs (Equipamentos de Proteção Individual)",
  "Instrumentos de Medição e Controle",
  "Manutenção e Serviços Industriais",
  "Veículos e Pneus",
  "Outros",
];
const categoriasBanco = new Set<string>();
list.forEach((d) => {
  const cat = (d.categoria || "").trim();
  if (cat) categoriasBanco.add(cat);
});

// 2) mesclar com as oficiais (removendo duplicadas)
const categoriasMescladas = Array.from(
  new Set([...CATEGORIAS_DEMANDAS, ...categoriasBanco])
);

// 3) ordenar alfabeticamente (pt-BR)
categoriasMescladas.sort((a, b) => a.localeCompare(b, "pt-BR"));

// 4) atualizar o estado usado pelo <select>
setCategoriasDisponiveis(categoriasMescladas);
  // carregar mais
  async function carregarMais() {
    if (finishedRef.current || !lastDocRef.current) return;
    setCarregandoMais(true);

    const qRef = query(
      collection(db, "demandas"),
      orderBy("createdAt", "desc"),
      startAfter(lastDocRef.current),
      limit(pageSize)
    );
    const snap = await getDocs(qRef);

    const list: any[] = [];
    let last: QueryDocumentSnapshot<DocumentData> | null = null;
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() });
      last = doc;
    });

    if (!last || snap.empty) finishedRef.current = true;
    lastDocRef.current = last;

    // atualizar estados disponíveis
    const estSet = new Set(estadosDisponiveis);
    list.forEach((x) => x.estado && estSet.add(x.estado));
    setEstadosDisponiveis(Array.from(estSet).sort());

    setDemandas((prev) => [...prev, ...list]);
    setCarregandoMais(false);
  }

  // cidades dependentes
  useEffect(() => {
    if (!estado) {
      setCidadesDisponiveis([]);
      setCidade("");
      return;
    }
    const cidSet = new Set<string>();
    demandas.forEach((x) => {
      if (x.estado === estado && x.cidade) cidSet.add(x.cidade);
    });
    const cidades = Array.from(cidSet).sort((a, b) => a.localeCompare(b, "pt-BR"));
    setCidadesDisponiveis(cidades);
    if (cidade && !cidades.includes(cidade)) setCidade("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, demandas]);

  // filtros + ordenação
  const demandasProcessadas = useMemo(() => {
    let arr = demandas.filter((d) => {
      if (categoria && d.categoria !== categoria) return false;
      if (estado && d.estado !== estado) return false;
      if (cidade && d.cidade !== cidade) return false;

      if (busca) {
        const alvo =
          (d.titulo || "") +
          " " +
          (d.descricao || "") +
          " " +
          (d.categoria || "");
        if (!alvo.toLowerCase().includes(busca)) return false;
      }

      if (somenteAbertas && isFechada(d)) return false;

      return true;
    });

    // ordenação
    if (sortKey === "recentes") {
      arr.sort((a, b) => {
        const da = toDate(a.createdAt)?.getTime() ?? 0;
        const db = toDate(b.createdAt)?.getTime() ?? 0;
        return db - da;
      });
    } else if (sortKey === "views_desc") {
      arr.sort((a, b) => (b.visualizacoes ?? 0) - (a.visualizacoes ?? 0));
    } else if (sortKey === "interessados_desc") {
      arr.sort((a, b) => (b.qtdInteressados ?? 0) - (a.qtdInteressados ?? 0));
    }

    // se o toggle “somente abertas” estiver OFF, mantemos fechadas no fim
    if (!somenteAbertas) {
      const abertas = arr.filter((x) => !isFechada(x));
      const fechadas = arr.filter((x) => isFechada(x));
      arr = [...abertas, ...fechadas];
    }

    return arr;
  }, [demandas, categoria, estado, cidade, busca, sortKey, somenteAbertas]);

  // pode carregar mais?
  const podeCarregarMais = useMemo(() => !finishedRef.current, [demandas]);

  return (
    <section style={{ maxWidth: 1420, margin: "0 auto", padding: "40px 2vw 80px 2vw" }}>
      <h1
        style={{
          fontSize: "2.35rem",
          fontWeight: 900,
          color: "#023047",
          letterSpacing: "-1px",
          marginBottom: 24,
        }}
      >
        Vitrine de Oportunidades
      </h1>

      {/* Ação rápida */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <Link
          href="/create-demanda"
          className="hover:scale-[1.04] transition"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "13px 30px",
            borderRadius: 17,
            background: "#FB8500",
            color: "#fff",
            fontWeight: 800,
            fontSize: "1.13rem",
            boxShadow: "0 4px 16px #fb850013",
            textDecoration: "none",
            border: "none",
            outline: "none",
          }}
        >
          <Plus size={22} /> Postar uma Necessidade
        </Link>
      </div>

      {/* Filtros */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          background: "#fff",
          padding: 17,
          borderRadius: 15,
          boxShadow: "0 2px 10px #0001",
          marginBottom: 16,
        }}
      >
        <input
          aria-label="Buscar"
          className="filtro"
          placeholder="Buscar por palavra‑chave"
          value={buscaRaw}
          onChange={(e) => setBuscaRaw(e.target.value)}
          style={{ minWidth: 220 }}
        />

        <select
  aria-label="Categoria"
  className="filtro"
  value={categoria}
  onChange={(e) => setCategoria(e.target.value)}
>
  <option value="">Categoria</option>
  {CATEGORIAS_DEMANDAS.map((cat) => (
    <option key={cat} value={cat}>
      {cat}
    </option>
  ))}
</select>


        <select
          aria-label="Estado"
          className="filtro"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
        >
          <option value="">Estado</option>
          {estadosDisponiveis.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>

        <select
          aria-label="Cidade"
          className="filtro"
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          disabled={!estado}
          style={{ opacity: estado ? 1 : 0.6, cursor: estado ? "pointer" : "not-allowed" }}
        >
          <option value="">{estado ? "Cidade" : "Selecione um estado"}</option>
          {cidadesDisponiveis.map((cid) => (
            <option key={cid} value={cid}>
              {cid}
            </option>
          ))}
        </select>

        <select
          aria-label="Ordenação"
          className="filtro"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
        >
          <option value="recentes">Ordenar: Recentes</option>
          <option value="views_desc">Ordenar: Mais vistos</option>
          <option value="interessados_desc">Ordenar: Mais interessados</option>
        </select>

        <button
          type="button"
          aria-pressed={somenteAbertas}
          onClick={() => setSomenteAbertas((v) => !v)}
          className="filtro"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 600,
            background: somenteAbertas ? "#ecfeff" : "#f7f7fa",
            color: somenteAbertas ? "#0ea5e9" : "#6b7280",
          }}
          title="Mostrar apenas demandas abertas"
        >
          <Filter size={16} />
          {somenteAbertas ? "Somente abertas" : "Abertas e fechadas"}
        </button>

        <button
          className="filtro"
          type="button"
          style={{ background: "#f7f7fa", fontWeight: 600, color: "#fb8500" }}
          onClick={() => {
            setCategoria("");
            setEstado("");
            setCidade("");
            setBuscaRaw("");
            setSomenteAbertas(true);
            setSortKey("recentes");
          }}
        >
          Limpar filtros
        </button>
      </div>

      {/* Skeleton / Empty / Grid */}
      {carregandoLista ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "34px" }}>
          {[...Array(8)].map((_, idx) => (
            <div
              key={idx}
              className="animate-pulse"
              style={{
                borderRadius: 22,
                boxShadow: "0 4px 28px #0001",
                background: "#f3f6fa",
                minHeight: 280,
              }}
            />
          ))}
        </div>
      ) : demandasProcessadas.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            color: "#adb0b6",
            fontWeight: 700,
            fontSize: 19,
            padding: 66,
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 4px 18px #0001",
            marginTop: 6,
          }}
        >
          Nenhuma demanda encontrada.
          <br />
          <span style={{ fontWeight: 400, fontSize: 16 }}>Tente alterar os filtros ou pesquisar outro termo.</span>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "34px" }}>
            {demandasProcessadas.map((item) => {
              const fechada = isFechada(item);

              return (
                <div
                  key={item.id}
                  style={{
                    borderRadius: 22,
                    boxShadow: "0 4px 32px #0001",
                    background: "#fff",
                    border: "1.6px solid #f2f3f7",
                    padding: "0 0 18px 0",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 280,
                    position: "relative",
                    overflow: "hidden",
                    opacity: fechada ? 0.92 : 1,
                  }}
                  className="hover:shadow-xl group"
                >
                  {/* Badge FECHADA */}
                  {fechada && (
                    <span
                      style={{
                        position: "absolute",
                        top: 14,
                        left: 14,
                        background: "#9ca3af",
                        color: "#fff",
                        fontWeight: 900,
                        fontSize: 12.5,
                        padding: "3px 12px",
                        borderRadius: 10,
                        zIndex: 2,
                        letterSpacing: ".03em",
                      }}
                    >
                      FECHADA
                    </span>
                  )}

                  <div
                    style={{
                      padding: "18px 22px 10px 22px",
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 8 }}>
                      <div
                        style={{
                          width: 53,
                          height: 53,
                          borderRadius: 14,
                          background: "#FFEDD5",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ClipboardList size={27} style={{ color: "#FB8500" }} />
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: "1.17rem",
                            color: "#023047",
                            marginBottom: 4,
                            lineHeight: 1.2,
                          }}
                        >
                          {item.titulo || "Sem título"}
                        </div>
                        {item.categoria && (
                          <span
                            style={{
                              background: "#FFEDD5",
                              color: "#E17000",
                              fontWeight: 700,
                              fontSize: 12.5,
                              padding: "2px 9px",
                              borderRadius: 7,
                            }}
                          >
                            {item.categoria}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.descricao && (
                      <div style={{ margin: "7px 0", color: "#444", fontWeight: 500 }}>
                        {resumo(item.descricao, 140)}
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 13,
                        color: "#8c9199",
                        fontSize: 15,
                        margin: "10px 0 4px 0",
                        fontWeight: 600,
                      }}
                    >
                      <MapPin size={17} /> {item.cidade || "-"}, {item.estado || "-"}
                      <Calendar size={16} />
                      {fmtData(item.createdAt)}
                      <Eye size={17} />
                      {item.visualizacoes ?? 0}
                      <Users size={17} />
                      {item.qtdInteressados ?? 0}
                    </div>

                    {/* Botão */}
                    {fechada ? (
                      <button
                        type="button"
                        disabled
                        style={{
                          background: "#d1d5db",
                          color: "#fff",
                          padding: "13px 0",
                          borderRadius: 12,
                          fontWeight: 800,
                          fontSize: "1.12rem",
                          border: "none",
                          outline: "none",
                          letterSpacing: ".01em",
                          marginTop: 14,
                          cursor: "not-allowed",
                        }}
                      >
                        Fechada
                      </button>
                    ) : (
                      <Link
                        href={`/demandas/${item.id}`}
                        className="group-hover:scale-[1.02] transition"
                        style={{
                          background: "#219EBC",
                          color: "#fff",
                          padding: "13px 0",
                          borderRadius: 12,
                          fontWeight: 800,
                          fontSize: "1.12rem",
                          boxShadow: "0 2px 10px #219EBC22",
                          textDecoration: "none",
                          border: "none",
                          outline: "none",
                          letterSpacing: ".01em",
                          marginTop: 14,
                          display: "block",
                          textAlign: "center",
                        }}
                      >
                        Atender Demanda
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Carregar mais */}
          {podeCarregarMais && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
              <button
                onClick={carregarMais}
                disabled={carregandoMais}
                className="group"
                style={{
                  padding: "12px 26px",
                  borderRadius: 14,
                  background: "#f3f6fa",
                  border: "1px solid #e5e7eb",
                  fontWeight: 800,
                  color: "#023047",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {carregandoMais ? "Carregando..." : "Carregar mais"}
                {carregandoMais ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .filtro {
          border: 1.4px solid #e5e7eb;
          border-radius: 9px;
          padding: 9px 13px;
          font-size: 15px;
          color: #444;
        }
      `}</style>
    </section>
  );
}
