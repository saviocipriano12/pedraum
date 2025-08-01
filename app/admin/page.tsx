"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/firebaseConfig";
import {
  collection, getCountFromServer, getDocs, orderBy, limit, query
} from "firebase/firestore";
import {
  Users, Briefcase, ClipboardList, Star, Wallet2, BookOpen,
  Newspaper, ListChecks, Inbox, Lightbulb, Building2, TrendingUp, Activity, ShieldCheck
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

// --- CARDS PRINCIPAIS
const CARDS = [
  { label: "Usuários", icon: Users, key: "usuarios", link: "/admin/usuarios", color: "#2563eb" },
  { label: "Produtos", icon: TrendingUp, key: "produtos", link: "/admin/produtos", color: "#fb8500" },
  { label: "Serviços", icon: Briefcase, key: "services", link: "/admin/services", color: "#219ebc" },
  { label: "Demandas", icon: ClipboardList, key: "demandas", link: "/admin/demandas", color: "#023047" },
  { label: "Leads", icon: ListChecks, key: "leads", link: "/admin/leads", color: "#00b4d8" },
  { label: "Sugestões", icon: Lightbulb, key: "sugestoes", link: "/admin/sugestoes", color: "#fbbf24" },
  { label: "Parceiros", icon: Building2, key: "parceiros", link: "/admin/parceiros", color: "#14b8a6" },
  { label: "Blog", icon: Newspaper, key: "blog", link: "/admin/blog", color: "#ffc300" },
];

const RECENT_COLLECTIONS = [
  { label: "Usuários Novos", key: "usuarios", icon: Users, mainField: "nome", email: true },
  { label: "Produtos Recentes", key: "produtos", icon: TrendingUp, mainField: "titulo" },
  { label: "Serviços Recentes", key: "services", icon: Briefcase, mainField: "titulo" },
  { label: "Demandas Novas", key: "demandas", icon: ClipboardList, mainField: "titulo" },
  { label: "Leads Recentes", key: "leads", icon: Inbox, mainField: "nome" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>({});
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [recentData, setRecentData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      // Busca info do admin autenticado
      let userStr = localStorage.getItem("user");
      let user = userStr ? JSON.parse(userStr) : null;
      let nome = user?.nome || "Administrador";
      let email = user?.email || "admin@pedraum.com.br";
      let photoURL = user?.photoURL || "";
      setAdminInfo({ nome, email, photoURL, papel: "Admin" });

      // Busca contadores dos cards
      const counts: any = {};
      for (const { key } of CARDS) {
        try {
          const snap = await getCountFromServer(collection(db, key));
          counts[key] = snap.data().count;
        } catch {
          counts[key] = 0;
        }
      }
      setStats(counts);

      // Listas recentes
      const rdata: any = {};
      for (const c of RECENT_COLLECTIONS) {
        try {
          const snap = await getDocs(query(collection(db, c.key), orderBy("createdAt", "desc"), limit(5)));
          rdata[c.key] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch {
          rdata[c.key] = [];
        }
      }
      setRecentData(rdata);
      setLoading(false);
    }
    fetchAll();
  }, []);

  // Gráficos
  const pieData = CARDS.map((card) => ({
    name: card.label,
    value: stats[card.key] || 0,
    color: card.color,
  }));
  const barData = [
    { name: "Produtos", Quantidade: stats.produtos || 0 },
    { name: "Serviços", Quantidade: stats.services || 0 },
    { name: "Demandas", Quantidade: stats.demandas || 0 }
  ];

  return (
    <main style={{
      minHeight: "100vh", background: "#f6f9fa", padding: "36px 0 0 0",
      fontFamily: 'Inter, "Segoe UI", Arial, sans-serif'
    }}>
      <section style={{ maxWidth: 1480, margin: "0 auto", padding: "0 2vw" }}>
        {/* HEADER */}
        <div style={{
          background: "#fff", borderRadius: 30, boxShadow: "0 8px 40px #0001, 0 2px 8px #0001",
          padding: "38px 34px", marginBottom: 36, display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap"
        }}>
          <div style={{
            width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg, #FB8500 65%, #2563eb 120%)",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, fontWeight: 900, border: "4px solid #fff", boxShadow: "0 4px 16px #0002"
          }}>
            {adminInfo?.photoURL
              ? <img src={adminInfo.photoURL} alt={adminInfo.nome} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              : adminInfo?.nome
                ? adminInfo.nome.charAt(0).toUpperCase()
                : <ShieldCheck size={58} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 250 }}>
            <div style={{ fontWeight: 900, fontSize: "2.25rem", color: "#023047", marginBottom: 3, letterSpacing: "-1.2px" }}>
              Painel do Administrador
            </div>
            <div style={{ color: "#8e97a3", fontSize: "1.14rem", marginBottom: 4 }}>
              Olá, <b>{adminInfo?.nome || "Administrador"}</b> (<span style={{ color: "#fb8500" }}>{adminInfo?.papel || "Admin"}</span>). Gerencie <b>tudo</b> em tempo real e tenha o controle total da plataforma <b>Pedraum</b>.
            </div>
            <span style={{ color: "#219ebc", fontWeight: 700, fontSize: "1rem" }}>{adminInfo?.email}</span>
          </div>
          <div>
            <Link href="/admin/usuarios" style={{
              background: "#2563eb", color: "#fff", borderRadius: 20,
              padding: "18px 40px", fontWeight: 900, fontSize: "1.19rem", textDecoration: "none",
              boxShadow: "0 2px 16px #2563eb13"
            }}>
              Gerenciar Usuários
            </Link>
          </div>
        </div>

        {/* CARDS */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "34px",
          marginBottom: 46,
        }}>
          {CARDS.map((card) => (
            <Link href={card.link} key={card.key} className="admin-card" style={{ textDecoration: "none" }}>
              <div style={{
                background: "#fff",
                border: `2.5px solid ${card.color}20`,
                borderRadius: 25,
                boxShadow: "0 8px 38px #0001",
                padding: "40px 0 22px 0",
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 10, minHeight: 165,
                cursor: "pointer", transition: "box-shadow .18s, transform .13s"
              }} className="hover:shadow-xl hover:scale-[1.06] transition">
                <card.icon size={48} style={{ color: card.color, marginBottom: 8 }} />
                <span style={{ fontWeight: 800, fontSize: 20, color: "#023047", marginBottom: 2 }}>
                  {card.label}
                </span>
                <span style={{
                  fontSize: 31, fontWeight: 900, color: card.color, letterSpacing: ".5px",
                  background: "#f5faff", borderRadius: 12, padding: "6px 20px", minWidth: 56, textAlign: "center"
                }}>
                  {loading ? "..." : stats[card.key] ?? 0}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* DASHBOARD E LISTAS */}
        <div style={{ display: "grid", gridTemplateColumns: "1.18fr 1fr", gap: 44, marginBottom: 50, alignItems: "stretch" }}>
          {/* GRÁFICOS */}
          <div style={{ background: "#fff", borderRadius: 28, boxShadow: "0 8px 40px #0001", padding: "42px 4vw 44px 4vw" }}>
            <h2 style={{ fontWeight: 900, fontSize: "1.23rem", color: "#023047", marginBottom: 25 }}>
              Visão Geral de Cadastros
            </h2>
            <div style={{ width: "100%", height: 265, marginBottom: 38 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%" outerRadius={92}
                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}
                    style={{ fontWeight: 800, fontSize: "1.08rem" }}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontWeight={700} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="Quantidade" fill="#2563eb" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* LISTAS RECENTES, ATALHOS, AVISOS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 34, minHeight: 250 }}>
            {/* Atalhos */}
            <div style={{
              background: "#fff", borderRadius: 24, boxShadow: "0 8px 32px #0001", padding: "24px 30px"
            }}>
              <div style={{ fontWeight: 900, color: "#2563eb", fontSize: "1.15rem", marginBottom: 19 }}>
                Atalhos Administrativos
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 15, marginBottom: 7 }}>
                <Link href="/create-produto" style={quickBtn("#fb8500", "#fff")}>+ Novo Produto</Link>
                <Link href="/create-service" style={quickBtn("#219ebc", "#fff")}>+ Novo Serviço</Link>
                <Link href="/admin/blog/create" style={quickBtn("#2563eb", "#fff")}>+ Novo Post Blog</Link>
                <Link href="/admin/leads" style={quickBtn("#00b4d8", "#fff")}>Ver Leads</Link>
                <Link href="/admin/usuarios" style={quickBtn("#2563eb", "#fff")}>Usuários</Link>
                <Link href="/admin/parceiros" style={quickBtn("#14b8a6", "#fff")}>Parceiros</Link>
              </div>
            </div>
            {/* Últimos Cadastros */}
            <div style={{
              background: "#fff", borderRadius: 24, boxShadow: "0 8px 32px #0001", padding: "23px 30px"
            }}>
              <div style={{ fontWeight: 900, color: "#fb8500", fontSize: "1.12rem", marginBottom: 13 }}>
                Últimos Cadastros
              </div>
              {RECENT_COLLECTIONS.map(rc => (
                <div key={rc.key} style={{ marginBottom: 13 }}>
                  <div style={{ fontWeight: 800, color: "#2563eb", marginBottom: 3, display: "flex", alignItems: "center", gap: 8 }}>
                    <rc.icon size={17} /> {rc.label}
                  </div>
                  {(!recentData[rc.key] || recentData[rc.key].length === 0) && (
                    <span style={{ color: "#aaa", fontSize: ".99rem" }}>Nenhum registro recente.</span>
                  )}
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {recentData[rc.key]?.map((item: any) => (
                      <li key={item.id} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "3px 0"
                      }}>
                        <Activity size={15} color="#219ebc" />
                        <span style={{ fontWeight: 700, color: "#023047" }}>
                          {item[rc.mainField] || item.email || "—"}
                        </span>
                        {rc.email && item.email && (
                          <span style={{ color: "#64748b", fontSize: ".93rem" }}>({item.email})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {/* Avisos */}
            <div style={{
              background: "#fff", borderRadius: 22, boxShadow: "0 8px 32px #0001", padding: "22px 24px"
            }}>
              <div style={{ fontWeight: 900, color: "#14b8a6", fontSize: "1.09rem", marginBottom: 13 }}>
                Avisos Inteligentes para Administrador
              </div>
              <ul style={{ color: "#495668", fontSize: "1.01rem", lineHeight: 1.65, marginLeft: 12 }}>
                <li>✔️ Mantenha cadastros sempre atualizados.</li>
                <li>✔️ Gerencie leads com atenção especial.</li>
                <li>✔️ Responda às mensagens e sugestões de usuários.</li>
                <li>✔️ Monitore parceiros e avaliações para garantir reputação da plataforma.</li>
                <li>✔️ Use os gráficos para insights e decisões estratégicas.</li>
                <li>✔️ Não esqueça de conferir notificações, blog e transações!</li>
              </ul>
            </div>
          </div>
        </div>
        {/* RODAPÉ */}
        <footer style={{
          marginTop: 45, paddingTop: 32, borderTop: "1.7px solid #e5e7eb",
          textAlign: "center", fontSize: 16, color: "#6c7780", letterSpacing: ".01em"
        }}>
          © {new Date().getFullYear()} Pedraum Brasil · Painel Administrativo Premium.
        </footer>
      </section>
      {/* ESTILO GLOBAL CARDS */}
      <style>{`
        .admin-card:hover { box-shadow: 0 12px 42px #0002 !important; }
        @media (max-width: 1000px) {
          section { padding: 0 1vw !important; }
          .admin-card { min-width: 94vw !important; }
        }
        @media (max-width: 700px) {
          .admin-card { min-width: 98vw !important; }
        }
      `}</style>
    </main>
  );
}

// --- GERADOR DE BOTÃO RÁPIDO ---
function quickBtn(bg: string, color: string) {
  return {
    background: bg, color, borderRadius: 14, fontWeight: 900,
    fontSize: ".99rem", padding: "14px 23px", textDecoration: "none",
    boxShadow: "0 2px 9px #0001", transition: "background .16s",
    display: "inline-block"
  };
}
