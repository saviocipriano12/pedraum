"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(true);

  // Buscar dados do serviço
  useEffect(() => {
    async function fetchService() {
      if (!id) return;
      const ref = doc(db, "services", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setNome(data.nome || "");
        setDescricao(data.descricao || "");
      }
      setLoading(false);
    }
    fetchService();
  }, [id]);

  // Salvar alterações
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome) return alert("Preencha o nome!");
    const ref = doc(db, "services", id);
    await updateDoc(ref, { nome, descricao });
    alert("Serviço atualizado!");
    router.push("/admin/services");
  }

  if (loading) {
    return <div style={{
      padding: 60, textAlign: "center", color: "#219EBC", fontWeight: 700
    }}>Carregando serviço...</div>;
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f9fafb",
      padding: "40px 0"
    }}>
      <div style={{
        maxWidth: 480,
        margin: "0 auto",
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 2px 16px #0001",
        padding: "38px 30px 24px 30px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
        <h2 style={{
          fontSize: "1.65rem",
          fontWeight: 900,
          color: "#134074",
          marginBottom: 34,
          letterSpacing: "-1px",
          textAlign: "center"
        }}>Editar Serviço</h2>
        <form onSubmit={handleSubmit} style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}>
          <label style={labelStyle}>
            Nome
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              style={inputStyle}
              required
            />
          </label>
          <label style={labelStyle}>
            Descrição
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={4}
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              placeholder="Descrição do serviço"
            />
          </label>
          <button type="submit" style={{
            background: "#2563eb",
            color: "#fff",
            fontWeight: 800,
            fontSize: "1.08rem",
            borderRadius: 11,
            padding: "15px 0",
            border: "none",
            outline: "none",
            boxShadow: "0 3px 14px #2563eb15",
            marginTop: 12,
            cursor: "pointer",
            transition: "background .16s"
          }}>Salvar Alterações</button>
        </form>
        <button
          type="button"
          onClick={() => router.push("/admin/services")}
          style={{
            marginTop: 28,
            background: "none",
            color: "#219EBC",
            border: "none",
            textDecoration: "underline",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: ".98rem"
          }}
        >← Voltar para listagem</button>
      </div>
    </main>
  );
}

const labelStyle = {
  color: "#023047",
  fontWeight: 700,
  marginBottom: 4,
  display: "flex",
  flexDirection: "column" as const,
  gap: 5,
  fontSize: "1.06rem"
};

const inputStyle = {
  borderRadius: 8,
  border: "1.5px solid #e5e7eb",
  background: "#f9fafb",
  padding: "11px 13px",
  fontSize: "1.05rem",
  outline: "none",
  marginTop: 4,
  fontWeight: 500,
  color: "#134074",
  transition: "border .13s"
};
