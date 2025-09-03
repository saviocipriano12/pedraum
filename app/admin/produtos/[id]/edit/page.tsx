"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/firebaseConfig";
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { Loader, Trash2, Save, ChevronLeft } from "lucide-react";
import ImageUploader from "@/components/ImageUploader";

export default function EditProdutoPage() {
  const params = useParams();
  const router = useRouter();
  const produtoId = params.id as string;

  const [produto, setProduto] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [imagens, setImagens] = useState<string[]>([]);

  const [form, setForm] = useState<any>({
    nome: "",
    descricao: "",
    preco: "",
    categoria: "",
    subcategoria: "",
    ano: "",
    condicao: "",
    tipo: "produto",
    cidade: "",
    estado: "",
    status: "ativo",
  });

  // Buscar produto e usuário criador
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const prodSnap = await getDoc(doc(db, "produtos", produtoId));
        if (!prodSnap.exists()) {
          setProduto(null);
          setLoading(false);
          return;
        }
        const prodData = prodSnap.data();
        setProduto(prodData);
        setForm({
          nome: prodData.nome || "",
          descricao: prodData.descricao || "",
          preco: prodData.preco || "",
          categoria: prodData.categoria || "",
          subcategoria: prodData.subcategoria || "",
          ano: prodData.ano || "",
          condicao: prodData.condicao || "",
          tipo: prodData.tipo || "produto",
          cidade: prodData.cidade || "",
          estado: prodData.estado || "",
          status: prodData.status || "ativo",
        });
        setImagens(Array.isArray(prodData.imagens) ? prodData.imagens : []);

        if (prodData.userId) {
          const userSnap = await getDoc(doc(db, "usuarios", prodData.userId));
          if (userSnap.exists()) setUser(userSnap.data());
        }
      } catch {
        setProduto(null);
      }
      setLoading(false);
    }
    if (produtoId) fetchData();
  }, [produtoId]);

  // Handle input changes
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((f: any) => ({ ...f, [e.target.name]: e.target.value }));
  }

  // Salvar alterações
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    if (!form.nome || !form.categoria || !form.cidade || !form.estado) {
      setMsg("Preencha os campos obrigatórios.");
      setSaving(false);
      return;
    }
    if (imagens.length === 0) {
      setMsg("Envie pelo menos uma imagem.");
      setSaving(false);
      return;
    }

    try {
      await updateDoc(doc(db, "produtos", produtoId), {
        ...form,
        preco: form.preco ? parseFloat(form.preco) : null,
        imagens,
        updatedAt: serverTimestamp(),
      });
      setMsg("Alterações salvas com sucesso!");
      setTimeout(() => setMsg(""), 4000);
    } catch {
      setMsg("Erro ao salvar. Tente novamente.");
    }
    setSaving(false);
  }

  // Excluir produto
  async function handleDelete() {
    if (!window.confirm("Tem certeza que deseja excluir este produto?")) return;
    setSaving(true);
    setMsg("");
    try {
      await deleteDoc(doc(db, "produtos", produtoId));
      router.push("/admin/produtos");
    } catch {
      setMsg("Erro ao excluir produto.");
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <Loader size={30} className="animate-spin" /> Carregando...
      </div>
    );
  if (!produto)
    return (
      <div style={{ padding: 48, color: "red", textAlign: "center" }}>
        Produto não encontrado.
      </div>
    );

  return (
    <section
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "42px 2vw 60px 2vw",
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 4px 28px #0001",
      }}
    >
      <Link
        href="/admin/produtos"
        style={{
          color: "#2563eb",
          fontWeight: 700,
          marginBottom: 28,
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          textDecoration: "none",
        }}
      >
        <ChevronLeft size={18} /> Voltar para Produtos
      </Link>

      <h1
        style={{
          fontSize: "2rem",
          fontWeight: 900,
          color: "#023047",
          margin: "0 0 25px 0",
        }}
      >
        Editar Produto
      </h1>

      {/* Proprietário */}
      <div
        style={{
          background: "#f3f6fa",
          borderRadius: 12,
          padding: 18,
          marginBottom: 26,
          border: "1.6px solid #e8eaf0",
        }}
      >
        <div style={{ fontWeight: 700, color: "#219EBC", marginBottom: 6 }}>
          Proprietário do Produto:
        </div>
        <div><b>Nome:</b> {user?.nome || "—"}</div>
        <div><b>E-mail:</b> {user?.email || "—"}</div>
        <div><b>UserID:</b> {produto.userId || "—"}</div>
      </div>

      {/* Datas */}
      <div style={{ color: "#64748b", fontSize: ".98rem", marginBottom: 18 }}>
        <div>
          <b>Criado em:</b>{" "}
          {produto.createdAt?.seconds
            ? new Date(produto.createdAt.seconds * 1000).toLocaleString()
            : "—"}
        </div>
        <div>
          <b>Atualizado em:</b>{" "}
          {produto.updatedAt?.seconds
            ? new Date(produto.updatedAt.seconds * 1000).toLocaleString()
            : "—"}
        </div>
      </div>

      {/* Status msg */}
      {msg && (
        <div
          style={{
            background: "#f7fafc",
            color: msg.includes("sucesso") ? "#16a34a" : "#b91c1c",
            border: `1.5px solid ${msg.includes("sucesso") ? "#c3f3d5" : "#fbbf24"}`,
            padding: "12px 0",
            borderRadius: 11,
            textAlign: "center",
            marginBottom: 15,
            fontWeight: 700,
          }}
        >
          {msg}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={labelStyle}>Nome *</label>
        <input name="nome" value={form.nome} onChange={handleChange} style={inputStyle} required />

        <label style={labelStyle}>Descrição *</label>
        <textarea
          name="descricao"
          value={form.descricao}
          onChange={handleChange}
          style={{ ...inputStyle, height: 90 }}
          required
        />

        <label style={labelStyle}>Preço (R$)</label>
        <input
          name="preco"
          type="number"
          value={form.preco}
          onChange={handleChange}
          style={inputStyle}
          min="0"
          step="0.01"
        />

        <label style={labelStyle}>Categoria *</label>
        <input name="categoria" value={form.categoria} onChange={handleChange} style={inputStyle} required />

        <label style={labelStyle}>Subcategoria</label>
        <input name="subcategoria" value={form.subcategoria} onChange={handleChange} style={inputStyle} />

        <label style={labelStyle}>Ano</label>
        <input name="ano" type="number" value={form.ano} onChange={handleChange} style={inputStyle} />

        <label style={labelStyle}>Condição</label>
        <input name="condicao" value={form.condicao} onChange={handleChange} style={inputStyle} />

        <label style={labelStyle}>Tipo</label>
        <select name="tipo" value={form.tipo} onChange={handleChange} style={inputStyle}>
          <option value="produto">Produto</option>
          <option value="máquina">Máquina</option>
        </select>

        <label style={labelStyle}>Status</label>
        <select name="status" value={form.status} onChange={handleChange} style={inputStyle}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="vendido">Vendido</option>
        </select>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Cidade *</label>
            <input name="cidade" value={form.cidade} onChange={handleChange} style={inputStyle} required />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Estado *</label>
            <input name="estado" value={form.estado} onChange={handleChange} style={inputStyle} required />
          </div>
        </div>

        {/* Imagens */}
        <label style={labelStyle}>Imagens *</label>
        <ImageUploader imagens={imagens} setImagens={setImagens} max={5} />

        {/* Botões */}
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: "#FB8500",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "13px 32px",
              fontWeight: 800,
              fontSize: 18,
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Save size={20} /> {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            style={{
              background: "#fff0f0",
              color: "#d90429",
              border: "1.5px solid #ffe5e5",
              borderRadius: 10,
              padding: "13px 32px",
              fontWeight: 700,
              fontSize: 17,
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Trash2 size={20} /> Excluir Produto
          </button>
        </div>
      </form>
    </section>
  );
}

// estilos
const labelStyle: React.CSSProperties = { fontWeight: 700, color: "#023047", marginBottom: 4 };
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderRadius: 9,
  border: "1.5px solid #e5e7eb",
  fontSize: 16,
  color: "#222",
  background: "#f8fafc",
  fontWeight: 600,
  marginBottom: 8,
  outline: "none",
};
