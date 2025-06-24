// =============================
// app/admin/usuarios/[id]/edit/page.tsx — Editar Usuário (ADMIN)
// =============================

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { Users, Loader2 } from "lucide-react";
import { withRoleProtection } from "@/utils/withRoleProtection";

function EditarUsuarioAdmin() {
  const router = useRouter();
  const params = useParams();
  const uid = params.id as string;

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState("comprador");
  const [status, setStatus] = useState("ativo");

  useEffect(() => {
    buscarUsuario();
    // eslint-disable-next-line
  }, [uid]);

  async function buscarUsuario() {
    setCarregando(true);
    setErro("");
    try {
      const userDoc = await getDoc(doc(db, "usuarios", uid));
      if (!userDoc.exists()) {
        setErro("Usuário não encontrado!");
        return;
      }
      const u: any = userDoc.data();
      setNome(u.nome || "");
      setEmail(u.email || "");
      setTipo(u.tipo || "comprador");
      setStatus(u.status || "ativo");
    } catch (err: any) {
      setErro("Erro ao buscar usuário: " + (err.message || err));
    } finally {
      setCarregando(false);
    }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      await updateDoc(doc(db, "usuarios", uid), {
        nome,
        email,
        tipo,
        status,
      });
      router.push("/admin/usuarios");
    } catch (err: any) {
      setErro("Erro ao salvar: " + (err.message || err));
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f6f9fa]">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <Loader2 size={28} className="animate-spin text-[#FB8500]" /> Carregando usuário...
        </div>
      </main>
    );
  }

  if (erro) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f6f9fa]">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-red-600 font-semibold">{erro}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f9fa] flex flex-col items-center py-8 px-2">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-5">
          <Users size={32} className="text-[#023047]" />
          <h1 className="text-2xl font-bold text-[#023047]">Editar Usuário</h1>
        </div>
        <form onSubmit={handleSalvar} className="space-y-5">
          <div>
            <label className="block font-semibold text-[#023047] mb-1">Nome</label>
            <input type="text" required className="input" value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div>
            <label className="block font-semibold text-[#023047] mb-1">E-mail</label>
            <input type="email" required className="input" value={email} onChange={e => setEmail(e.target.value)} />
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
          <div>
            <label className="block font-semibold text-[#023047] mb-1">Status</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <div className="flex gap-2 mt-6">
            <button type="submit" disabled={salvando} className="bg-[#FB8500] text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-[#ff9800]">
              {salvando ? <Loader2 className="animate-spin" size={20} /> : null}
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <Link href="/admin/usuarios" className="ml-2 bg-gray-200 text-gray-600 px-8 py-3 rounded-full font-bold hover:bg-gray-300">Cancelar</Link>
          </div>
        </form>
      </div>
    </main>
  );
}

export default withRoleProtection(EditarUsuarioAdmin, { allowed: ["admin"] });
