// app/create-service/page.tsx
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import AuthGateRedirect from "@/components/AuthGateRedirect";
import ImageUploader from "@/components/ImageUploader";
import { db, auth } from "@/firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  Loader2,
  Save,
  Tag,
  DollarSign,
  Layers,
  MapPin,
  Globe,
  CalendarClock,
  Upload,
  Info,
  Sparkles,
} from "lucide-react";


/* ================== Constantes ================== */
const categorias = [
  "Mecânico de Máquinas Pesadas",
  "Elétrica Industrial",
  "Transporte de Equipamentos",
  "Soldador",
  "Montagem/Desmontagem",
  "Lubrificação e Manutenção",
  "Assistência Técnica",
  "Operação de Máquinas",
  "Treinamento de Operadores",
  "Manutenção Preventiva",
  "Calibração",
  "Consultoria Técnica",
  "Topografia",
  "Transporte de Cargas",
  "Segurança do Trabalho",
  "Locação de Equipamentos",
  "Outros",
];

const estados = [
  "BRASIL","AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const disponibilidades = [
  "Manhã",
  "Tarde",
  "Noite",
  "Integral",
  "24 horas",
  "Sob consulta",
];

const RASCUNHO_KEY = "pedraum:create-service:draft_v2";

/* ================== Tipos ================== */
type FormState = {
  titulo: string;
  descricao: string;
  categoria: string;
  preco: string; // controlado como texto; na gravação vira number ou "Sob consulta"
  estado: string;
  abrangencia: string;
  disponibilidade: string;
  // autor (autofill + editável)
  prestadorNome: string;
  prestadorEmail: string;
  prestadorWhatsapp: string;
};

