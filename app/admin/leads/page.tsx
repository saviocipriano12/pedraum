"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Trash2, Pencil } from "lucide-react";

type Lead = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  machineNome?: string;
  status?: string;
  valorLead?: number;
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeads() {
      const snap = await getDocs(collection(db, "leads"));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lead[];
      setLeads(list);
      setLoading(false);
    }
    fetchLeads();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este lead?")) return;
    await deleteDoc(doc(db, "leads", id));
    setLeads(leads => leads.filter(l => l.id !== id));
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f9fafb",
      padding: "40px 0"
    }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", background: "#fff", borderRadius: 18, boxShadow: "0 2px 14px #0001", padding: "36px 18px 24px 18px" }}>
        <h2 style={{
          fontWeight: 900,
          fontSize: "2rem",
          color: "#134074",
          letterSpacing: "-1px",
          marginBottom: 25,
          display: "flex",
          alignItems: "center",
          gap: 10
        }}>
          <span style={{ fontSize: 28 }}>📋</span>
          Leads Capturados
        </h2>
        {/* DESKTOP TABLE */}
        <div className="table-wrapper">
          <table className="leads-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Máquina</th>
                <th>Status</th>
                <th>Valor</th>
                <th style={{ textAlign: "center" }}>Ações</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 30, color: "#219EBC", fontWeight: 700 }}>Carregando...</td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "#555", padding: 30 }}>Nenhum lead encontrado.</td>
                </tr>
              ) : leads.map(l => (
                <tr key={l.id}>
                  <td>{l.nome}</td>
                  <td>{l.email}</td>
                  <td>{l.telefone}</td>
                  <td>{l.machineNome || "-"}</td>
                  <td>{l.status || "-"}</td>
                  <td>
                    {l.valorLead ? <>R$ <span style={{ fontWeight: 700 }}>{Number(l.valorLead).toLocaleString("pt-BR")}</span></> : "-"}
                  </td>
                  <td style={{ minWidth: 110, textAlign: "center" }}>
                    <Link href={`/admin/leads/${l.id}/edit`} legacyBehavior>
                      <a
                        title="Editar"
                        style={{
                          color: "#219EBC",
                          fontWeight: 700,
                          fontSize: 15,
                          marginRight: 7,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          borderRadius: 8,
                          padding: "2px 8px",
                          background: "#e0f2fe",
                          transition: "background .15s"
                        }}>
                        <Pencil size={15} /> Editar
                      </a>
                    </Link>
                    <button
                      onClick={() => handleDelete(l.id)}
                      style={{
                        color: "#dc2626",
                        fontWeight: 700,
                        fontSize: 15,
                        marginLeft: 2,
                        border: "none",
                        background: "#fee2e2",
                        borderRadius: 8,
                        padding: "2px 8px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        transition: "background .15s"
                      }}>
                      <Trash2 size={15} /> Excluir
                    </button>
                  </td>
                  <td style={{ fontSize: 13, color: "#999", wordBreak: "break-all" }}>{l.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD LIST */}
        <div className="mobile-leads-list">
          {loading ? (
            <div className="mobile-lead-card">Carregando...</div>
          ) : leads.length === 0 ? (
            <div className="mobile-lead-card">Nenhum lead encontrado.</div>
          ) : leads.map(l => (
            <div className="mobile-lead-card" key={l.id}>
              <b style={{ fontSize: 17, color: "#023047" }}>{l.nome}</b>
              <div style={{ fontSize: 13, margin: "6px 0 2px 0" }}>{l.email}</div>
              <div style={{ fontSize: 13, color: "#1a2233" }}>Tel: {l.telefone}</div>
              <div style={{ fontSize: 14, marginTop: 3 }}>Máquina: <span style={{ fontWeight: 700 }}>{l.machineNome || "-"}</span></div>
              <div style={{ fontSize: 14, marginTop: 3 }}>Status: <span style={{ fontWeight: 700 }}>{l.status || "-"}</span></div>
              <div style={{ fontSize: 14, marginTop: 3 }}>Valor: {l.valorLead ? <>R$ <b>{Number(l.valorLead).toLocaleString("pt-BR")}</b></> : "-"}</div>
              <div style={{ fontSize: 12, margin: "8px 0", color: "#999" }}>ID: {l.id}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <Link href={`/admin/leads/${l.id}/edit`} legacyBehavior>
                  <a style={{
                    color: "#219EBC", fontWeight: 700, fontSize: 14,
                    background: "#e0f2fe", borderRadius: 8, padding: "5px 10px",
                    textDecoration: "none", display: "flex", alignItems: "center", gap: 5
                  }}>
                    <Pencil size={15} /> Editar
                  </a>
                </Link>
                <button
                  onClick={() => handleDelete(l.id)}
                  style={{
                    color: "#dc2626", fontWeight: 700, fontSize: 14,
                    background: "#fee2e2", border: "none", borderRadius: 8, padding: "5px 10px",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 5
                  }}>
                  <Trash2 size={15} /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ESTILOS RESPONSIVOS */}
      <style>{`
        .leads-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 1.04rem;
        }
        .leads-table th, .leads-table td {
          border-bottom: 1.5px solid #e5e7eb;
          padding: 13px 7px;
          text-align: left;
        }
        .leads-table th {
          background: #f9fafb;
          color: #2563eb;
          font-weight: 700;
        }
        .leads-table tbody tr:last-child td {
          border-bottom: none;
        }
        .table-wrapper { display: block; }
        .mobile-leads-list { display: none; }

        @media (max-width: 900px) {
          .table-wrapper { display: none; }
          .mobile-leads-list {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .mobile-lead-card {
            background: #fff;
            border-radius: 14px;
            box-shadow: 0 2px 14px #0001;
            padding: 18px 16px 13px 16px;
            margin-bottom: 5px;
            font-size: 15px;
            word-break: break-word;
            border-left: 7px solid #2563eb12;
          }
        }
      `}</style>
    </main>
  );
}
