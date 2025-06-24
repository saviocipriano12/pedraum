// =============================
// app/painel-comprador/page.tsx
// =============================

"use client";
import { withRoleProtection } from "@/utils/withRoleProtection";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { db, auth } from "@/firebaseConfig";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import {
  ClipboardList, Heart, MessageCircle, Bell, Star, Users, BookOpen, Lightbulb, Wallet2, LifeBuoy, LogOut
} from "lucide-react";

export default withRoleProtection(PainelComprador, { allowed: ["comprador"] });

function PainelComprador() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    demandas: 0,
    favoritos: 0,
    mensagens: 0,
    notificacoes: 0,
    avaliacoes: 0,
    pedidos: 0,
    sugestoes: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => setUser(user));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchMetrics() {
      if (!user) return;
      setLoadingMetrics(true);
      try {
        const demandasQuery = query(collection(db, "demandas"), where("userId", "==", user.uid));
        const demandasSnap = await getCountFromServer(demandasQuery);
        const favQuery = query(collection(db, "favoritos"), where("userId", "==", user.uid));
        const favSnap = await getCountFromServer(favQuery);
        const msgQuery = query(collection(db, "mensagens"), where("destinatarioId", "==", user.uid));
        const msgSnap = await getCountFromServer(msgQuery);
        const notifQuery = query(collection(db, "notificacoes"), where("usuarioId", "==", user.uid));
        const notifSnap = await getCountFromServer(notifQuery);
        const avalQuery = query(collection(db, "avaliacoes"), where("avaliadoId", "==", user.uid));
        const avalSnap = await getCountFromServer(avalQuery);
        const pedidosQuery = query(collection(db, "pedidos"), where("userId", "==", user.uid));
        const pedidosSnap = await getCountFromServer(pedidosQuery);
        const sugestQuery = query(collection(db, "sugestoes"), where("userId", "==", user.uid));
        const sugestSnap = await getCountFromServer(sugestQuery);
        setMetrics({
          demandas: demandasSnap.data().count,
          favoritos: favSnap.data().count,
          mensagens: msgSnap.data().count,
          notificacoes: notifSnap.data().count,
          avaliacoes: avalSnap.data().count,
          pedidos: pedidosSnap.data().count,
          sugestoes: sugestSnap.data().count,
        });
      } catch (err) {
        console.error("Erro ao buscar métricas do comprador:", err);
      } finally {
        setLoadingMetrics(false);
      }
    }
    fetchMetrics();
  }, [user]);

  function handleLogout() {
    setLoading(true);
    signOut(auth).then(() => {
      setLoading(false);
      router.push("/auth/login");
    });
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f6f9fa",
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
        {/* Cabeçalho do usuário */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          marginBottom: 36,
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
              width: 64, height: 64,
              background: "linear-gradient(135deg, #FB8500 65%, #2563eb 120%)",
              color: "#fff",
              borderRadius: "50%",
              fontSize: 32,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid #fff",
              boxShadow: "0 4px 16px #0002"
            }}>
              {user?.displayName
                ? user.displayName.charAt(0).toUpperCase()
                : user?.email?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: "1.55rem", color: "#023047", marginBottom: 2 }}>
                Bem-vindo{user?.displayName ? `, ${user.displayName}` : ""}!
              </div>
              <div style={{ fontSize: "1.01rem", color: "#6b7680" }}>{user?.email}</div>
            </div>
            {/* Métricas rápidas */}
            <div style={{
              display: "flex",
              gap: 11,
              flexWrap: "wrap",
              justifyContent: "flex-end"
            }}>
              <MetricBadge icon={<ClipboardList size={17} />} value={loadingMetrics ? "..." : metrics.demandas} label="demandas" color="#FB8500" />
              <MetricBadge icon={<Heart size={15} />} value={loadingMetrics ? "..." : metrics.favoritos} label="favoritos" color="#FB8500" />
              <MetricBadge icon={<MessageCircle size={15} />} value={loadingMetrics ? "..." : metrics.mensagens} label="mensagens" color="#2563eb" />
              <MetricBadge icon={<Bell size={15} />} value={loadingMetrics ? "..." : metrics.notificacoes} label="notificações" color="#2563eb" />
            </div>
          </div>
        </div>

        {/* Grid de funcionalidades principais */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 32,
            margin: "0 0 16px 0"
          }}
        >
          <Tile href="/perfil" color="#2563eb" bg="#f3f7ff" icon={<Users size={36} />} title="Meu Perfil" desc="Gerencie seu perfil, dados de contato e privacidade." />
          <Tile href="/minhas-demandas" color="#0ea5e9" bg="#e0f7fa" icon={<ClipboardList size={36} />} title="Minhas Demandas" desc="Gerencie seus pedidos e solicitações publicados." />
          <Tile href="/favoritos" color="#FB8500" bg="#fff7ed" icon={<Heart size={36} />} title="Favoritos" desc="Acesse rapidamente suas demandas e itens favoritos." />
          <Tile href="/mensagens" color="#FB8500" bg="#fff7ed" icon={<MessageCircle size={36} />} title="Mensagens" desc="Converse com vendedores, tire dúvidas e negocie direto." badge={metrics.mensagens} />
          <Tile href="/notificacoes" color="#FB8500" bg="#fff7ed" icon={<Bell size={36} />} title="Notificações" desc="Alertas e novidades importantes da sua conta." badge={metrics.notificacoes} />
          <Tile href="/avaliacoes" color="#FB8500" bg="#fff7ed" icon={<Star size={36} />} title="Avaliações Recebidas" desc="Confira feedbacks de vendedores e prestadores." />
          <Tile href="/pedidos" color="#2563eb" bg="#f3f7ff" icon={<ClipboardList size={36} />} title="Minhas Negociações" desc="Histórico de propostas, negociações e contratações." />
          <Tile href="/sugestoes" color="#FB8500" bg="#fff7ed" icon={<Lightbulb size={36} />} title="Sugestões" desc="Envie ideias para melhorar a plataforma." />
          <Tile href="/parceiros" color="#FB8500" bg="#fff7ed" icon={<Users size={36} />} title="Parceiros" desc="Conheça empresas e profissionais parceiros." />
          <Tile href="/blog" color="#FB8500" bg="#fff7ed" icon={<BookOpen size={36} />} title="Blog" desc="Acesse dicas, notícias e conteúdos do setor." />
          <Tile href="/ajuda" color="#059669" bg="#ecfdf5" icon={<LifeBuoy size={36} />} title="Central de Ajuda" desc="FAQ, suporte e abertura de tickets." />
          <Tile href="/financeiro" color="#6d28d9" bg="#f9fafb" icon={<Wallet2 size={36} />} title="Financeiro/Carteira" desc="Saldo, extratos e movimentações (em breve)." />
          <button
            onClick={handleLogout}
            disabled={loading}
            style={{
              background: "#fff3ea",
              border: "1.5px solid #ffb680",
              borderRadius: 22,
              boxShadow: "0 8px 36px #0001",
              padding: "32px 8px 32px 8px",
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
        © {new Date().getFullYear()} Pedraum Brasil · Painel do Comprador.
      </footer>
    </main>
  );
}

