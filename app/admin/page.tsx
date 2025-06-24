"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import {
  Users, Layers, Briefcase, ClipboardList, Star, Wallet2, BookOpen,
  MessageCircle, Newspaper, ListChecks, PlusCircle, Inbox
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { withRoleProtection } from "@/utils/withRoleProtection";

// Cores premium alinhadas ao header
const COLORS = ["#FB8500", "#2563eb", "#219ebc", "#023047", "#00b4d8", "#ffc300"];

const CARDS = [
  { label: "Usuários", icon: Users, key: "usuarios", link: "/admin/usuarios", color: "#2563eb" },
  { label: "Máquinas", icon: Layers, key: "maquinas", link: "/admin/machines", color: "#FB8500" },
  { label: "Serviços", icon: Briefcase, key: "servicos", link: "/admin/services", color: "#219ebc" },
  { label: "Demandas", icon: ClipboardList, key: "demandas", link: "/admin/demandas", color: "#023047" },
  { label: "Leads", icon: ListChecks, key: "leads", link: "/admin/leads", color: "#00b4d8" },
  { label: "Blog", icon: Newspaper, key: "blog", link: "/admin/blog", color: "#ffc300" },
  { label: "Avaliações", icon: Star, key: "avaliacoes", link: "/admin/avaliacoes", color: "#ecb007" },
  { label: "Transações", icon: Wallet2, key: "transacoes", link: "/admin/transacoes", color: "#4dd599" },
  { label: "Mensagens", icon: MessageCircle, key: "mensagens", link: "/admin/mensagens", color: "#8a3ffc" }
];