export default function CreateServicePage() {
  const router = useRouter();

  const [imagens, setImagens] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>({
    titulo: "",
    descricao: "",
    categoria: "",
    preco: "",
    estado: "",
    abrangencia: "",
    disponibilidade: "",
    prestadorNome: "",
    prestadorEmail: "",
    prestadorWhatsapp: "",
  });

  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* ---------- Autosave local ---------- */
  useEffect(() => {
    const raw = localStorage.getItem(RASCUNHO_KEY);
    if (raw) {
      try {
        const p = JSON.parse(raw);
        if (p?.form) setForm((prev) => ({ ...prev, ...p.form }));
        if (Array.isArray(p?.imagens)) setImagens(p.imagens);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const draft = { form, imagens };
    setSavingDraft(true);
    const id = setTimeout(() => {
      localStorage.setItem(RASCUNHO_KEY, JSON.stringify(draft));
      setSavingDraft(false);
    }, 500);
    return () => clearTimeout(id);
  }, [form, imagens]);

  /* ---------- Autofill do autor ---------- */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const uref = doc(db, "usuarios", user.uid);
        const usnap = await getDoc(uref);
        const prof = usnap.exists() ? (usnap.data() as any) : {};
        setForm((prev) => ({
          ...prev,
          prestadorNome:
            prev.prestadorNome || prof?.nome || user.displayName || "",
          prestadorEmail: prev.prestadorEmail || prof?.email || user.email || "",
          prestadorWhatsapp:
            prev.prestadorWhatsapp || prof?.whatsapp || prof?.telefone || "",
        }));
      } catch {
        setForm((prev) => ({
          ...prev,
          prestadorNome: prev.prestadorNome || auth.currentUser?.displayName || "",
          prestadorEmail: prev.prestadorEmail || auth.currentUser?.email || "",
        }));
      }
    });
    return () => unsub();
  }, []);

  /* ---------- Handlers ---------- */
  function handleChange(
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLSelectElement>
  ) {
    const { name, value } = e.target as any;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const precoPreview = useMemo(() => {
    if (!form.preco) return "Sob consulta";
    const n = Number(form.preco);
    if (Number.isNaN(n)) return "Sob consulta";
    return `R$ ${n.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, [form.preco]);

  /* ---------- Submit ---------- */
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
      !form.disponibilidade ||
      !form.prestadorNome ||
      !form.prestadorEmail
    ) {
      setError("Preencha todos os campos obrigatórios (*).");
      setLoading(false);
      return;
    }


    try {
      // preço: número ou "Sob consulta"
      let preco: number | string = "Sob consulta";
      if (form.preco.trim() !== "") {
        const n = Number(form.preco);
        if (!Number.isNaN(n) && n >= 0) preco = Number(n.toFixed(2));
      }

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(now.getDate() + 45);

      // keywords para busca
      const searchBase = [
        form.titulo,
        form.descricao,
        form.categoria,
        form.estado,
        form.abrangencia,
        form.disponibilidade,
        form.prestadorNome,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const payload = {
        // principais
        titulo: form.titulo,
        descricao: form.descricao,
        categoria: form.categoria,
        preco,
        estado: form.estado,
        abrangencia: form.abrangencia,
        disponibilidade: form.disponibilidade,

        // mídia
        imagens,
        imagesCount: imagens.length,

        // autor / vendedor
        vendedorId: user.uid,
        prestadorNome: form.prestadorNome || "",
        prestadorEmail: form.prestadorEmail || "",
        prestadorWhatsapp: form.prestadorWhatsapp || "",

        // busca e status
        searchKeywords: searchBase.split(/\s+/).slice(0, 60),
        status: "ativo",
        statusHistory: [{ status: "ativo", at: now }],
        tipo: "serviço",

        // datas
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiraEm: Timestamp.fromDate(expiresAt),
      };

      await addDoc(collection(db, "services"), payload);
      localStorage.removeItem(RASCUNHO_KEY);
      setSuccess("Serviço cadastrado com sucesso!");
      setTimeout(() => router.push("/services"), 900);
    } catch (err) {
      console.error(err);
      setError("Erro ao cadastrar serviço. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- UI ---------- */
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="animate-spin w-5 h-5" />
          <span>Carregando...</span>
        </div>
      </main>
    }>
      <main
        className="min-h-screen flex flex-col items-center py-10 px-2 sm:px-4"
        style={{
          background: "linear-gradient(135deg, #f7f9fb, #ffffff 45%, #e0e7ef)",
        }}
      >
        <section
          style={{
            maxWidth: 760,
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
              margin: "0 0 25px 0",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Sparkles className="w-9 h-9 text-orange-500" />
            Cadastrar Serviço
          </h1>

          {/* Dica topo */}
          <div style={hintCardStyle}>
            <Info className="w-5 h-5" />
            <p style={{ margin: 0 }}>
              Quanto mais detalhes, melhor a conexão com clientes ideais. Pelo
              menos 1 imagem é obrigatória.
            </p>
          </div>

          <AuthGateRedirect />

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 22 }}
          >
            {/* Imagens */}
            <div style={sectionCardStyle}>
              <h3 style={sectionTitleStyle}>
                <Upload className="w-5 h-5 text-orange-500" /> Imagens do Serviço *
              </h3>
              <ImageUploader imagens={imagens} setImagens={setImagens} max={2} />
              <p style={{ fontSize: 13, color: "#64748b", marginTop: 7 }}>
                Adicione 1 ou 2 imagens reais ou de referência do serviço
                prestado.
              </p>
            </div>

            {/* Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
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
                <div style={smallInfoStyle}>{form.titulo.length}/80</div>
              </div>

              <div>
                <label style={labelStyle}>
                  <DollarSign size={15} /> Valor (R$)
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
                <div style={smallInfoStyle}>
                  Pré-visualização: {precoPreview}
                </div>
              </div>

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
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

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
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>

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
                    <option key={disp} value={disp}>
                      {disp}
                    </option>
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
                style={{ ...inputStyle, height: 110 }}
                placeholder="Descreva o serviço, experiência, materiais, área de atendimento, diferenciais, etc."
                rows={4}
                maxLength={400}
                required
              />
              <div style={smallInfoStyle}>{form.descricao.length}/400</div>
            </div>

            {/* Dados do prestador (autofill + editável) */}
            <div style={sectionCardStyle}>
              <h3 style={sectionTitleStyle}>
                <Info className="w-5 h-5 text-orange-500" /> Seus dados (editáveis)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label style={labelStyle}>Nome *</label>
                  <input
                    name="prestadorNome"
                    value={form.prestadorNome}
                    onChange={handleChange}
                    style={inputStyle}
                    required
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label style={labelStyle}>E-mail *</label>
                  <input
                    name="prestadorEmail"
                    value={form.prestadorEmail}
                    onChange={handleChange}
                    style={inputStyle}
                    type="email"
                    required
                    placeholder="seuemail@exemplo.com"
                  />
                </div>
                <div>
                  <label style={labelStyle}>WhatsApp (opcional)</label>
                  <input
                    name="prestadorWhatsapp"
                    value={form.prestadorWhatsapp}
                    onChange={handleChange}
                    style={inputStyle}
                    placeholder="(xx) xxxxx-xxxx"
                    inputMode="tel"
                  />
                </div>
              </div>
            </div>

            {/* Alertas */}
            {error && (
              <div
                style={{
                  background: "#fff7f7",
                  color: "#d90429",
                  border: "1.5px solid #ffe5e5",
                  padding: "12px 0",
                  borderRadius: 11,
                  textAlign: "center",
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
                  fontWeight: 700,
                }}
              >
                {success}
              </div>
            )}

            {/* Botão principal */}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: "#fb8500",
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
                marginTop: 2,
                transition: "filter .2s, transform .02s",
              }}
              onMouseDown={(e) =>
                (e.currentTarget.style.transform = "translateY(1px)")
              }
              onMouseUp={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.98)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
            >
              {loading ? <Loader2 className="animate-spin w-7 h-7" /> : <Save className="w-6 h-6" />}
              {loading ? "Cadastrando..." : "Cadastrar Serviço"}
            </button>

            <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
              {savingDraft ? "Salvando rascunho..." : "Rascunho salvo automaticamente"}
            </div>
          </form>
        </section>
      </main>
    </Suspense>
  );
}

/* ---------- Estilos ---------- */
const labelStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#023047",
  marginBottom: 4,
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 14,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 10,
  border: "1.6px solid #e5e7eb",
  fontSize: 16,
  color: "#1f2937",
  background: "#f8fafc",
  fontWeight: 600,
  marginBottom: 8,
  outline: "none",
  marginTop: 4,
  minHeight: 46,
};
const sectionCardStyle: React.CSSProperties = {
  background: "#f3f6fa",
  borderRadius: 12,
  padding: "24px 18px",
  border: "1.6px solid #e8eaf0",
  marginBottom: 6,
};
const sectionTitleStyle: React.CSSProperties = {
  color: "#2563eb",
  fontWeight: 800,
  marginBottom: 12,
  fontSize: 18,
  display: "flex",
  alignItems: "center",
  gap: 8,
};
const hintCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#eef6ff",
  border: "1.6px solid #dbeafe",
  color: "#0c4a6e",
  padding: "12px 14px",
  borderRadius: 14,
  marginBottom: 16,
};
const smallInfoStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  marginTop: 4,
};
