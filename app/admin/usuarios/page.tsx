"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { Pencil, Trash2, PlusCircle } from "lucide-react";
import { withRoleProtection } from "@/utils/withRoleProtection";

function ListaUsuariosAdmin() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsuarios() {
      setLoading(true);
      const snap = await getDocs(collection(db, "usuarios"));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsuarios(data);
      setLoading(false);
    }
    fetchUsuarios();
  }, []);

  return (
    <main className="min-h-screen bg-[#f9fafb] py-8 px-1 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header e botão */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#023047] tracking-tight">
            Usuários Cadastrados
          </h1>
          <Link
            href="/admin/usuarios/create"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FB8500] text-white font-bold shadow hover:bg-orange-600 transition-all text-base"
            style={{ minWidth: 160, justifyContent: "center" }}
          >
            <PlusCircle size={20} /> Novo Usuário
          </Link>
        </div>

        {/* Card da tabela */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#e0e7ef] overflow-x-auto">
          <table className="min-w-full divide-y divide-[#e5e7eb] text-[#023047]">
            <thead className="bg-[#f7fafc]">
              <tr>
                <th className="px-5 py-3 font-bold text-left whitespace-nowrap">Nome</th>
                <th className="px-5 py-3 font-bold text-left whitespace-nowrap">E-mail</th>
                <th className="px-5 py-3 font-bold text-center whitespace-nowrap">Tipo</th>
                <th className="px-5 py-3 font-bold text-center whitespace-nowrap">Status</th>
                <th className="px-5 py-3 font-bold text-center whitespace-nowrap">Ações</th>
                <th className="px-5 py-3 font-bold text-left text-xs whitespace-nowrap">ID</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 font-bold">
                    Carregando usuários...
                  </td>
                </tr>
              )}
              {!loading && usuarios.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 font-bold">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
              {usuarios.map((u, i) => (
                <tr
                  key={u.id}
                  className="border-b last:border-none hover:bg-[#f9fafc] transition"
                >
                  <td className="px-5 py-4 font-semibold">{u.nome}</td>
                  <td className="px-5 py-4">{u.email}</td>
                  <td className="px-5 py-4 text-center">
                    <span className="inline-block rounded-lg bg-blue-100 text-blue-700 px-2 py-1 text-xs font-bold uppercase">
                      {u.tipo}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={
                      u.status === "Ativo"
                        ? "inline-block rounded-lg bg-green-100 text-green-700 px-2 py-1 text-xs font-bold"
                        : "inline-block rounded-lg bg-gray-200 text-gray-500 px-2 py-1 text-xs font-bold"
                    }>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex flex-row gap-1 justify-center">
                      <Link
                        href={`/admin/usuarios/${u.id}`}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-sm shadow-sm transition"
                        title="Editar usuário"
                      >
                        <Pencil size={16} /> Editar
                      </Link>
                      <button
                        onClick={() => {/* Excluir usuário */}}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-semibold text-sm shadow-sm transition"
                        title="Excluir usuário"
                      >
                        <Trash2 size={16} /> Excluir
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400 break-all">{u.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Estilo responsivo extra para tabela */}
      <style>{`
        @media (max-width: 700px) {
          table th, table td { padding-left: 12px !important; padding-right: 12px !important; font-size: 0.95rem; }
          .bg-white { box-shadow: 0 1.5px 10px #0001 !important; }
          th, td { min-width: 80px; }
        }
        @media (max-width: 500px) {
          th, td { font-size: 0.86rem !important; padding: 8px 6px !important; }
          h1 { font-size: 1.3rem !important; }
          .flex-row { flex-direction: column !important; gap: 7px !important; }
        }
      `}</style>
    </main>
  );
}

export default withRoleProtection(ListaUsuariosAdmin, { allowed: ["admin"] });
