"use client";
import AuthGateRedirect from "@/components/AuthGateRedirect";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import {
  Loader2, Save, Tag, DollarSign, Layers, MapPin, ImageIcon, Globe, CalendarClock
} from "lucide-react";
import ImageUploader from "@/components/ImageUploader";

const categorias = [
  "Mecânico de Máquinas Pesadas", "Elétrica Industrial", "Transporte de Equipamentos",
  "Soldador", "Montagem/Desmontagem", "Lubrificação e Manutenção", "Assistência Técnica",
  "Operação de Máquinas", "Treinamento de Operadores", "Manutenção Preventiva",
  "Calibração", "Consultoria Técnica", "Topografia", "Transporte de Cargas",
  "Segurança do Trabalho", "Locação de Equipamentos", "Outros"
];
const estados = [
  "BRASIL", "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];
const disponibilidades = [
  "Manhã", "Tarde", "Noite", "Integral", "24 horas", "Sob consulta"
];

export default function CreateServicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imagens, setImagens] = useState<string[]>([]);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    categoria: "",
    preco: "",
    estado: "",
    abrangencia: "",
    disponibilidade: "",
    // certificacoes: "", // descomente se quiser incluir
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const user = auth.currentUser;
    if (!user) {
      setError("Faça login para cadastrar um serviço.");
      setLoading(false);
      return;
    }

    if (
      !form.titulo ||
      !form.descricao ||
      !form.categoria ||
      !form.estado ||
      !form.abrangencia ||
      !form.disponibilidade
    ) {
      setError("Preencha todos os campos obrigatórios.");
      setLoading(false);
      return;
    }

    if (imagens.length === 0) {
      setError("Envie pelo menos uma imagem do serviço.");
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(now.getDate() + 45);

      await addDoc(collection(db, "services"), {
        titulo: form.titulo,
        descricao: form.descricao,
        categoria: form.categoria,
        preco: form.preco ? parseFloat(form.preco) : "Sob consulta",
        abrangencia: form.abrangencia,
        disponibilidade: form.disponibilidade,
        // certificacoes: form.certificacoes,
        estado: form.estado,
        imagens,
        vendedorId: user.uid,
        prestadorNome: user.displayName || "",
        createdAt: serverTimestamp(),
        expiraEm: Timestamp.fromDate(expiresAt),
        status: "ativo",
        tipo: "serviço",
      });
      setSuccess("Serviço cadastrado com sucesso!");
      setLoading(false);
      setForm({
        titulo: "",
        descricao: "",
        categoria: "",
        preco: "",
        estado: "",
        abrangencia: "",
        disponibilidade: "",
        // certificacoes: "",
      });
      setImagens([]);
      setTimeout(() => router.push("/services"), 1300);
    } catch (err) {
      setLoading(false);
      setError("Erro ao cadastrar serviço. Tente novamente.");
      console.error(err);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#e0e7ef] flex flex-col items-center py-10 px-2 sm:px-4">
      <section
        style={{
          maxWidth: 700,
          width: "100%",
          background: "#fff",
          borderRadius: 22,
          boxShadow: "0 4px 32px #0001",
          padding: "48px 2vw 55px 2vw",
          marginTop: 18,
        }}
      >
        <h1
          style={{
            fontSize: "2.2rem",
            fontWeight: 900,
            color: "#023047",
            letterSpacing: "-1px",
            margin: "0 0 30px 0",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Layers className="w-9 h-9 text-orange-500" />
          Cadastrar Serviço
        </h1>
<AuthGateRedirect />
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Imagem do Serviço */}
          <div style={{
            background: "#f3f6fa",
            borderRadius: 12,
            padding: "20px 15px",
            border: "1.6px solid #e8eaf0",
            marginBottom: 12,
          }}>
            <h3 style={{ color: "#2563eb", fontWeight: 700, marginBottom: 12, fontSize: 17, display: 'flex', alignItems: 'center', gap: 7 }}>
              <ImageIcon /> Imagem do Serviço *
            </h3>
            <ImageUploader imagens={imagens} setImagens={setImagens} max={2} />
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 7 }}>
              Adicione 1 ou 2 imagens reais ou de referência do serviço prestado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Título */}
            <div>
              <label style={labelStyle}>
                <Tag size={15} /> Título do Serviço *
              </label>
              <input
                name="titulo"
                value={form.titulo}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Ex: Manutenção corretiva em britador"
                maxLength={80}
                required
                autoComplete="off"
              />
            </div>
            {/* Valor */}
            <div>
              <label style={labelStyle}>
                <DollarSign size={15} /> Valor do Serviço (R$)
              </label>
              <input
                name="preco"
                value={form.preco}
                onChange={handleChange}
                type="number"
                min={0}
                step={0.01}
                style={inputStyle}
                placeholder="Ex: 1200 (opcional)"
                autoComplete="off"
              />
            </div>
            {/* Categoria */}
            <div>
              <label style={labelStyle}>
                <Layers size={15} /> Categoria *
              </label>
              <select
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                style={inputStyle}
                required
              >
                <option value="">Selecione</option>
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            {/* Estado */}
            <div>
              <label style={labelStyle}>
                <MapPin size={15} /> Estado (UF) *
              </label>
              <select
                name="estado"
                value={form.estado}
                onChange={handleChange}
                style={inputStyle}
                required
              >
                <option value="">Selecione</option>
                {estados.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
            {/* Abrangência */}
            <div>
              <label style={labelStyle}>
                <Globe size={15} /> Abrangência *
              </label>
              <input
                name="abrangencia"
                value={form.abrangencia}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Ex: Minas Gerais, Sudeste, Brasil inteiro..."
                maxLength={60}
                required
                autoComplete="off"
              />
            </div>
            {/* Disponibilidade */}
            <div>
              <label style={labelStyle}>
                <CalendarClock size={15} /> Disponibilidade *
              </label>
              <select
                name="disponibilidade"
                value={form.disponibilidade}
                onChange={handleChange}
                style={inputStyle}
                required
              >
                <option value="">Selecione</option>
                {disponibilidades.map((disp) => (
                  <option key={disp} value={disp}>{disp}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Descrição */}
          <div>
            <label style={labelStyle}>
              <Tag size={15} /> Descrição detalhada *
            </label>
            <textarea
              name="descricao"
              value={form.descricao}
              onChange={handleChange}
              style={{ ...inputStyle, height: 90 }}
              placeholder="Descreva o serviço, experiência, materiais, área de atendimento, diferenciais, etc."
              rows={4}
              maxLength={400}
              required
            />
          </div>
          {/* Erro e Sucesso */}
          {error && (
            <div
              style={{
                background: "#fff7f7",
                color: "#d90429",
                border: "1.5px solid #ffe5e5",
                padding: "12px 0",
                borderRadius: 11,
                textAlign: "center",
                marginBottom: 6,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}
          {success && (
            <div
              style={{
                background: "#f7fafc",
                color: "#16a34a",
                border: "1.5px solid #c3f3d5",
                padding: "12px 0",
                borderRadius: 11,
                textAlign: "center",
                marginBottom: 6,
                fontWeight: 700,
              }}
            >
              {success}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: "linear-gradient(90deg,#fb8500,#219ebc)",
              color: "#fff",
              border: "none",
              borderRadius: 13,
              padding: "16px 0",
              fontWeight: 800,
              fontSize: 22,
              boxShadow: "0 2px 20px #fb850022",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginTop: 10,
            }}
          >
            {loading ? <Loader2 className="animate-spin w-7 h-7" /> : <Save className="w-6 h-6" />}
            {loading ? "Salvando..." : "Cadastrar Serviço"}
          </button>
        </form>
      </section>
    </main>
  );
}

// Estilos
const labelStyle: React.CSSProperties = {
  fontWeight: 700, color: "#023047", marginBottom: 2, display: "flex", alignItems: "center", gap: 6
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 10,
  border: "1.6px solid #e5e7eb",
  fontSize: 17,
  color: "#222",
  background: "#f8fafc",
  fontWeight: 600,
  marginBottom: 8,
  outline: "none",
  marginTop: 4,
  minHeight: 46,
};
