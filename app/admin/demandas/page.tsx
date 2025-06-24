"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Pencil, Trash2 } from "lucide-react";
import { withRoleProtection } from "@/utils/withRoleProtection";

type Demanda = {
  id: string;
  titulo: string;
  categoria: string;
  criador: string;
  status: string;
  // Adicione outros campos conforme necessidade
};

function ListaDemandasAdmin() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDemandas() {
      const snap = await getDocs(collection(db, "demandas"));
      const lista = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Demanda[];
      setDemandas(lista);
      setLoading(false);
    }
    fetchDemandas();
  }, []);

  async function handleDelete(id: string) {
    if (confirm("Tem certeza que deseja excluir esta demanda?")) {
      await deleteDoc(doc(db, "demandas", id));
      setDemandas(demandas => demandas.filter(d => d.id !== id));
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", padding: "36px 0" }}>
      <div style={{
        maxWidth: 1400, margin: "0 auto", background: "#fff",
        borderRadius: 16, boxShadow: "0 2px 12px #0001",
        padding: "24px 20px 16px 20px"
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18
        }}>
          <h2 style={{
            fontWeight: 900, fontSize: "2rem", color: "#134074", letterSpacing: "-1px"
          }}>
            <span style={{ verticalAlign: "middle", marginRight: 9, color: "#FB8500" }}>🗂️</span>
            Demandas Publicadas
          </h2>
          <Link href="/admin/demandas/create" legacyBehavior>
            <a style={{
              background: "#FB8500",
              color: "#fff",
              fontWeight: 800,
              fontSize: ".99rem",
              padding: "9px 22px",
              borderRadius: "11px",
              textDecoration: "none",
              boxShadow: "0 2px 8px #FB850030",
              transition: "background .16s"
            }}>+ Nova Demanda</a>
          </Link>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%", borderCollapse: "collapse",
            background: "#fff", fontSize: "1.03rem"
          }}>
            <thead>
              <tr style={{
                background: "#f9fafb", color: "#2563eb", fontWeight: 700,
                borderBottom: "1.5px solid #e5e7eb"
              }}>
                <th style={thStyle}>Título</th>
                <th style={thStyle}>Categoria</th>
                <th style={thStyle}>Criador</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Ações</th>
                <th style={thStyle}>ID</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{
                    padding: "46px 0", textAlign: "center",
                    color: "#219EBC", fontWeight: 700
                  }}>Carregando demandas...</td>
                </tr>
              ) : demandas.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{
                    padding: "38px 0", textAlign: "center",
                    color: "#aaa", fontWeight: 600
                  }}>Nenhuma demanda encontrada.</td>
                </tr>
              ) : (
                demandas.map((d) => (
                  <tr key={d.id} style={{
                    borderBottom: "1px solid #eee", transition: ".14s",
                    background: "#fff"
                  }}>
                    <td style={tdStyle}>{d.titulo}</td>
                    <td style={tdStyle}>{d.categoria}</td>
                    <td style={tdStyle}>{d.criador}</td>
                    <td style={tdStyle}>{d.status}</td>
                    <td style={tdStyle}>
                      <Link href={`/admin/demandas/${d.id}/edit`} legacyBehavior>
                        <a style={{
                          marginRight: 12, color: "#2563eb", fontWeight: 700,
                          textDecoration: "none", verticalAlign: "middle"
                        }}>
                          <Pencil size={19} style={{ marginRight: 4, verticalAlign: "middle" }} />
                          Editar
                        </a>
                      </Link>
                      <button
                        onClick={() => handleDelete(d.id)}
                        style={{
                          color: "#dc2626",
                          background: "none",
                          border: "none",
                          fontWeight: 700,
                          cursor: "pointer",
                          verticalAlign: "middle"
                        }}>
                        <Trash2 size={18} style={{ marginRight: 3, verticalAlign: "middle" }} />
                        Excluir
                      </button>
                    </td>
                    <td style={{ ...tdStyle, fontSize: "0.98rem", color: "#aaa" }}>{d.id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Responsividade */}
      <style>{`
        @media (max-width: 800px) {
          table { font-size: 0.97rem }
          th, td { padding: 7px 5px !important }
        }
        @media (max-width: 600px) {
          .admin-table th, .admin-table td { padding: 6px 4px !important }
          h2 { font-size: 1.22rem !important }
        }
      `}</style>
    </main>
  );
}

const thStyle = {
  padding: "12px 9px",
  textAlign: "left" as const,
  borderBottom: "1.5px solid #e5e7eb",
  background: "#f8fafc"
};
const tdStyle = {
  padding: "11px 9px",
  color: "#23374d"
};

export default withRoleProtection(ListaDemandasAdmin, { allowed: ["admin"] });
