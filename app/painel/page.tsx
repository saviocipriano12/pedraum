// app/painel/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth, db } from "@/firebaseConfig";
import {
  collection,
  query,
  where,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  limit,
  doc,
  type Query,
  type QueryConstraint,
} from "firebase/firestore";
import {
  Layers,
  ClipboardList,
  MessageCircle,
  Bell,
  Star,
  Users,
  BookOpen,
  Briefcase,
  Heart,
  Lightbulb,
  Wallet2,
  LifeBuoy,
  LogOut,
  Inbox,
  Target,
  CircleHelp,
  X,
} from "lucide-react";

/* =========================================================
   Constantes (aliases de campos)
========================================================= */

// notificações e mensagens podem ter vários nomes de campos de dono/destinatário
const USER_EQ_FIELDS_NOTIFS = ["usuarioId", "userId", "uid", "recipientId", "ownerId"];
const USER_EQ_FIELDS_MSGS = ["destinatarioId", "toUserId", "usuarioId", "userId", "recipientId", "ownerId"];
const USER_ARRAY_FIELDS = ["users", "participants", "members", "recipients", "threadUsers"];
const READ_FLAGS = ["lida", "lido", "read", "seen", "visualizado", "visto"];

/* =========================================================
   Helpers de consulta/contagem (sem hooks)
========================================================= */

// monta um query usando o primeiro campo que existir
function qByAnyUserField(
  colName: string,
  uid: string,
  eqFields: string[],
  extra?: (base: Query) => Query
): Query {
  const colRef = collection(db, colName);
  for (const f of eqFields) {
    try {
      const base = query(colRef, where(f as any, "==", uid));
      return extra ? extra(base) : base;
    } catch {
      // tenta próximo alias
    }
  }
  // fallback (para scan): coleção inteira
  return extra ? extra(colRef as unknown as Query) : (colRef as unknown as Query);
}

// contagem segura: tenta aggregate; se a regra bloquear, cai para getDocs().size
async function safeCount(qry: Query): Promise<number> {
  try {
    const c = await getCountFromServer(qry as any);
    return c.data().count || 0;
  } catch (e: any) {
    const msg = String(e?.message || "");
    const code = e?.code || "";
    if (code === "permission-denied" || msg.includes("permission-denied")) {
      const snap = await getDocs(qry);
      return snap.size;
    }
    return 0;
  }
}

// tenta várias coleções/campos e retorna a maior contagem encontrada
async function countBy(
  colNames: string[],
  uid: string,
  ownerFields: string[],
  extra?: (base: Query) => Query,
  labelForLog?: string
): Promise<number> {
  let best = 0;
  for (const colName of colNames) {
    for (const f of ownerFields) {
      try {
        const base = query(collection(db, colName), where(f as any, "==", uid));
        const q = extra ? extra(base) : base;
        const n = await safeCount(q);
        if (n > best) best = n;
        if (n > 0) console.debug(`[metrics] ${labelForLog || colName}: ${colName}.${f} => ${n}`);
      } catch (e) {
        console.debug(`[metrics] falha em ${colName}.${f}`, e);
      }
    }
  }
  return best;
}

// scan dos últimos N docs quando precisar inferir flags/arrays
async function smartScanCount(
  colName: string,
  uid: string,
  eqFields: string[],
  arrayFields: string[],
  considerUnread = false
) {
  try {
    const snap = await getDocs(query(collection(db, colName), orderBy("__name__", "desc"), limit(200)));
    let total = 0;
    let unread = 0;

    for (const d of snap.docs) {
      const data = d.data() as any;

      const match =
        eqFields.some((f) => data?.[f] === uid) ||
        arrayFields.some((arr) => Array.isArray(data?.[arr]) && data[arr].includes(uid));

      if (!match) continue;

      total++;

      if (considerUnread) {
        let hasAnyFlag = false;
        let isRead = false;

        for (const flag of READ_FLAGS) {
          if (flag in data) {
            hasAnyFlag = true;
            if (data[flag] === true) isRead = true;
            if (data[flag] === false) {
              isRead = false;
              break;
            }
          }
        }
        if (hasAnyFlag && !isRead) unread++;
      }
    }

    return { total, unread };
  } catch {
    return { total: 0, unread: 0 };
  }
}

