"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { db, auth } from "@/firebaseConfig";
import {
  collection, query, where, getCountFromServer, getDoc, doc
} from "firebase/firestore";
import {
  Layers, ClipboardList, MessageCircle, Bell, Star, Users, BookOpen,
  Briefcase, Heart, Lightbulb, Wallet2, LifeBuoy, LogOut, Inbox, Target
} from "lucide-react";

export default function PainelUnificado() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");

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
    oportunidades: 0,      // NEW: sent + viewed
    emAtendimento: 0,      // NEW: unlocked
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Busca usuário logado e nome na coleção usuarios
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, "usuarios", u.uid));
        setNome(userDoc.exists() ? userDoc.data().nome : "");
      }
    });
    return () => unsubscribe();
  }, []);

  // Busca métricas ao logar
  useEffect(() => {
    if (user?.uid) fetchMetrics(user.uid);
    // eslint-disable-next-line
  }, [user]);

  async function fetchMetrics(uid: string) {
    setLoadingMetrics(true);
    try {
      const [
        maq, prod, serv, leads, msgs, notif, aval, demandas, fav, prop, pedidos, sugest,
        // Oportunidades (somatório de 2 consultas para status diferentes)
        oppSent, oppViewed, oppUnlocked
      ] = await Promise.all([
        getCountFromServer(query(collection(db, "machines"), where("userId", "==", uid))),
        getCountFromServer(query(collection(db, "produtos"), where("userId", "==", uid))),
        getCountFromServer(query(collection(db, "services"), where("userId", "==", uid))),
        // Atenção: em leads o campo correto é "vendedorId"
        getCountFromServer(query(collection(db, "leads"), where("vendedorId", "==", uid))),
        getCountFromServer(query(collection(db, "mensagens"), where("destinatarioId", "==", uid))),
        getCountFromServer(query(collection(db, "notificacoes"), where("usuarioId", "==", uid))),
        getCountFromServer(query(collection(db, "avaliacoes"), where("avaliadoId", "==", uid))),
        getCountFromServer(query(collection(db, "demandas"), where("userId", "==", uid))),
        getCountFromServer(query(collection(db, "favoritos"), where("userId", "==", uid))),
        getCountFromServer(query(collection(db, "propostas"), where("userId", "==", uid))),
        getCountFromServer(query(collection(db, "pedidos"), where("userId", "==", uid))),
        getCountFromServer(query(collection(db, "sugestoes"), where("userId", "==", uid))),

        // NEW — demandAssignments por fornecedor
        getCountFromServer(query(
          collection(db, "demandAssignments"),
          where("supplierId", "==", uid),
          where("status", "==", "sent")
        )),
        getCountFromServer(query(
          collection(db, "demandAssignments"),
          where("supplierId", "==", uid),
          where("status", "==", "viewed")
        )),
        getCountFromServer(query(
          collection(db, "demandAssignments"),
          where("supplierId", "==", uid),
          where("status", "==", "unlocked")
        )),
      ]);

      const oportunidades = (oppSent.data().count || 0) + (oppViewed.data().count || 0);
      const emAtendimento = oppUnlocked.data().count || 0;

      setMetrics({
        maquinas: maq.data().count,
        produtos: prod.data().count,
        servicos: serv.data().count,
        leads: leads.data().count,
        mensagens: msgs.data().count,
        notificacoes: notif.data().count,
        avaliacoes: aval.data().count,
        demandas: demandas.data().count,
        favoritos: fav.data().count,
        propostas: prop.data().count,
        pedidos: pedidos.data().count,
        sugestoes: sugest.data().count,
        oportunidades,
        emAtendimento,
      });
    } catch (err) {
      console.error("Erro ao buscar métricas:", err);
    }
    setLoadingMetrics(false);
  }

  function handleLogout() {
    setLoading(true);
    signOut(auth).then(() => {
      setLoading(false);
      router.push("/auth/login");
    });
  }

  const initials = useMemo(() => {
    if (nome) return nome.trim().charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "U";
  }, [nome, user?.email]);

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#f7fafc 0%, #f6f9fa 60%, #f1f5f9 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "48px 10px 32px 10px",
    }}>
      <section style={{
        width: "100%",
        maxWidth: 1240,
        background: "#fff",
        borderRadius: 24,
        boxShadow: "0 8px 40px #0001, 0 2px 8px #0001",
        padding: "36px 4vw 42px 4vw",
        marginBottom: 0,
      }}>
        {/* Cabeçalho */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          marginBottom: 24,
          alignItems: "flex-start",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            width: "100%",
            flexWrap: "wrap",
            justifyContent: "space-between"
          }}>
            {/* Avatar */}
            <div style={{
              width: 72, height: 72,
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
              overflow: "hidden"
            }}>
              {user?.photoURL ? (
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

              {/* NEW: Acesso rápido */}
              <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                <QuickLink href="/dashboard/oportunidades" label="Ver Oportunidades" />
                <QuickLink href="/notificacoes" label="Notificações" />
                <QuickLink href="/meus-servicos" label="Meus Serviços" />
              </div>
            </div>

            {/* Métricas rápidas */}
            <div style={{
              display: "flex",
              gap: 11,
              flexWrap: "wrap",
              justifyContent: "flex-end"
            }}>
              <MetricBadge icon={<Target size={17} />} value={loadingMetrics ? "..." : metrics.oportunidades} label="oportunidades" color="#2563eb" />
              <MetricBadge icon={<ClipboardList size={15} />} value={loadingMetrics ? "..." : metrics.emAtendimento} label="em atendimento" color="#059669" />
              <MetricBadge icon={<Layers size={17} />} value={loadingMetrics ? "..." : (metrics.produtos + metrics.maquinas)} label="produtos" color="#FB8500" />
              <MetricBadge icon={<Briefcase size={15} />} value={loadingMetrics ? "..." : metrics.servicos} label="serviços" color="#219ebc" />
              <MetricBadge icon={<Inbox size={15} />} value={loadingMetrics ? "..." : metrics.leads} label="contatos" color="#FB8500" />
              <MetricBadge icon={<MessageCircle size={15} />} value={loadingMetrics ? "..." : metrics.mensagens} label="mensagens" color="#2563eb" />
              <MetricBadge icon={<Bell size={15} />} value={loadingMetrics ? "..." : metrics.notificacoes} label="notificações" color="#FB8500" />
            </div>
          </div>
        </div>

        {/* Grid de funcionalidades */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 28,
            margin: "4px 0 16px 0"
          }}
        >
          {/* NEW: Oportunidades */}
          <Tile
            href="/dashboard/oportunidades"
            color="#2563eb" bg="#f3f7ff"
            icon={<Target size={36} />}
            title="Oportunidades"
            desc="Novas demandas enviadas para você. Desbloqueie e atenda!"
            badge={metrics.oportunidades}
          />

          <Tile href="/perfil" color="#2563eb" bg="#f3f7ff" icon={<Users size={36} />} title="Meu Perfil" desc="Gerencie seus dados pessoais e de empresa." />
          <Tile href="/minhas-demandas" color="#219ebc" bg="#e0f7fa" icon={<ClipboardList size={36} />} title="Minhas Necessidades" desc="Gerencie suas Necessidades publicadas." badge={metrics.demandas} />
          <Tile href="/meus-produtos" color="#FB8500" bg="#fff7ed" icon={<Layers size={36} />} title="Meus Produtos/Máquinas" desc="Gerencie seus produtos e máquinas." badge={metrics.produtos + metrics.maquinas} />
          <Tile href="/meus-servicos" color="#219ebc" bg="#e0f7fa" icon={<Briefcase size={36} />} title="Meus Serviços" desc="Gerencie serviços e soluções oferecidas." badge={metrics.servicos} />
          <Tile href="/meus-leads" color="#FB8500" bg="#fff7ed" icon={<Inbox size={36} />} title="Contatos Interessados" desc="Veja clientes interessados nas suas ofertas." badge={metrics.leads} />
          <Tile href="/favoritos" color="#FB8500" bg="#fff7ed" icon={<Heart size={36} />} title="Favoritos" desc="Acesse rapidamente seus favoritos." badge={metrics.favoritos} />
          <Tile href="/notificacoes" color="#FB8500" bg="#fff7ed" icon={<Bell size={36} />} title="Notificações" desc="Alertas e novidades importantes." badge={metrics.notificacoes} />
          <Tile href="/avaliacoes" color="#FB8500" bg="#fff7ed" icon={<Star size={36} />} title="Avaliações Recebidas" desc="Confira feedbacks e reputação." badge={metrics.avaliacoes} />
          <Tile href="/sugestoes" color="#FB8500" bg="#fff7ed" icon={<Lightbulb size={36} />} title="Sugestões" desc="Envie ideias para melhorar a plataforma." badge={metrics.sugestoes} />
          <Tile href="/parceiros" color="#FB8500" bg="#fff7ed" icon={<Users size={36} />} title="Parceiros" desc="Conheça empresas e parceiros." />
          <Tile href="/blog" color="#FB8500" bg="#fff7ed" icon={<BookOpen size={36} />} title="Blog" desc="Conteúdos, notícias e dicas do setor." />
          <Tile href="/ajuda" color="#059669" bg="#ecfdf5" icon={<LifeBuoy size={36} />} title="Central de Ajuda" desc="FAQ, suporte e abertura de tickets." />
          <Tile href="/financeiro" color="#6d28d9" bg="#f9fafb" icon={<Wallet2 size={36} />} title="Financeiro" desc="Pagamentos e notas (em breve)." />

          {/* Sair */}
          <button
            onClick={handleLogout}
            disabled={loading}
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
              cursor: loading ? "not-allowed" : "pointer",
              transition: "box-shadow .16s, transform .13s",
              color: "#E85D04",
              fontWeight: 700,
              fontSize: "1.05rem",
              minHeight: 185,
            }}
            className="group hover:shadow-xl hover:scale-[1.03] transition"
            aria-label="Sair da conta"
            title="Encerrar sessão"
          >
            <LogOut size={36} className="mb-2 group-hover:scale-110 transition-transform duration-200" />
            <span style={{ color: "#E85D04", fontWeight: 800, fontSize: 19 }}>{loading ? "Saindo..." : "Sair"}</span>
            <span style={{ color: "#495668", fontSize: ".97rem", marginTop: 1 }}>Encerrar sessão na plataforma.</span>
          </button>
        </div>
      </section>

      {/* Rodapé */}
      <footer style={{
        marginTop: 34,
        paddingTop: 24,
        borderTop: "1.5px solid #e5e7eb",
        textAlign: "center",
        fontSize: 15,
        color: "#6c7780"
      }}>
        © {new Date().getFullYear()} Pedraum Brasil · Painel do Usuário.
      </footer>
    </main>
  );
}

