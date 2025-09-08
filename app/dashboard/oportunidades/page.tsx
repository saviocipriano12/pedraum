"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  limit as fbLimit,
} from "firebase/firestore";
import {
  Loader2,
  Target,
  MapPin,
  BadgeDollarSign,
  CheckCircle2,
  Filter,
  Eye,
  LockOpen,
} from "lucide-react";

/* ----------------------------- Tipos ----------------------------- */

type Pricing = {
  amount?: number; // centavos
  currency?: string;
  exclusive?: boolean;
  cap?: number;
};
type Assignment = {
  id: string;
  demandId: string;
  supplierId: string;
  status: "sent" | "viewed" | "unlocked";
  pricing?: Pricing;
  createdAt?: any;
  demand?: any;
};

/* ------------------------ Utils ------------------------ */

function normalizeDemand(raw: any) {
  const title = raw?.title ?? raw?.titulo ?? "Demanda";
  const description = raw?.description ?? raw?.descricao ?? "";
  const PEDRAUM_WPP_NUMBER = "5531990903613"; // +55 31 99090-3613
  const category = raw?.category ?? raw?.categoria ?? "";
  const uf = raw?.uf ?? raw?.estado ?? "";
  const city = raw?.city ?? raw?.cidade ?? "";
  const contact =
    raw?.contact ?? (raw?.whatsapp ? { whatsapp: raw.whatsapp } : undefined);

  return { title, description, category, uf, city, contact };
}
const PEDRAUM_WPP_NUMBER = "5531990903613"; // +55 31 99090-3613