// COMPONENTE BADGE DE MÉTRICA
function MetricBadge({ icon, value, label, color }: { icon: React.ReactNode, value: string | number, label: string, color: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 4,
      background: "#f6f9fa",
      borderRadius: 13,
      padding: "4.5px 14px",
      fontSize: ".97rem",
      color: "#023047",
      fontWeight: 700,
      border: `1px solid ${color}30`
    }}>
      <span style={{ color, display: "flex", alignItems: "center" }}>{icon}</span>
      <span style={{ marginLeft: 4 }}>{value}</span>
      <span style={{ marginLeft: 3, color: "#5a7b8b", fontWeight: 500, fontSize: ".91em" }}>{label}</span>
    </div>
  );
}

// COMPONENTE DE TILE DO PAINEL
function Tile({
  href, color, bg, icon, title, desc, badge
}: {
  href: string,
  color: string,
  bg: string,
  icon: React.ReactNode,
  title: string,
  desc: string,
  badge?: number,
}) {
  return (
    <Link href={href} className="group" style={{ textDecoration: "none" }}>
      <div style={{
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
          fontWeight: 700,
          color: "#023047",
          fontSize: 21,
          marginBottom: 3,
          textAlign: "center"
        }}>{title}</span>
        <span style={{
          color: "#64748b",
          fontSize: "1.02rem",
          textAlign: "center",
          marginTop: 1
        }}>{desc}</span>
      </div>
      <style jsx>{`
        @keyframes pulse-badge {
          0% { transform: scale(1); box-shadow: 0 0 0 0 #e6394655; }
          70% { transform: scale(1.09); box-shadow: 0 0 0 8px #e6394600; }
          100% { transform: scale(1); box-shadow: 0 0 0 0 #e6394600; }
        }
      `}</style>
    </Link>
  );
}
