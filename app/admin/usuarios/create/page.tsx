// =============================
// app/admin/usuarios/create/page.tsx — Criar Novo Usuário (ADMIN)
// =============================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { Users, Loader2 } from "lucide-react";
import { withRoleProtection } from "@/utils/withRoleProtection";

function CriarUsuarioAdmin() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [tipo, setTipo] = useState("comprador");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      // Cria usuário no Firebase Authentication
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      const uid = cred.user.uid;
      // Cria documento no Firestore
      await addDoc(collection(db, "usuarios"), {
        nome,
        email,
        tipo,
        status: "ativo",
        createdAt: new Date(),
        uid,
      });
      router.push("/admin/usuarios");
    } catch (err: any) {
      setErro(err.message || "Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f9fa] flex flex-col items-center py-8 px-2">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-5">
          <Users size={32} className="text-[#023047]" />
          <h1 className="text-2xl font-bold text-[#023047]">Novo Usuário</h1>
        </div>
        <form onSubmit={handleCriar} className="space-y-5">
          <div>
            <label className="block font-semibold text-[#023047] mb-1">Nome</label>
            <input type="text" required className="input" value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold text-[#023047] mb-1">E-mail</label>
            <input type="email" required className="input" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold text-[#023047] mb-1">Senha</label>
            <input type="password" required minLength={6} className="input" value={senha} onChange={e => setSenha(e.target.value)} />
            <span className="text-xs text-gray-500">Mínimo de 6 caracteres</span>
          </div>
          <div>
            <label className="block font-semibold text-[#023047] mb-1">Tipo</label>
            <select className="input" value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="comprador">Comprador</option>
              <option value="vendedor">Vendedor</option>
              <option value="prestador">Prestador</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          {erro && <div className="text-red-600 bg-red-50 rounded p-2 text-sm">{erro}</div>}
          <div className="flex gap-2 mt-6">
            <button type="submit" disabled={loading} className="bg-[#FB8500] text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-[#ff9800]">
              {loading ? <Loader2 className="animate-spin" size={20} /> : null}
              {loading ? "Salvando..." : "Salvar"}
            </button>
            <Link href="/admin/usuarios" className="ml-2 bg-gray-200 text-gray-600 px-8 py-3 rounded-full font-bold hover:bg-gray-300">Cancelar</Link>
          </div>
        </form>
      </div>
    </main>
  );
}

export default withRoleProtection(CriarUsuarioAdmin, { allowed: ["admin"] });