// não lidas primeiro; senão total; senão scan
async function robustUnreadOrTotal(
  colName: string,
  uid: string,
  eqFields: string[],
  arrayFields: string[]
): Promise<number> {
  let unreadSum = 0;
  for (const flag of READ_FLAGS) {
    const qUnread = qByAnyUserField(colName, uid, eqFields, (base) => query(base, where(flag as any, "==", false)));
    unreadSum += await safeCount(qUnread);
  }
  if (unreadSum > 0) return unreadSum;

  const qTotal = qByAnyUserField(colName, uid, eqFields);
  const totalEq = await safeCount(qTotal);
  if (totalEq > 0) return totalEq;

  const scan = await smartScanCount(colName, uid, eqFields, arrayFields, true);
  if (scan.unread > 0) return scan.unread;
  return scan.total;
}

/* =========================================================
   Componente
========================================================= */

export default function PainelUnificado() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [nome, setNome] = useState("");
  const [loadingLogout, setLoadingLogout] = useState(false);

  const [metrics, setMetrics] = useState({
    maquinas: 0,
    produtos: 0,
    servicos: 0,
    leads: 0,
    mensagens: 0,
    notificacoes: 0,
    avaliacoes: 0,
    demandas: 0,
    favoritos: 0,
    propostas: 0,
    pedidos: 0,
    sugestoes: 0,
    oportunidades: 0,
    emAtendimento: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // auth + nome
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        try {
          const s = await getDoc(doc(db, "usuarios", u.uid));
          setNome(s.exists() ? (s.data() as any)?.nome ?? "" : "");
        } catch {
          setNome("");
        }
      }
    });
    return () => unsub();
  }, []);

  // busca de métricas (hook correto: fora de qualquer função)
  useEffect(() => {
    if (!user?.uid) return;
    void fetchMetrics(user.uid);
  }, [user?.uid]);

  async function fetchMetrics(uid: string) {
    setLoadingMetrics(true);
    try {
      // nomes possíveis de coleções (pt/en)
      const cMaquinas = ["machines", "maquinas"];
      const cProdutos = ["produtos", "products"];
      const cServicos = ["services", "servicos"];
      const cLeads = ["leads"];
      const cDemandas = ["demandas"];
      const cFavoritos = ["favoritos", "favorites"];
      const cPropostas = ["propostas", "proposals"];
      const cPedidos = ["pedidos", "orders"];
      const cSugestoes = ["sugestoes", "suggestions"];
      const cAval = ["avaliacoes", "reviews"];
      const cNotifs = ["notificacoes", "notifications"];
      const cMsgs = ["mensagens", "messages"];
      const cOpps = ["demandAssignments", "assignments"];

      // aliases de ownership (o que você usa hoje)
      const ownerUser = [
        "usuarioId", // seu principal
        "userId",
        "ownerId",
        "uid",
        "autorId",
        "authorId",
      ];

      // contagens principais
      const [
        maquinas,
        produtos,
        servicos,
        leads,
        demandas,
        favoritos,
        propostas,
        pedidos,
        sugestoes,
        avaliacoes,
      ] = await Promise.all([
        countBy(cMaquinas, uid, ownerUser, undefined, "maquinas"),
        countBy(cProdutos, uid, ownerUser, undefined, "produtos"),
        countBy(cServicos, uid, ownerUser, undefined, "servicos"),
        // leads agora também por usuarioId/userId
        countBy(cLeads, uid, ownerUser, undefined, "leads"),
        countBy(cDemandas, uid, ownerUser, undefined, "demandas"),
        countBy(cFavoritos, uid, ownerUser, undefined, "favoritos"),
        countBy(cPropostas, uid, ownerUser, undefined, "propostas"),
        countBy(cPedidos, uid, ownerUser, undefined, "pedidos"),
        countBy(cSugestoes, uid, ownerUser, undefined, "sugestoes"),
        countBy(cAval, uid, ["avaliadoId", ...ownerUser], undefined, "avaliacoes"),
      ]);

      // notificações / mensagens
      const [notificacoes, mensagens] = await Promise.all([
        robustUnreadOrTotal(cNotifs[0], uid, USER_EQ_FIELDS_NOTIFS, USER_ARRAY_FIELDS),
        robustUnreadOrTotal(cMsgs[0], uid, USER_EQ_FIELDS_MSGS, USER_ARRAY_FIELDS),
      ]);

      // oportunidades (se sua collection usa userId/usuarioId ou supplierId)
      const oppOwnerFields = ["supplierId", "usuarioId", "userId"];
      const [oppSent, oppViewed, oppUnlocked] = await Promise.all([
        countBy(cOpps, uid, oppOwnerFields, (b) => query(b, where("status", "==", "sent")), "opp.sent"),
        countBy(cOpps, uid, oppOwnerFields, (b) => query(b, where("status", "==", "viewed")), "opp.viewed"),
        countBy(cOpps, uid, oppOwnerFields, (b) => query(b, where("status", "==", "unlocked")), "opp.unlocked"),
      ]);

      setMetrics({
        maquinas,
        produtos,
        servicos,
        leads,
        demandas,
        favoritos,
        propostas,
        pedidos,
        sugestoes,
        avaliacoes,
        notificacoes,
        mensagens,
        oportunidades: oppSent + oppViewed,
        emAtendimento: oppUnlocked,
      });
    } catch (e) {
      console.error("Erro ao buscar métricas:", e);
    } finally {
      setLoadingMetrics(false);
    }
  }

  function handleLogout() {
    setLoadingLogout(true);
    signOut(auth).finally(() => {
      setLoadingLogout(false);
      router.push("/auth/login");
    });
  }

  const initials = useMemo(() => {
    if (nome) return nome.trim().charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "U";
  }, [nome, user?.email]);

  /* ============================ UI ============================ */
  return (
    <RequireAuth title="Área exclusiva" description="Entre na sua conta para visualizar e interagir com sua área.">
      <main
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg,#f7fafc 0%, #f6f9fa 60%, #f1f5f9 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "48px 10px 32px 10px",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: 1240,
            background: "#fff",
            borderRadius: 24,
            boxShadow: "0 8px 40px #0001, 0 2px 8px #0001",
            padding: "36px 4vw 42px 4vw",
          }}
        >
          {/* Cabeçalho */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                width: "100%",
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 72,
                  height: 72,
                  background: "linear-gradient(135deg, #FB8500 0%, #2563eb 100%)",
                  color: "#fff",
                  borderRadius: "50%",
                  fontSize: 30,
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "3px solid #fff",
                  boxShadow: "0 6px 18px #0002",
                  overflow: "hidden",
                }}
              >
                {user?.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt={nome || user?.email || "Usuário"}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                  />
                ) : (
                  initials
                )}
              </div>

              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontWeight: 800, fontSize: "1.65rem", color: "#023047", marginBottom: 2 }}>
                  Bem-vindo{nome ? `, ${nome}` : ""}!
                </div>
                <div style={{ fontSize: "1.01rem", color: "#6b7680" }}>{user?.email}</div>

                {/* Acesso rápido */}
                <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                  <QuickLink href="/dashboard/oportunidades" label="Ver Oportunidades" />
                  <QuickLink href="/notificacoes" label="Notificações" />
                  <QuickLink href="/meus-servicos" label="Meus Serviços" />
                </div>
              </div>

              {/* Métricas rápidas */}
              <div style={{ display: "flex", gap: 11, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <MetricBadge icon={<Target size={17} />} value={loadingMetrics ? "..." : metrics.oportunidades} label="oportunidades" color="#2563eb" />
                <MetricBadge icon={<ClipboardList size={15} />} value={loadingMetrics ? "..." : metrics.emAtendimento} label="em atendimento" color="#059669" />
                <MetricBadge icon={<Layers size={17} />} value={loadingMetrics ? "..." : metrics.produtos + metrics.maquinas} label="produtos" color="#FB8500" />
                <MetricBadge icon={<Briefcase size={15} />} value={loadingMetrics ? "..." : metrics.servicos} label="serviços" color="#219ebc" />
                <MetricBadge icon={<Inbox size={15} />} value={loadingMetrics ? "..." : metrics.leads} label="contatos" color="#FB8500" />
                <MetricBadge icon={<MessageCircle size={15} />} value={loadingMetrics ? "..." : metrics.mensagens} label="mensagens" color="#2563eb" />
                <MetricBadge icon={<Bell size={15} />} value={loadingMetrics ? "..." : metrics.notificacoes} label="notificações" color="#FB8500" />
              </div>
            </div>
          </div>

          {/* Grid de Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 28 }}>
            <Tile href="/dashboard/oportunidades" color="#2563eb" bg="#f3f7ff" icon={<Target size={36} />} title="Demandas" desc="Novas demandas enviadas para você. Desbloqueie e atenda!" badge={loadingMetrics ? undefined : metrics.oportunidades} />
            <Tile href="/minhas-demandas" color="#219ebc" bg="#e0f7fa" icon={<ClipboardList size={36} />} title="Minhas Demandas" desc="Gerencie suas Demandas publicadas." badge={loadingMetrics ? undefined : metrics.demandas} />
            <Tile href="/meus-produtos" color="#FB8500" bg="#fff7ed" icon={<Layers size={36} />} title="Meus Produtos/Máquinas" desc="Gerencie seus produtos e máquinas." badge={loadingMetrics ? undefined : metrics.produtos + metrics.maquinas} />
            <Tile href="/meus-servicos" color="#219ebc" bg="#e0f7fa" icon={<Briefcase size={36} />} title="Meus Serviços" desc="Gerencie serviços e soluções oferecidas." badge={loadingMetrics ? undefined : metrics.servicos} />
            <Tile href="/meus-leads" color="#FB8500" bg="#fff7ed" icon={<Inbox size={36} />} title="Contatos Interessados" desc="Veja clientes interessados nas suas ofertas." badge={loadingMetrics ? undefined : metrics.leads} />
            <Tile href="/mensagens" color="#2563eb" bg="#f3f7ff" icon={<MessageCircle size={36} />} title="Mensagens" desc="Converse com clientes e negocie direto." badge={loadingMetrics ? undefined : metrics.mensagens} />
            <Tile href="/notificacoes" color="#FB8500" bg="#fff7ed" icon={<Bell size={36} />} title="Notificações" desc="Mostra não lidas primeiro; cai para total." badge={loadingMetrics ? undefined : metrics.notificacoes} />
            <Tile href="/minhas-propostas" color="#2563eb" bg="#f3f7ff" icon={<ClipboardList size={36} />} title="Minhas Propostas" desc="Acompanhe propostas enviadas e recebidas." badge={loadingMetrics ? undefined : metrics.propostas} />
            <Tile href="/meus-pedidos" color="#6d28d9" bg="#f9fafb" icon={<Wallet2 size={36} />} title="Pedidos" desc="Pedidos/assinaturas realizados." badge={loadingMetrics ? undefined : metrics.pedidos} />
            <Tile href="/favoritos" color="#FB8500" bg="#fff7ed" icon={<Heart size={36} />} title="Favoritos" desc="Acesse rapidamente seus favoritos." badge={loadingMetrics ? undefined : metrics.favoritos} />
            <Tile href="/avaliacoes" color="#FB8500" bg="#fff7ed" icon={<Star size={36} />} title="Avaliações Recebidas" desc="Confira feedbacks e reputação." badge={loadingMetrics ? undefined : metrics.avaliacoes} />
            <Tile href="/sugestoes" color="#FB8500" bg="#fff7ed" icon={<Lightbulb size={36} />} title="Sugestões" desc="Envie ideias para melhorar a plataforma." badge={loadingMetrics ? undefined : metrics.sugestoes} />
            {/* informativos */}
            <Tile href="/perfil" color="#2563eb" bg="#f3f7ff" icon={<Users size={36} />} title="Meu Perfil" desc="Gerencie seus dados pessoais e de empresa." />
            <Tile href="/parceiros" color="#FB8500" bg="#fff7ed" icon={<Users size={36} />} title="Parceiros" desc="Conheça empresas e parceiros." />
            <Tile href="/blog" color="#FB8500" bg="#fff7ed" icon={<BookOpen size={36} />} title="Blog" desc="Conteúdos, notícias e dicas do setor." />
            <Tile href="/ajuda" color="#059669" bg="#ecfdf5" icon={<LifeBuoy size={36} />} title="Central de Ajuda" desc="FAQ, suporte e abertura de tickets." />
            <Tile href="/financeiro" color="#6d28d9" bg="#f9fafb" icon={<Wallet2 size={36} />} title="Financeiro" desc="Pagamentos e notas (em breve)." />

            {/* Sair */}
            <button
              onClick={handleLogout}
              disabled={loadingLogout}
              style={{
                background: "#fff3ea",
                border: "1.5px solid #ffb680",
                borderRadius: 22,
                boxShadow: "0 8px 36px #0001",
                padding: "32px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                color: "#E85D04",
                fontWeight: 700,
                fontSize: "1.05rem",
                minHeight: 185,
                position: "relative",
                cursor: loadingLogout ? "not-allowed" : "pointer",
              }}
              className="group hover:shadow-xl hover:scale-[1.03] transition"
              aria-label="Sair da conta"
              title="Encerrar sessão"
            >
              <LogOut size={36} className="mb-2 group-hover:scale-110 transition-transform duration-200" />
              <span style={{ color: "#E85D04", fontWeight: 800, fontSize: 19 }}>{loadingLogout ? "Saindo..." : "Sair"}</span>
              <span style={{ color: "#495668", fontSize: ".97rem", marginTop: 1 }}>Encerrar sessão na plataforma.</span>
            </button>
          </div>
        </section>

        <footer
          style={{
            marginTop: 34,
            paddingTop: 24,
            borderTop: "1.5px solid #e5e7eb",
            textAlign: "center",
            fontSize: 15,
            color: "#6c7780",
          }}
        >
          © {new Date().getFullYear()} Pedraum Brasil · Painel do Usuário.
        </footer>
      </main>
    </RequireAuth>
  );
}

