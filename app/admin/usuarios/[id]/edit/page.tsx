"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Loader, ArrowLeft, Save, Key, EyeOff, Eye } from "lucide-react";
import Link from "next/link";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  whatsapp?: string;
  cidade?: string;
  estado?: string;
  cpfCnpj?: string;
  tipo?: "admin" | "usuario";
  status?: "Ativo" | "Inativo" | "Bloqueado";
  createdAt?: any;
  lastLogin?: any;
};

export default function EditUsuarioPage() {
  const router = useRouter();
  const params = useParams();
  const userId = typeof params?.id === "string" ? params.id : (params?.id as string[])[0];

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Modal reset senha
  const [showResetModal, setShowResetModal] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [novaSenha2, setNovaSenha2] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      if (!userId) return;
      setLoading(true);
      const ref = doc(db, "usuarios", userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setUsuario({ id: snap.id, ...snap.data() } as Usuario);
      } else {
        setUsuario(null);
      }
      setLoading(false);
    }
    fetchUser();
  }, [userId]);

  async function handleSave(e: any) {
    e.preventDefault();
    if (!usuario) return;
    setSalvando(true);
    try {
      const ref = doc(db, "usuarios", usuario.id);
      await updateDoc(ref, {
        nome: usuario.nome,
        email: usuario.email,
        whatsapp: usuario.whatsapp || "",
        cidade: usuario.cidade || "",
        estado: usuario.estado || "",
        cpfCnpj: usuario.cpfCnpj || "",
        tipo: usuario.tipo,
        status: usuario.status,
      });
      alert("Usuário atualizado com sucesso!");
      router.push("/admin/usuarios");
    } catch (e) {
      alert("Erro ao salvar!");
    }
    setSalvando(false);
  }

  async function handleResetSenha(e: any) {
    e.preventDefault();
    if (!novaSenha || novaSenha.length < 6) {
      alert("A senha deve ter pelo menos 6 dígitos.");
      return;
    }
    if (novaSenha !== novaSenha2) {
      alert("As senhas não coincidem.");
      return;
    }
    setResetLoading(true);
    try {
      // Chama a rota da API que faz o reset da senha no Firebase Admin SDK
      const res = await fetch("/api/admin-reset-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: userId, senha: novaSenha }),
      });
      if (!res.ok) throw new Error("Erro ao redefinir senha");
      setShowResetModal(false);
      setNovaSenha("");
      setNovaSenha2("");
      alert("Senha redefinida com sucesso!");
    } catch (e) {
      alert("Erro ao redefinir senha.");
    }
    setResetLoading(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" }}>
        <Loader className="animate-spin" size={28} /> Carregando usuário...
      </div>
    );
  }
  if (!usuario) {
    return (
      <div style={{ minHeight: 300, textAlign: "center", color: "#d90429" }}>
        Usuário não encontrado.
        <br />
        <Link href="/admin/usuarios" style={{ color: "#2563eb", fontWeight: 800, fontSize: 18 }}>Voltar para lista</Link>
      </div>
    );
  }

  return (
    <section style={{ maxWidth: 540, margin: "0 auto", padding: "42px 2vw 60px 2vw" }}>
      <Link href="/admin/usuarios" style={{ display: "flex", alignItems: "center", marginBottom: 24, color: "#2563eb", fontWeight: 700, fontSize: 16, textDecoration: "none" }}>
        <ArrowLeft size={19} /> Voltar
      </Link>
      <div style={{
        background: "#fff", borderRadius: 18, boxShadow: "0 2px 16px #0001",
        padding: "38px 32px", marginBottom: 30
      }}>
        <h2 style={{ fontWeight: 900, fontSize: "2rem", color: "#023047", marginBottom: 15 }}>Editar Usuário</h2>
        <div style={{ marginBottom: 17, fontSize: 13, color: "#adb0b6" }}>
          <div>
            <b>ID:</b> {usuario.id}
          </div>
          <div>
            <b>Cadastro:</b>{" "}
            {usuario.createdAt?.seconds
              ? new Date(usuario.createdAt.seconds * 1000).toLocaleString("pt-BR")
              : "-"}
          </div>
          <div>
            <b>Último login:</b>{" "}
            {usuario.lastLogin?.seconds
              ? new Date(usuario.lastLogin.seconds * 1000).toLocaleString("pt-BR")
              : "-"}
          </div>
        </div>

        <form onSubmit={handleSave}>
          <label style={labelStyle}>Nome</label>
          <input
            type="text"
            value={usuario.nome}
            onChange={e => setUsuario(u => u ? { ...u, nome: e.target.value } : u)}
            required
            style={inputStyle}
          />
          <label style={labelStyle}>E-mail</label>
          <input
            type="email"
            value={usuario.email}
            onChange={e => setUsuario(u => u ? { ...u, email: e.target.value } : u)}
            required
            style={inputStyle}
          />
          <label style={labelStyle}>WhatsApp</label>
          <input
            type="text"
            value={usuario.whatsapp || ""}
            onChange={e => setUsuario(u => u ? { ...u, whatsapp: e.target.value } : u)}
            placeholder="(99) 99999-9999"
            style={inputStyle}
          />
          <label style={labelStyle}>Cidade</label>
          <input
            type="text"
            value={usuario.cidade || ""}
            onChange={e => setUsuario(u => u ? { ...u, cidade: e.target.value } : u)}
            style={inputStyle}
          />
          <label style={labelStyle}>Estado</label>
          <input
            type="text"
            value={usuario.estado || ""}
            onChange={e => setUsuario(u => u ? { ...u, estado: e.target.value } : u)}
            style={inputStyle}
          />
          <label style={labelStyle}>CPF ou CNPJ</label>
          <input
            type="text"
            value={usuario.cpfCnpj || ""}
            onChange={e => setUsuario(u => u ? { ...u, cpfCnpj: e.target.value } : u)}
            placeholder="Somente números"
            style={inputStyle}
          />
          <label style={labelStyle}>Tipo</label>
          <select
            value={usuario.tipo || ""}
            onChange={e => setUsuario(u => u ? { ...u, tipo: e.target.value as "admin" | "usuario" } : u)}
            style={inputStyle}
          >
            <option value="usuario">Usuário</option>
            <option value="admin">Admin</option>
          </select>
          <label style={labelStyle}>Status</label>
          <select
            value={usuario.status || ""}
            onChange={e => setUsuario(u => u ? { ...u, status: e.target.value as "Ativo" | "Inativo" | "Bloqueado" } : u)}
            style={inputStyle}
          >
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
            <option value="Bloqueado">Bloqueado</option>
          </select>

          {/* Botão de Resetar Senha (modal) */}
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 10, background: "#fff7ea", color: "#fb8500", border: "1px solid #ffeccc",
              fontWeight: 700, fontSize: "1.09rem", padding: "11px 0", borderRadius: 12,
              textDecoration: "none", margin: "24px 0 7px 0", width: "100%", cursor: "pointer"
            }}
          >
            <Key size={18} /> Redefinir Senha
          </button>

          <button
            type="submit"
            disabled={salvando}
            style={{
              marginTop: 16, width: "100%", background: "#2563eb", color: "#fff", fontWeight: 900,
              fontSize: "1.18rem", padding: "13px 0", borderRadius: 13, border: "none",
              boxShadow: "0 2px 14px #0001", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12
            }}
          >
            <Save size={21} /> {salvando ? "Salvando..." : "Salvar Alterações"}
          </button>
        </form>
      </div>

      {/* Modal de redefinir senha */}
      {showResetModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "#0006", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: "34px 24px 20px 24px",
            minWidth: 320, boxShadow: "0 2px 32px #0003", maxWidth: "92vw"
          }}>
            <h3 style={{ fontWeight: 900, color: "#FB8500", fontSize: 23, marginBottom: 16 }}>Redefinir Senha</h3>
            <form onSubmit={handleResetSenha}>
              <label style={labelStyle}>Nova Senha</label>
              <div style={{ position: "relative" }}>
                <input
                  type={senhaVisivel ? "text" : "password"}
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 40 }}
                  minLength={6}
                  autoFocus
                />
                <span
                  onClick={() => setSenhaVisivel(v => !v)}
                  style={{
                    position: "absolute", top: 9, right: 14, cursor: "pointer",
                    color: "#bbb", background: "#fff"
                  }}>
                  {senhaVisivel ? <EyeOff size={20} /> : <Eye size={20} />}
                </span>
              </div>
              <label style={labelStyle}>Confirmar Senha</label>
              <input
                type={senhaVisivel ? "text" : "password"}
                value={novaSenha2}
                onChange={e => setNovaSenha2(e.target.value)}
                style={inputStyle}
                minLength={6}
              />
              <div style={{ display: "flex", gap: 12, marginTop: 21 }}>
                <button
                  type="button"
                  onClick={() => { setShowResetModal(false); setNovaSenha(""); setNovaSenha2(""); }}
                  style={{
                    flex: 1, background: "#f9f9f9", color: "#888", border: "1.5px solid #eee", fontWeight: 700,
                    fontSize: "1.01rem", padding: "11px 0", borderRadius: 9, cursor: "pointer"
                  }}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  style={{
                    flex: 1, background: "#FB8500", color: "#fff", border: "none", fontWeight: 800,
                    fontSize: "1.1rem", padding: "11px 0", borderRadius: 9, cursor: "pointer"
                  }}>
                  {resetLoading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

const labelStyle: React.CSSProperties = {
  fontWeight: 800, fontSize: 15, color: "#2563eb", marginBottom: 7, marginTop: 18, display: "block"
};

const inputStyle: React.CSSProperties = {
  width: "100%", marginTop: 6, padding: "12px 13px", borderRadius: 9,
  border: "1.5px solid #e5e7eb", fontSize: 16, color: "#023047",
  background: "#f8fafc", fontWeight: 600, outline: "none", marginBottom: 3
};
