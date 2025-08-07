"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import Link from "next/link";
import { Plus, Zap, Hammer } from "lucide-react";

// ========= Utilidades =========
function isNovo(createdAt?: any) {
  if (!createdAt?.seconds) return false;
  const dias = (Date.now() / 1000 - createdAt.seconds) / 86400;
  return dias <= 7;
}
function resumo(str: string = "", len = 90) {
  if (!str) return "";
  return str.length <= len ? str : str.slice(0, len - 3) + "...";
}
function getDateFromTs(ts?: any): Date | null {
  if (!ts) return null;
  // Firestore Timestamp
  if (typeof ts?.toDate === "function") return ts.toDate();
  // seconds/nanoseconds
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  // Date ou string
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}
function isExpired(item: any): boolean {
  const now = new Date().getTime();
  // 1) Se tiver expiraEm, usa
  const expiraEm = getDateFromTs(item.expiraEm);
  if (expiraEm) return now > expiraEm.getTime();

  // 2) Senão, calcula por createdAt + 45 dias
  const created = getDateFromTs(item.createdAt);
  if (!created) return false;
  const plus45 = new Date(created);
  plus45.setDate(plus45.getDate() + 45);
  return now > plus45.getTime();
}

// ========= Categorias (do PDF) =========
const categoriasPDF = [
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

// ========= Cores do badge por tipo =========
const badgeTipoCor: Record<string, string> = {
  machines: "#3b82f6", // Máquinas
  produtos: "#fb8500", // Produtos
  services: "#219ebc", // Serviços
  default: "#64748b",
};

export default function VitrineCompleta() {
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros
  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [precoMin, setPrecoMin] = useState("");
  const [precoMax, setPrecoMax] = useState("");
  const [busca, setBusca] = useState("");

  // Selects dinâmicos
  const [estadosDisponiveis, setEstadosDisponiveis] = useState<string[]>([]);
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState<string[]>([]);

  // Buscar dados
  useEffect(() => {
    async function fetchData() {
      setCarregando(true);
      const all: any[] = [];
      const cols = ["machines", "produtos", "services"];

      for (const colName of cols) {
        const snap = await getDocs(collection(db, colName));
        snap.forEach((doc) => {
          const data = doc.data();
          all.push({ id: doc.id, ...data, tipo: colName });
        });
      }

      setItens(all);

      // Estados únicos (de todos os itens)
      const estSet = new Set<string>();
      all.forEach((x) => x.estado && estSet.add(x.estado));
      setEstadosDisponiveis(Array.from(estSet).sort());

      setCarregando(false);
    }
    fetchData();
  }, []);

  // Cidades dependentes do estado escolhido
  useEffect(() => {
    if (!estado) {
      setCidadesDisponiveis([]);
      setCidade("");
      return;
    }
    const cidSet = new Set<string>();
    itens.forEach((x) => {
      if (x.estado === estado && x.cidade) cidSet.add(x.cidade);
    });
    const cidades = Array.from(cidSet).sort((a, b) => a.localeCompare(b, "pt-BR"));
    setCidadesDisponiveis(cidades);
    // Se cidade atual não pertence mais ao estado selecionado, limpa
    if (cidade && !cidades.includes(cidade)) setCidade("");
  }, [estado, itens]); // eslint-disable-line

  // Filtrar itens por filtros selecionados
  const itensFiltrados = useMemo(() => {
    const texto = busca.trim().toLowerCase();

    return itens.filter((p) => {
      // Tipo
      if (tipo && p.tipo !== tipo) return false;

      // Categoria (usa apenas a do PDF no filtro; item.categoria deve bater com o texto)
      if (categoria && p.categoria !== categoria) return false;

      // Estado e cidade
      if (estado && p.estado !== estado) return false;
      if (cidade && p.cidade !== cidade) return false;

      // Preço
      if (precoMin && !(p.preco && Number(p.preco) >= Number(precoMin))) return false;
      if (precoMax && !(p.preco && Number(p.preco) <= Number(precoMax))) return false;

      // Busca textual (nome/título/categoria/descrição)
      if (texto) {
        const alvo =
          (p.nome || "") +
          " " +
          (p.titulo || "") +
          " " +
          (p.categoria || "") +
          " " +
          (p.descricao || "");
        if (!alvo.toLowerCase().includes(texto)) return false;
      }

      return true;
    });
  }, [itens, tipo, categoria, estado, cidade, precoMin, precoMax, busca]);

  // Ordenar: ativos primeiro, expirados por último (mantém ordem natural dentro de cada grupo)
  const ativos = itensFiltrados.filter((x) => !isExpired(x));
  const expirados = itensFiltrados.filter((x) => isExpired(x));
  const itensOrdenados = [...ativos, ...expirados];

  return (
    <section style={{ maxWidth: 1420, margin: "0 auto", padding: "40px 2vw 60px 2vw" }}>
      <h1
        style={{
          fontSize: "2.35rem",
          fontWeight: 900,
          color: "#023047",
          letterSpacing: "-1px",
          marginBottom: 24,
        }}
      >
        Vitrine de Produtos, Máquinas e Serviços
      </h1>

      {/* Ações rápidas */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
        <Link
          href="/create-produto"
          className="hover:scale-[1.04] transition"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 34px",
            borderRadius: 17,
            background: "#fb8500", // LARANJA (produto/máquina)
            color: "#fff",
            fontWeight: 800,
            fontSize: "1.13rem",
            boxShadow: "0 4px 16px #fb850013",
            textDecoration: "none",
            border: "none",
            outline: "none",
          }}
        >
          <Plus size={21} /> Novo Produto
        </Link>
        <Link
          href="/create-service"
          className="hover:scale-[1.04] transition"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 34px",
            borderRadius: 17,
            background: "#219ebc", // AZUL (serviço)
            color: "#fff",
            fontWeight: 800,
            fontSize: "1.13rem",
            boxShadow: "0 4px 16px #219ebc13",
            textDecoration: "none",
            border: "none",
            outline: "none",
          }}
        >
          <Plus size={21} /> Novo Serviço
        </Link>
      </div>

      {/* FILTROS */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          background: "#fff",
          padding: 17,
          borderRadius: 15,
          boxShadow: "0 2px 10px #0001",
          marginBottom: 28,
        }}
      >
        <select className="filtro" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos</option>
          <option value="machines">Máquinas</option>
          <option value="produtos">Produtos</option>
          <option value="services">Serviços</option>
        </select>

        <input
          className="filtro"
          placeholder="Busca por nome/categoria"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ minWidth: 155 }}
        />

        <select className="filtro" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Categoria</option>
          {categoriasPDF.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select className="filtro" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Estado</option>
          {estadosDisponiveis.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>

        <select
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

        <input
          className="filtro"
          type="number"
          placeholder="Preço mín."
          value={precoMin}
          onChange={(e) => setPrecoMin(e.target.value)}
        />
        <input
          className="filtro"
          type="number"
          placeholder="Preço máx."
          value={precoMax}
          onChange={(e) => setPrecoMax(e.target.value)}
        />

        <button
          className="filtro"
          type="button"
          style={{ background: "#f7f7fa", fontWeight: 600, color: "#fb8500" }}
          onClick={() => {
            setTipo("");
            setCategoria("");
            setEstado("");
            setCidade("");
            setPrecoMin("");
            setPrecoMax("");
            setBusca("");
          }}
        >
          Limpar filtros
        </button>
      </div>

      {/* SKELETON / EMPTY / GRID */}
      {carregando ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "34px" }}>
          {[...Array(8)].map((_, idx) => (
            <div
              key={idx}
              className="animate-pulse"
              style={{
                borderRadius: 22,
                boxShadow: "0 4px 28px #0001",
                background: "#f3f6fa",
                minHeight: 320,
              }}
            />
          ))}
        </div>
      ) : itensOrdenados.length === 0 ? (
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
          }}
        >
          <Zap size={32} style={{ color: "#219ebc", marginBottom: -5, marginRight: 8 }} />
          Nenhum item encontrado.
          <br />
          <span style={{ fontWeight: 400, fontSize: 16 }}>Tente alterar os filtros ou pesquisar outro termo.</span>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "34px" }}>
          {itensOrdenados.map((item) => {
            const expirado = isExpired(item);
            const tipoLabel = item.tipo === "machines" ? "Máquina" : item.tipo === "produtos" ? "Produto" : "Serviço";
            const corBadge = badgeTipoCor[item.tipo] || badgeTipoCor.default;

            // preço (só exibe se > 0; se serviço e vazio => "Sob consulta")
            const temPreco = item.preco && Number(item.preco) > 0;
            const textoPreco =
              temPreco ? `R$ ${Number(item.preco).toLocaleString("pt-BR")}` : item.tipo === "services" ? "Sob consulta" : "";

            // Botão por tipo/expiração
            const isServico = item.tipo === "services";
            const botaoBg = expirado ? "#d1d5db" : isServico ? "#219ebc" : "#fb8500";
            const botaoLabel = expirado ? "Expirado" : "Ver Detalhes";
            const botaoHref = expirado ? undefined : `/${item.tipo}/${item.id}`;

            return (
              <div
                key={item.id}
                style={{
                  borderRadius: 22,
                  boxShadow: "0 4px 32px #0001",
                  background: "#fff",
                  border: "1.5px solid #f1f1f5",
                  padding: "0 0 18px 0",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 330,
                  position: "relative",
                  overflow: "hidden",
                  transition: "box-shadow .15s",
                  opacity: expirado ? 0.85 : 1,
                }}
                className="hover:shadow-xl group"
              >
                {/* BADGE NOVO / EXPIRADO */}
                {isNovo(item.createdAt) && !expirado && (
                  <span
                    style={{
                      position: "absolute",
                      top: 14,
                      left: 14,
                      background: "#10b981",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: 13,
                      padding: "2.5px 16px",
                      borderRadius: 11,
                      zIndex: 2,
                      letterSpacing: ".03em",
                    }}
                  >
                    NOVO
                  </span>
                )}
                {expirado && (
                  <span
                    style={{
                      position: "absolute",
                      top: 14,
                      left: 14,
                      background: "#9ca3af",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: 13,
                      padding: "2.5px 16px",
                      borderRadius: 11,
                      zIndex: 2,
                      letterSpacing: ".03em",
                    }}
                  >
                    EXPIRADO
                  </span>
                )}

                {/* MÍDIA */}
                <div
                  style={{
                    width: "100%",
                    height: 180,
                    background: "#f3f6fa",
                    borderTopLeftRadius: 22,
                    borderTopRightRadius: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {item.tipo === "services" ? (
                    <Hammer size={68} style={{ color: "#fb8500", opacity: 0.19 }} />
                  ) : (
                    <img
                      src={item.imagens?.[0] || "/images/no-image.png"}
                      alt={item.nome || item.titulo}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => (e.currentTarget.src = "/images/no-image.png")}
                    />
                  )}
                </div>

                {/* INFOS */}
                <div style={{ padding: "20px 24px 8px 24px", flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div
                      style={{
                        background: corBadge,
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: 13,
                        padding: "2.5px 12px",
                        borderRadius: 9,
                        marginRight: 4,
                      }}
                    >
                      {tipoLabel}
                    </div>
                    <div style={{ color: "#219ebc", fontWeight: 700, fontSize: 15 }}>{item.categoria}</div>
                  </div>

                  <div style={{ fontSize: "1.12rem", fontWeight: 800, color: "#023047", marginBottom: 2, marginTop: 4 }}>
                    {item.nome || item.titulo}
                  </div>

                  <div style={{ color: "#64748b", fontWeight: 500, fontSize: 15 }}>{resumo(item.descricao)}</div>

                  {textoPreco ? (
                    <div style={{ color: "#FB8500", fontWeight: 800, fontSize: 19, marginTop: 2 }}>{textoPreco}</div>
                  ) : null}

                  <div style={{ color: "#8c9199", fontWeight: 600, fontSize: 15, marginTop: 2 }}>
                    {item.cidade || "-"}, {item.estado || "-"}
                  </div>

                  {/* BOTÃO */}
                  {botaoHref ? (
                    <Link
                      href={botaoHref}
                      style={{
                        marginTop: 13,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "12px 0",
                        borderRadius: 13,
                        background: botaoBg,
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: "1.12rem",
                        boxShadow: "0 4px 14px #00000015",
                        textDecoration: "none",
                        border: "none",
                        outline: "none",
                        justifyContent: "center",
                        letterSpacing: ".01em",
                      }}
                      className="group-hover:scale-[1.03] transition"
                    >
                      Ver Detalhes
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      style={{
                        marginTop: 13,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "12px 0",
                        borderRadius: 13,
                        background: botaoBg, // cinza para expirado
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: "1.12rem",
                        textDecoration: "none",
                        border: "none",
                        outline: "none",
                        justifyContent: "center",
                        letterSpacing: ".01em",
                        cursor: "not-allowed",
                        opacity: 0.95,
                      }}
                    >
                      {botaoLabel}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
