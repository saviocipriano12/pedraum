"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Link from "next/link";

type Lead = {
  nome: string;
  email: string;
  telefone: string;
  machineNome?: string;
  status?: string;
  valorLead?: number;
};

export default function EditLeadPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchLead() {
      if (!id) return;
      const ref = doc(db, "leads", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setLead(snap.data() as Lead);
      } else {
        setError("Lead não encontrado.");
      }
      setLoading(false);
    }
    fetchLead();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!lead) return;
    setSaving(true);
    setError("");
    try {
      await updateDoc(doc(db, "leads", id), { ...lead });
      router.push("/admin/leads");
    } catch (err) {
      setError("Erro ao salvar alterações.");
    } finally {
      setSaving(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setLead((prev: any) => ({
      ...prev,
      [name]: name === "valorLead" ? Number(value) : value,
    }));
  }

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: 100, color: "#219EBC" }}>Carregando dados...</div>;
  }

  if (error) {
    return <div style={{ color: "#dc2626", textAlign: "center", marginTop: 100 }}>{error}</div>;
  }

  if (!lead) return null;

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f9fafb",
      padding: "36px 0"
    }}>
      <div style={{
        maxWidth: 480, margin: "0 auto", background: "#fff",
        borderRadius: 16, boxShadow: "0 2px 12px #0001",
        padding: "32px 28px 22px 28px"
      }}>
        <h2 style={{
          fontWeight: 900,
          fontSize: "1.6rem",
          color: "#134074",
          letterSpacing: "-1px",
          marginBottom: 25,
          textAlign: "center"
        }}>
          Editar Lead
        </h2>
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nome</label>
            <input
              style={inputStyle}
              type="text"
              name="nome"
              value={lead.nome || ""}
              onChange={handleChange}
              required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>E-mail</label>
            <input
              style={inputStyle}
              type="email"
              name="email"
              value={lead.email || ""}
              onChange={handleChange}
              required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Telefone</label>
            <input
              style={inputStyle}
              type="tel"
              name="telefone"
              value={lead.telefone || ""}
              onChange={handleChange}
              required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Máquina</label>
            <input
              style={inputStyle}
              type="text"
              name="machineNome"
              value={lead.machineNome || ""}
              onChange={handleChange}
              placeholder="Ex: Pá Carregadeira"
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Status</label>
            <select
              style={inputStyle}
              name="status"
              value={lead.status || ""}
              onChange={handleChange}
            >
              <option value="">Selecione</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="contatado">Contatado</option>
            </select>
          </div>
          <div style={{ marginBottom: 26 }}>
            <label style={labelStyle}>Valor do Lead (R$)</label>
            <input
              style={inputStyle}
              type="number"
              name="valorLead"
              value={lead.valorLead || ""}
              onChange={handleChange}
              placeholder="Ex: 150"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: "#219EBC",
              color: "#fff",
              fontWeight: 700,
              fontSize: "1.01rem",
              borderRadius: "13px",
              padding: "13px 0",
              width: "100%",
              border: "none",
              boxShadow: "0 4px 14px #0001",
              letterSpacing: ".01em",
              transition: "background .15s",
              marginBottom: 10,
              cursor: "pointer",
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
          <div style={{ textAlign: "center" }}>
            <Link href="/admin/leads" legacyBehavior>
              <a style={{
                color: "#219EBC",
                fontWeight: 700,
                fontSize: "1rem",
                marginTop: 9,
                textDecoration: "underline"
              }}>
                ← Voltar para listagem
              </a>
            </Link>
          </div>
          {error && (
            <div style={{ color: "#dc2626", textAlign: "center", marginTop: 10 }}>{error}</div>
          )}
        </form>
      </div>
      <style>{`
        @media (max-width: 600px) {
          main > div {
            padding: 17px 7vw 17px 7vw !important;
            max-width: 98vw !important;
          }
        }
      `}</style>
    </main>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: 5,
  fontWeight: 700,
  color: "#023047",
};

const inputStyle = {
  width: "100%",
  padding: "10px 13px",
  borderRadius: "10px",
  border: "1.5px solid #e5e7eb",
  background: "#f8fafb",
  fontSize: "1.04rem",
  fontWeight: 500,
  outline: "none",
  marginTop: 2,
  marginBottom: 2,
  color: "#023047",
  transition: "border .15s",
};