function waLinkToPedraum(text: string) {
  return `https://wa.me/${PEDRAUM_WPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function centsToReaisText(cents?: number) {
  const v = typeof cents === "number" ? cents : 1990;
  return (v / 100).toFixed(2).replace(".", ",");
}

function sortByCreatedAtDesc(a: Assignment, b: Assignment) {
  const ta = a.createdAt?.seconds ?? a.createdAt?._seconds ?? 0;
  const tb = b.createdAt?.seconds ?? b.createdAt?._seconds ?? 0;
  return tb - ta;
}

/* ----------------------------- Página ----------------------------- */

export default function OportunidadesPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);

  // filtros locais
  const [busca, setBusca] = useState("");
  const [fCategoria, setFCategoria] = useState("");
  const [fUF, setFUF] = useState("");
  const [fCidade, setFCidade] = useState("");
  const [abrindo, setAbrindo] = useState<string | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUid(u ? u.uid : null));
    return () => unsub();
  }, []);

  // stream: assignments do supplier; depois particiona por status no cliente
  useEffect(() => {
    if (!uid) return;

    const qAssignments = query(
      collection(db, "demandAssignments"),
      where("supplierId", "==", uid),
      where("status", "in", ["sent", "viewed", "unlocked"]), // NÃO inclui "canceled"
      fbLimit(300)
    );

    const unsub = onSnapshot(
      qAssignments,
      async (snap) => {
        try {
          const arr: Assignment[] = [];
          for (const d of snap.docs) {
            const a = { id: d.id, ...(d.data() as any) } as Assignment;
            // join da demanda
            try {
              const ds = await getDoc(doc(db, "demandas", a.demandId));
              arr.push({ ...a, demand: ds.exists() ? ds.data() : null });
            } catch {
              arr.push(a);
            }
          }
          setAllAssignments(arr);
          setErrMsg(null);
        } catch (e: any) {
          console.error(e);
          setErrMsg("Falha ao carregar oportunidades.");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("assignments stream error:", err);
        setErrMsg(
          "Não foi possível carregar as oportunidades. Verifique as regras/índices do Firestore."
        );
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  // Particiona por status e ordena
  const novas = useMemo(
    () =>
      allAssignments
        .filter((a) => a.status === "sent" || a.status === "viewed")
        .sort(sortByCreatedAtDesc),
    [allAssignments]
  );
  const atendimento = useMemo(
    () =>
      allAssignments
        .filter((a) => a.status === "unlocked")
        .sort(sortByCreatedAtDesc),
    [allAssignments]
  );

  /* --------------------------- Filtros --------------------------- */
  const novasFiltradas = useMemo(
    () => filtra(novas, busca, fCategoria, fUF, fCidade),
    [novas, busca, fCategoria, fUF, fCidade]
  );
  const atendimentoFiltradas = useMemo(
    () => filtra(atendimento, busca, fCategoria, fUF, fCidade),
    [atendimento, busca, fCategoria, fUF, fCidade]
  );

  /* --------------------------- Ações --------------------------- */
  // Usa sua rota atual (/api/mp/create-preference) que espera unit_price (em reais).
  async function atender(a: Assignment) {
  if (!uid) return;
  setAbrindo(a.demandId);

  try {
    const n = normalizeDemand(a.demand || {});
    const msg =
      `Olá! Quero atender esta demanda no Pedraum.\n` +
      `• Título: "${n.title || "Demanda"}"\n` +
      `• Demanda ID: ${a.demandId}\n` +
      `• Assignment ID: ${a.id}\n` +
      (typeof a?.pricing?.amount === "number"
        ? `• Preço exibido: R$ ${(a.pricing.amount / 100).toFixed(2)}\n`
        : "");

    // abre o WhatsApp do Pedraum em nova aba
    window.open(waLinkToPedraum(msg), "_blank");
  } catch (e) {
    alert("Não foi possível abrir o WhatsApp. Tente novamente.");
  } finally {
    setAbrindo(null);
  }
}


  /* ---------------------------- UI ---------------------------- */

  return (
    <main style={{ minHeight: "100vh", background: "#f6f9fa", padding: "28px 10px" }}>
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 10px 34px #00000010",
          padding: "22px 22px 28px 22px",
        }}
      >
        <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Target size={24} color="#2563eb" />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#023047" }}>Oportunidades</h1>
        </header>

        {/* Filtros */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr 120px 1fr",
            gap: 10,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Filter size={18} />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título/descrição..."
              style={inputStyle}
            />
          </div>
          <select value={fCategoria} onChange={(e) => setFCategoria(e.target.value)} style={inputStyle}>
            <option value="">Categoria</option>
            {unique(novas.concat(atendimento).map((a) => normalizeDemand(a.demand).category))
              .filter(Boolean)
              .map((c) => (
                <option key={c} value={c as string}>
                  {c as string}
                </option>
              ))}
          </select>
          <select value={fUF} onChange={(e) => setFUF(e.target.value)} style={inputStyle}>
            <option value="">UF</option>
            {unique(novas.concat(atendimento).map((a) => normalizeDemand(a.demand).uf))
              .filter(Boolean)
              .map((u) => (
                <option key={u} value={u as string}>
                  {u as string}
                </option>
              ))}
          </select>
          <select value={fCidade} onChange={(e) => setFCidade(e.target.value)} style={inputStyle}>
            <option value="">Cidade</option>
            {unique(novas.concat(atendimento).map((a) => normalizeDemand(a.demand).city))
              .filter(Boolean)
              .map((c) => (
                <option key={c} value={c as string}>
                  {c as string}
                </option>
              ))}
          </select>
        </div>

        {errMsg && (
          <div
            style={{
              background: "#fff7f7",
              border: "1px solid #fecaca",
              color: "#991b1b",
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {errMsg}
          </div>
        )}

        {/* Novas */}
        <SectionTitle icon={<Eye size={18} />} title="Novas oportunidades" hint="Envios recentes para você" />
        {loading ? (
          <LoadingRow />
        ) : novasFiltradas.length === 0 ? (
          <EmptyState text="Nenhuma oportunidade nova no momento." />
        ) : (
          <CardsGrid>
            {novasFiltradas.map((it) => (
              <OportunidadeCard
                key={it.id}
                a={it}
                onAtender={() => atender(it)} // envia o item inteiro (tem id, demandId e pricing)
                atendendo={abrindo === it.demandId}
              />
            ))}
          </CardsGrid>
        )}

        {/* Em atendimento */}
        <SectionTitle icon={<LockOpen size={18} />} title="Em atendimento" hint="Contatos já liberados" />
        {loading ? (
          <LoadingRow />
        ) : atendimentoFiltradas.length === 0 ? (
          <EmptyState text="Você ainda não desbloqueou nenhuma oportunidade." />
        ) : (
          <CardsGrid>
            {atendimentoFiltradas.map((it) => (
              <OportunidadeCard key={it.id} a={it} unlocked />
            ))}
          </CardsGrid>
        )}
      </section>
    </main>
  );
}

/* -------------------------- Helpers/UI -------------------------- */

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function filtra(list: Assignment[], busca: string, cat: string, uf: string, cidade: string) {
  return list.filter((it) => {
    const n = normalizeDemand(it.demand || {});
    const sBusca = (busca || "").toLowerCase().trim();
    const hitBusca =
      !sBusca ||
      n.title.toLowerCase().includes(sBusca) ||
      n.description.toLowerCase().includes(sBusca);
    const hitCat = !cat || n.category === cat;
    const hitUF = !uf || n.uf === uf;
    const hitCidade = !cidade || n.city === cidade;
    return hitBusca && hitCat && hitUF && hitCidade;
  });
}

function PriceBadge({ a }: { a: Assignment }) {
  const reais = centsToReaisText(a?.pricing?.amount);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "#fff7ed",
        color: "#9a3412",
        border: "1px solid #fed7aa",
        padding: "6px 10px",
        borderRadius: 999,
        fontWeight: 800,
        fontSize: 13,
      }}
    >
      <BadgeDollarSign size={16} />
      R$ {reais}
    </div>
  );
}

function OportunidadeCard({
  a,
  unlocked,
  onAtender,
  atendendo,
}: {
  a: Assignment;
  unlocked?: boolean;
  onAtender?: () => void;
  atendendo?: boolean;
}) {
  const norm = normalizeDemand(a.demand || {});
  const preview = (norm.description || "").slice(0, 160);

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 16,
        background: "#fff",
        boxShadow: "0 6px 18px #0000000b",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>{norm.title}</div>
        {!unlocked ? (
          <PriceBadge a={a} />
        ) : (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#ecfdf5",
              color: "#065f46",
              border: "1px solid #a7f3d0",
              padding: "6px 10px",
              borderRadius: 999,
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            <CheckCircle2 size={16} /> Em atendimento
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569", fontSize: 13 }}>
        <MapPin size={16} />
        <span>
          {norm.city || "—"}/{norm.uf || "—"}
        </span>
        <span style={{ opacity: 0.45 }}>•</span>
        <span>{norm.category || "Sem categoria"}</span>
      </div>

      <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.4 }}>
        {preview}
        {(norm.description || "").length > 160 ? "..." : ""}
      </p>

      {/* Ações */}
      <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
        <Link href={`/dashboard/oportunidades/${a.demandId}`} style={btnGhost}>
          Ver detalhes
        </Link>

        {!unlocked ? (
          <button
            onClick={onAtender}
            disabled={!!atendendo}
            style={{
              ...btnPrimary,
              opacity: atendendo ? 0.8 : 1,
              cursor: atendendo ? "not-allowed" : "pointer",
            }}
          >
           {atendendo ? <Loader2 size={16} className="animate-spin" /> : "Falar no WhatsApp"}

          </button>
        ) : norm?.contact?.whatsapp ? (
          <a
            target="_blank"
            href={`https://wa.me/${String(norm.contact.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(
              `Olá! Vi sua demanda "${norm.title}" no Pedraum e posso te atender.`
            )}`}
            style={btnWhats}
          >
            Abrir WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "12px 2px 10px 2px" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#0f172a" }}>
        {icon}
        <h2 style={{ fontSize: 16, fontWeight: 900 }}>{title}</h2>
      </div>
      {hint && <span style={{ fontSize: 12, color: "#64748b" }}>{hint}</span>}
    </div>
  );
}

function CardsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 14,
        marginBottom: 20,
      }}
    >
      {children}
    </div>
  );
}

function LoadingRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: "#64748b",
        border: "1px dashed #e5e7eb",
        padding: "12px 14px",
        borderRadius: 12,
        marginBottom: 18,
      }}
    >
      <Loader2 size={18} className="animate-spin" />
      Carregando oportunidades...
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px dashed #e2e8f0",
        borderRadius: 12,
        padding: "18px 14px",
        color: "#475569",
        marginBottom: 18,
      }}
    >
      {text}
    </div>
  );
}

/* ------------------------------- Estilos ------------------------------- */

const btnPrimary: React.CSSProperties = {
  background: "#2563eb",
  color: "#fff",
  border: "1px solid #2563eb",
  padding: "9px 12px",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 800,
  boxShadow: "0 2px 10px #2563eb22",
};

const btnGhost: React.CSSProperties = {
  background: "#fff",
  color: "#0f172a",
  border: "1px solid #e5e7eb",
  padding: "9px 12px",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 800,
};

const btnWhats: React.CSSProperties = {
  background: "#16a34a",
  color: "#fff",
  border: "1px solid #16a34a",
  padding: "9px 12px",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 800,
  boxShadow: "0 2px 10px #16a34a22",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  borderRadius: 12,
  padding: "9px 12px",
  fontSize: 14,
  outline: "none",
  boxShadow: "0 2px 10px #00000007",
};