/* ===== COMPONENTES ===== */

function MetricBadge({
  icon, value, label, color
}: { icon: React.ReactNode; value: string | number; label: string; color: string }) {
  return (
    <div style={{
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
      boxShadow: "0 2px 6px #0000000f"
    }}>
      <span style={{ color, display: "flex", alignItems: "center" }}>{icon}</span>
      <span>{value}</span>
      <span style={{ marginLeft: 2, color: "#5a7b8b", fontWeight: 500, fontSize: ".91em" }}>{label}</span>
    </div>
  );
}

function Tile({
  href, color, bg, icon, title, desc, badge
}: {
  href: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: number;
}) {
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
        <div style={{
          color,
          marginBottom: 12,
          position: "relative",
          display: "flex",
          alignItems: "center"
        }}>
          {icon}
          {(badge && badge > 0) && (
            <span style={{
              position: "absolute",
              top: -10, right: -13,
              background: "#e63946",
              color: "#fff",
              fontSize: 13,
              fontWeight: 900,
              padding: "3.5px 10px",
              borderRadius: 11,
              boxShadow: "0 2px 8px #0003",
              animation: "pulse-badge 1.2s infinite",
            }}>{badge}</span>
          )}
        </div>
        <span style={{
          fontWeight: 800,
          color: "#023047",
          fontSize: 21,
          marginBottom: 3,
          textAlign: "center",
          letterSpacing: ".2px"
        }}>{title}</span>
        <span style={{
          color: "#64748b",
          fontSize: "1.02rem",
          textAlign: "center",
          marginTop: 1,
          lineHeight: 1.35
        }}>{desc}</span>
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
    <Link href={href} style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      color: "#023047",
      padding: "8px 12px",
      borderRadius: 999,
      fontSize: 13,
      fontWeight: 700,
      boxShadow: "0 2px 10px #00000008"
    }}
      className="hover:shadow-md hover:scale-[1.02] transition"
    >
      {label}
    </Link>
  );
}