export default withRoleProtection(function AdminDashboardPage() {
  const [stats, setStats] = useState({
    usuarios: 0, maquinas: 0, servicos: 0, demandas: 0, leads: 0,
    blog: 0, avaliacoes: 0, transacoes: 0, mensagens: 0
  });

  useEffect(() => {
    async function fetchAll() {
      const s = {};
      for (const card of CARDS) {
        try {
          const snap = await getDocs(collection(db, card.key));
          s[card.key] = snap.size;
        } catch {
          s[card.key] = 0;
        }
      }
      setStats(s as typeof stats);
    }
    fetchAll();
  }, []);

  const pieData = CARDS.map((c) => ({ name: c.label, value: stats[c.key] }));

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <section style={{ maxWidth: 1380, margin: "0 auto", padding: "46px 2vw 0 2vw" }}>
        {/* Título & Ações */}
        <div style={{
          marginBottom: 44,
          display: "flex", flexDirection: "column", gap: 18,
          alignItems: "flex-start",
        }}>
          <h1 style={{
            fontSize: "2.3rem", fontWeight: 900, color: "#023047", letterSpacing: "-1.2px"
          }}>
            Painel Administrativo
          </h1>
          <span style={{ fontSize: "1.14rem", color: "#6b7680", marginTop: -12 }}>
            Gerencie <b>todos os dados</b> e cadastros do Pedraum visualmente, rápido e fácil.
          </span>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 4 }}>
            <Link href="/create-machine" className="action-btn orange">
              <PlusCircle size={19} /> Nova Máquina
            </Link>
            <Link href="/admin/blog/create" className="action-btn blue">
              <PlusCircle size={19} /> Novo Post Blog
            </Link>
            <Link href="/admin/leads" className="action-btn dark">
              <Inbox size={17} /> Todos os Leads
            </Link>
          </div>
        </div>

        {/* Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "32px",
          marginBottom: 54,
        }}>
          {CARDS.map((card, idx) => (
            <Link href={card.link} key={card.key} className="admin-card">
              <div style={{
                background: "#fff",
                border: "1.5px solid #e5e7eb",
                borderRadius: 22,
                boxShadow: "0 8px 40px #0001, 0 2px 8px #0001",
                padding: "32px 12px 24px 12px",
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 8,
                transition: "box-shadow .16s, transform .13s",
                cursor: "pointer"
              }} className="hover:shadow-xl hover:scale-[1.04] transition">
                <card.icon size={44} style={{ color: card.color, marginBottom: 10 }} />
                <span style={{ fontWeight: 700, fontSize: "1.11rem", color: "#023047" }}>
                  {card.label}
                </span>
                <span style={{ fontSize: "2.3rem", fontWeight: 900, color: card.color, marginTop: 3 }}>
                  {stats[card.key] ?? 0}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Gráfico */}
        <div style={{
          background: "#fff",
          border: "1.5px solid #e5e7eb",
          borderRadius: 22,
          boxShadow: "0 8px 36px #0001",
          padding: "32px 8vw 36px 8vw",
          margin: "0 auto 56px auto",
          maxWidth: 600,
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <h2 style={{ fontWeight: 800, fontSize: "1.24rem", color: "#023047", marginBottom: 16 }}>
            Distribuição de Cadastros
          </h2>
          <div style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%" outerRadius={95}
                  fill="#FB8500"
                  label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}
                  style={{ fontWeight: 700, fontSize: "1.01rem" }}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Avisos & Atalhos */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 28,
          marginBottom: 56
        }}>
          <div style={{
            background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 22,
            boxShadow: "0 8px 32px #0001", padding: "32px 28px"
          }}>
            <div style={{ fontWeight: 700, color: "#2563eb", fontSize: "1.13rem", marginBottom: 15 }}>
              Avisos & Dicas
            </div>
            <ul style={{ color: "#495668", fontSize: "1rem", lineHeight: 1.65 }}>
              <li>✔️ Novo painel premium para admins.</li>
              <li>✔️ Cadastros agora com análise gráfica em tempo real.</li>
              <li>✔️ Acesse leads, blog, máquinas e muito mais direto do painel.</li>
            </ul>
          </div>
          <div style={{
            background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 22,
            boxShadow: "0 8px 32px #0001", padding: "32px 28px"
          }}>
            <div style={{ fontWeight: 700, color: "#FB8500", fontSize: "1.13rem", marginBottom: 13 }}>
              Atalhos Rápidos
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Link href="/create-machine" className="admin-shortcut blue">+ Máquina</Link>
              <Link href="/create-service" className="admin-shortcut orange">+ Serviço</Link>
              <Link href="/admin/blog/create" className="admin-shortcut green">+ Post Blog</Link>
              <Link href="/admin/leads" className="admin-shortcut dark">Ver Leads</Link>
            </div>
          </div>
        </div>
      </section>
      {/* Rodapé */}
      <footer style={{
        marginTop: 36, paddingTop: 28, borderTop: "1.5px solid #e5e7eb",
        textAlign: "center", fontSize: 15, color: "#6c7780"
      }}>
        © {new Date().getFullYear()} Pedraum Brasil · Dashboard Premium para Mineração e Britagem.
      </footer>
      {/* CSS das ações e atalhos */}
      <style>{`
        .action-btn {
          display: inline-flex;
          align-items: center;
          font-weight: 700;
          font-size: 1rem;
          border-radius: 15px;
          padding: 11px 25px;
          box-shadow: 0 4px 14px #0001;
          border: none;
          outline: none;
          gap: 8px;
          letter-spacing: .01em;
          transition: background .14s, transform .13s;
          cursor: pointer;
          margin-right: 4px;
        }
        .action-btn.orange {
          background: #FB8500;
          color: #fff;
        }
        .action-btn.blue {
          background: #2563eb;
          color: #fff;
        }
        .action-btn.dark {
          background: #023047;
          color: #fff;
        }
        .action-btn:hover {
          transform: translateY(-1px) scale(1.04);
          opacity: .95;
        }
        .admin-shortcut {
          display: inline-block;
          font-weight: 700;
          padding: 8px 18px;
          border-radius: 13px;
          font-size: .99rem;
          background: #f5f7fa;
          color: #023047;
          transition: background .14s, color .12s;
          box-shadow: 0 2px 8px #0001;
        }
        .admin-shortcut.blue { background: #e8f0fe; color: #2563eb; }
        .admin-shortcut.orange { background: #fff3e0; color: #FB8500; }
        .admin-shortcut.green { background: #e8fbe8; color: #219e7a; }
        .admin-shortcut.dark { background: #e0eaf6; color: #023047; }
        .admin-shortcut:hover { background: #ececec; color: #023047; }
        @media (max-width: 780px) {
          section {
            padding: 28px 2vw 0 2vw !important;
          }
        }
      `}</style>
    </main>
  );
}, { allowed: ["admin"] });