/* =========================================================
   Componentes
========================================================= */

function MetricBadge({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "#f6f9fa",
        borderRadius: 13,
        padding: "6px 14px",
        fontSize: ".97rem",
        color: "#023047",
        fontWeight: 700,
        border: `1px solid ${color}30`,
        boxShadow: "0 2px 6px #0000000f",
      }}
    >
      <span style={{ color, display: "flex", alignItems: "center" }}>{icon}</span>
      <span>{value}</span>
      <span style={{ marginLeft: 2, color: "#5a7b8b", fontWeight: 500, fontSize: ".91em" }}>{label}</span>
    </div>
  );
}

/** Popover de ajuda (hover + clique). */
function InfoBubble({ text, color = "#023047" }: { text: string; color?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
      style={{ position: "absolute", top: 10, right: 10, zIndex: 5 }}
    >
      <button
        aria-label="Ajuda desta seção"
        style={{
          background: "#fff",
          border: `1px solid ${color}25`,
          borderRadius: 999,
          width: 28,
          height: 28,
          display: "grid",
          placeItems: "center",
          boxShadow: "0 2px 8px #0002",
          cursor: "pointer",
        }}
      >
        <CircleHelp size={16} color={color} />
      </button>

      {open && (
        <div
          role="dialog"
          style={{
            position: "absolute",
            top: 36,
            right: 0,
            maxWidth: 280,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            boxShadow: "0 10px 28px #0002, 0 4px 10px #0001",
            padding: "10px 12px",
            fontSize: ".96rem",
            color: "#334155",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <strong style={{ color: "#023047", fontSize: ".98rem" }}>O que é isto?</strong>
            <button onClick={() => setOpen(false)} aria-label="Fechar" style={{ background: "transparent", border: 0, cursor: "pointer" }}>
              <X size={16} />
            </button>
          </div>
          <p style={{ lineHeight: 1.35 }}>{text}</p>
        </div>
      )}
    </div>
  );
}

function Tile({
  href,
  color,
  bg,
  icon,
  title,
  desc,
  badge,
}: {
  href: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: number;
}) {
  const showBadge = typeof badge === "number";
  const isZero = badge === 0;

  return (
    <Link href={href} className="group" style={{ textDecoration: "none" }}>
      <div
        style={{
          background: bg,
          border: `1.5px solid ${color}25`,
          borderRadius: 22,
          boxShadow: "0 8px 36px #0001",
          padding: "32px 10px 28px 10px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: "pointer",
          transition: "box-shadow .16s, transform .13s, border-color .13s",
          minHeight: 185,
          position: "relative",
        }}
        className="hover:shadow-xl hover:scale-[1.035] transition group"
      >
        <div style={{ color, marginBottom: 12, position: "relative", display: "flex", alignItems: "center" }}>
          {icon}
          {showBadge && (
            <span
              style={{
                position: "absolute",
                top: -10,
                right: -13,
                background: isZero ? "#94a3b8" : "#e63946",
                color: "#fff",
                fontSize: 13,
                fontWeight: 900,
                padding: "3.5px 10px",
                borderRadius: 11,
                boxShadow: "0 2px 8px #0003",
                animation: isZero ? "none" : "pulse-badge 1.2s infinite",
              }}
            >
              {badge}
            </span>
          )}
        </div>

        <span style={{ fontWeight: 800, color: "#023047", fontSize: 21, marginBottom: 3, textAlign: "center", letterSpacing: ".2px" }}>
          {title}
        </span>
        <span style={{ color: "#64748b", fontSize: "1.02rem", textAlign: "center", marginTop: 1, lineHeight: 1.35 }}>
          {desc}
        </span>

        <InfoBubble text={desc} color={color} />
      </div>

      <style jsx>{`
        @keyframes pulse-badge {
          0% { transform: scale(1); box-shadow: 0 0 0 0 #e6394655; }
          70% { transform: scale(1.09); box-shadow: 0 0 0 8px #e6394600; }
          100% { transform: scale(1); box-shadow: 0 0 0 0 #e6394600; }
      `}</style>
    </Link>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        color: "#023047",
        padding: "8px 12px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        boxShadow: "0 2px 10px #00000008",
      }}
      className="hover:shadow-md hover:scale-[1.02] transition"
    >
      {label}
    </Link>
  );
}
