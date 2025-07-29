"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Pencil, Trash2, UserCheck, UserX, User, PlusCircle, Search, Lock, ClipboardCopy } from "lucide-react";
import { withRoleProtection } from "@/utils/withRoleProtection";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  tipo?: "admin" | "usuario";
  status?: "Ativo" | "Inativo" | "Bloqueado";
  createdAt?: any;
  lastLogin?: any;
};

function ListaUsuariosAdmin() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsuarios() {
      setLoading(true);
      const snap = await getDocs(collection(db, "usuarios"));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Usuario));
      setUsuarios(data);
      setLoading(false);
    }
    fetchUsuarios();
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm("Deseja realmente excluir este usuário?")) return;
    await deleteDoc(doc(db, "usuarios", id));
    setUsuarios(usuarios => usuarios.filter(u => u.id !== id));
  }

  async function handleStatus(id: string, status: "Ativo" | "Bloqueado") {
    await updateDoc(doc(db, "usuarios", id), { status });
    setUsuarios(users =>
      users.map(u => u.id === id ? { ...u, status } : u)
    );
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  // Filtros poderosos
  const usuariosFiltrados = usuarios.filter(u =>
    (!busca || u.nome?.toLowerCase().includes(busca.toLowerCase()) || u.email?.toLowerCase().includes(busca.toLowerCase())) &&
    (!filtroTipo || u.tipo === filtroTipo) &&
    (!filtroStatus || u.status === filtroStatus)
  );

  // Resumo
  const total = usuarios.length;
  const admins = usuarios.filter(u => u.tipo === "admin").length;
  const bloqueados = usuarios.filter(u => u.status === "Bloqueado").length;

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", padding: "46px 0 30px 0" }}>
      <section style={{ maxWidth: 1380, margin: "0 auto", padding: "0 2vw" }}>
        {/* --- Header e Resumo --- */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 28 }}>
          <h1 style={{ fontWeight: 900, fontSize: "2.3rem", color: "#023047", margin: 0, letterSpacing: "-1px" }}>Gestão de Usuários</h1>
          <Link href="/admin/usuarios/create" style={{
            background: "#FB8500", color: "#fff", borderRadius: 16, fontWeight: 800, fontSize: "1.1rem",
            padding: "13px 33px", textDecoration: "none", boxShadow: "0 2px 12px #0001"
          }}>
            <PlusCircle size={20} style={{ marginRight: 7 }} /> Novo Usuário
          </Link>
        </div>

        {/* Cards resumo */}
        <div style={{ display: "flex", gap: 12, marginBottom: 30, flexWrap: "wrap" }}>
          <ResumoCard label="Usuários" value={total} icon={<User size={20} />} color="#2563eb" />
          <ResumoCard label="Admins" value={admins} icon={<UserCheck size={20} />} color="#059669" />
          <ResumoCard label="Bloqueados" value={bloqueados} icon={<UserX size={20} />} color="#D90429" />
        </div>

        {/* Busca e Filtros */}
        <div style={{ display: "flex", gap: 8, marginBottom: 30, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", top: 9, left: 10, color: "#a0a0a0" }} />
            <input
              style={{
                padding: "8px 8px 8px 35px", borderRadius: 11, border: "1px solid #e0e7ef",
                minWidth: 210, fontSize: 15, fontWeight: 600, color: "#023047"
              }}
              placeholder="Buscar nome/email..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            style={{
              borderRadius: 10, border: "1px solid #e0e7ef", fontWeight: 700, color: "#2563eb", padding: "8px 13px"
            }}
          >
            <option value="">Todos Tipos</option>
            <option value="admin">Admin</option>
            <option value="usuario">Usuário</option>
          </select>
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            style={{
              borderRadius: 10, border: "1px solid #e0e7ef", fontWeight: 700, color: "#FB8500", padding: "8px 13px"
            }}
          >
            <option value="">Todos Status</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
            <option value="Bloqueado">Bloqueado</option>
          </select>
        </div>

        {/* Lista de Usuários */}
        {loading ? (
          <div style={{ color: "#219EBC", fontWeight: 700, padding: 44, textAlign: "center" }}>Carregando usuários...</div>
        ) : usuariosFiltrados.length === 0 ? (
          <div style={{ color: "#adb0b6", fontWeight: 600, padding: 44, textAlign: "center" }}>Nenhum usuário encontrado.</div>
        ) : (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 28, marginBottom: 28
          }}>
            {usuariosFiltrados.map(u => (
              <div key={u.id} style={{
                background: "#fff", borderRadius: 17, boxShadow: "0 2px 20px #0001",
                padding: "25px 26px 22px 26px", display: "flex", flexDirection: "column",
                gap: 10, position: "relative", minHeight: 180
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: "linear-gradient(135deg, #FB8500 60%, #2563eb 120%)",
                    color: "#fff", fontWeight: 900, fontSize: 24,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 10px #0001"
                  }}>
                    {u.nome ? u.nome.charAt(0).toUpperCase() : <User size={30} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "1.17rem", color: "#023047" }}>{u.nome}</div>
                    <div style={{ color: "#219ebc", fontWeight: 700, fontSize: 15 }}>
                      {u.email}
                      <span title="Copiar e-mail">
  <ClipboardCopy
    size={16}
    onClick={() => copyToClipboard(u.email)}
    style={{ marginLeft: 7, cursor: "pointer", color: "#2563eb", verticalAlign: "middle" }}
  />
</span>
                    </div>
                    <div style={{ color: "#b6b6b6", fontWeight: 500, fontSize: 13 }}>
                      {u.id}
                     <span title="Copiar ID">
  <ClipboardCopy
    size={15}
    onClick={() => copyToClipboard(u.id)}
    style={{ marginLeft: 6, cursor: "pointer", color: "#219ebc" }}
  />
</span>

                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 4, display: "flex", gap: 10 }}>
                  <span style={{
                    borderRadius: 9, background: "#f3f7ff", color: "#2563eb", fontWeight: 800,
                    fontSize: ".97rem", padding: "4.5px 13px"
                  }}>{u.tipo?.toUpperCase() || "USUÁRIO"}</span>
                  <span style={{
                    borderRadius: 9, background: u.status === "Ativo" ? "#e7faec" : "#ffe6e6",
                    color: u.status === "Ativo" ? "#059669" : "#D90429",
                    fontWeight: 800, fontSize: ".97rem", padding: "4.5px 13px"
                  }}>{u.status}</span>
                </div>
                <div style={{ color: "#A0A0A0", fontSize: 13 }}>
                  {u.createdAt?.seconds &&
                    "Cadastro: " + new Date(u.createdAt.seconds * 1000).toLocaleDateString("pt-BR")
                  }
                  {u.lastLogin?.seconds &&
                    " | Último login: " + new Date(u.lastLogin.seconds * 1000).toLocaleDateString("pt-BR")
                  }
                </div>
                <div style={{ display: "flex", gap: 7, marginTop: 13 }}>
                  <Link
                    href={`/admin/usuarios/${u.id}/edit`}
                    style={{
                      background: "#e8f8fe", color: "#2563eb", border: "1px solid #e0ecff",
                      fontWeight: 700, fontSize: ".99rem", padding: "7px 17px", borderRadius: 9,
                      textDecoration: "none", display: "flex", alignItems: "center", gap: 4
                    }}
                  >
                    <Pencil size={16} /> Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(u.id)}
                    style={{
                      background: "#fff0f0", color: "#d90429", border: "1px solid #ffe5e5",
                      fontWeight: 700, fontSize: ".99rem", padding: "7px 13px", borderRadius: 9,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                    }}
                  >
                    <Trash2 size={16} /> Excluir
                  </button>
                  {u.status !== "Bloqueado" ? (
                    <button
                      onClick={() => handleStatus(u.id, "Bloqueado")}
                      style={{
                        background: "#f9fafb", color: "#d90429", border: "1px solid #ffdada",
                        fontWeight: 700, fontSize: ".99rem", padding: "7px 11px", borderRadius: 9,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                      }}
                      title="Bloquear usuário"
                    >
                      <Lock size={16} /> Bloquear
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatus(u.id, "Ativo")}
                      style={{
                        background: "#e7faec", color: "#059669", border: "1px solid #d0ffdd",
                        fontWeight: 700, fontSize: ".99rem", padding: "7px 11px", borderRadius: 9,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                      }}
                      title="Desbloquear usuário"
                    >
                      <UserCheck size={16} /> Ativar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// --- Card de Resumo (topo)
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

export default withRoleProtection(ListaUsuariosAdmin, { allowed: ["admin"] });
