"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import ImageUploader from "@/components/ImageUploader";
import {
  Loader2, Save, Tag, MapPin, CheckCircle2, Sparkles, Upload, BookOpen, List, Layers, Calendar, Info
} from "lucide-react";

type FormState = {
  titulo: string;
  descricao: string;
  categoria: string;
  tipo: string;
  estado: string;
  cidade: string;
  atendeBrasil: boolean;
  prazo: string;
  orcamento: string; // masked "R$ 0,00"
  whatsapp: string;
  observacoes: string;
  status: "Aberta" | "Finalizada";
  dataLimite?: string;
};

const CATEGORIAS_PADRAO = [
  "Serviço de Manutenção",
  "Peça",
  "Logística / Transporte",
  "Aluguel de Máquina",
  "Compra de Máquina",
  "Venda de Máquina",
  "Consultoria Técnica",
  "Mão de Obra",
  "Mineração / Britagem",
  "Calibração / Inspeção",
  "Outro",
];

const TIPOS = ["produto", "serviço", "peça", "aluguel", "outro"];
const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const RASCUNHO_KEY = "pedraum:create-demandas:draft";

export default function CreateDemandaPage() {
  const router = useRouter();

  const [imagens, setImagens] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>({
    titulo: "",
    descricao: "",
    categoria: "",
    tipo: "",
    estado: "",
    cidade: "",
    atendeBrasil: false,
    prazo: "",
    orcamento: "",
    whatsapp: "",
    observacoes: "",
    status: "Aberta",
    dataLimite: "",
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [cidades, setCidades] = useState<string[]>([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ---------- Autosave local ----------
  useEffect(() => {
    const raw = localStorage.getItem(RASCUNHO_KEY);
    if (raw) {
      try {
        const p = JSON.parse(raw);
        setForm((prev) => ({ ...prev, ...(p.form || {}) }));
        setImagens(p.imagens ?? []);
        setTags(p.tags ?? []);
      } catch {}
    }
  }, []);
  useEffect(() => {
    const draft = { form, imagens, tags };
    setSavingDraft(true);
    const id = setTimeout(() => {
      localStorage.setItem(RASCUNHO_KEY, JSON.stringify(draft));
      setSavingDraft(false);
    }, 500);
    return () => clearTimeout(id);
  }, [form, imagens, tags]);

  // ---------- Handlers ----------
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target as any;
    const isCheckbox = type === "checkbox";
    setForm((prev) => ({
      ...prev,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value,
      ...(name === "estado" ? { cidade: "" } : null),
    }));
  }

  function handleCurrencyInput(value: string) {
    const onlyDigits = value.replace(/\D/g, "");
    const int = onlyDigits.slice(0, 12);
    const asNumber = Number(int) / 100;
    return asNumber.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function onChangeOrcamento(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, orcamento: handleCurrencyInput(e.target.value) }));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim() && tags.length < 5) {
      e.preventDefault();
      const clean = tagInput.trim().slice(0, 24);
      if (!tags.includes(clean)) setTags([...tags, clean]);
      setTagInput("");
    }
  }
  function removeTag(i: number) {
    setTags(tags.filter((_, idx) => idx !== i));
  }

  // ---------- Cidades por UF (IBGE) ----------
  useEffect(() => {
    async function fetchCidades(uf: string) {
      if (!uf) {
        setCidades([]);
        return;
      }
      setCarregandoCidades(true);
      try {
        const res = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/distritos`
        );
        const data = (await res.json()) as Array<{ nome: string }>;
        const nomes = Array.from(new Set(data.map((d) => d.nome))).sort((a, b) =>
          a.localeCompare(b, "pt-BR")
        );
        setCidades(nomes);
      } catch {
        setCidades([]);
      } finally {
        setCarregandoCidades(false);
      }
    }
    fetchCidades(form.estado);
  }, [form.estado]);

  // ---------- Preview ----------
  const preview = useMemo(() => {
    const local = form.atendeBrasil
      ? "Brasil inteiro"
      : form.estado
      ? `${form.cidade ? form.cidade + ", " : ""}${form.estado}`
      : "—";
    return {
      titulo: form.titulo?.trim() || "—",
      categoria: form.categoria || "—",
      tipo: form.tipo || "—",
      local,
      prazo: form.prazo || "—",
      orcamento: form.orcamento || "—",
      imagens: imagens.length,
      tags,
    };
  }, [form, imagens, tags]);

  // ---------- Submit ----------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const user = auth.currentUser;
    if (!user) {
      setError("Você precisa estar logado para cadastrar uma demanda.");
      setLoading(false);
      return;
    }

    // Validações essenciais
    if (!form.titulo || !form.descricao || !form.categoria || !form.tipo || !form.prazo) {
      setError("Preencha os campos obrigatórios (*).");
      setLoading(false);
      return;
    }
    if (!form.atendeBrasil && (!form.estado || !form.cidade)) {
      setError("Informe Estado e Cidade ou marque 'Atendo o Brasil inteiro'.");
      setLoading(false);
      return;
    }

    try {
      const searchBase = [
        form.titulo,
        form.descricao,
        form.categoria,
        form.tipo,
        form.estado,
        form.cidade,
        ...tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const payload = {
  ...form,
  cidade: form.atendeBrasil ? "" : form.cidade,
  estado: form.atendeBrasil ? "" : form.estado,
  tags,
  imagens,
  imagesCount: imagens.length,
  searchKeywords: searchBase.split(/\s+/).slice(0, 60),

  // ✅ use Date aqui
  statusHistory: [{ status: form.status, at: new Date() }],

  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  userId: user.uid,
};


      await addDoc(collection(db, "demandas"), payload);
      localStorage.removeItem(RASCUNHO_KEY);
      setSuccess("Demanda cadastrada com sucesso!");
      setTimeout(() => router.push("/demandas"), 900);
    } catch (err) {
      console.error(err);
      setError("Erro ao cadastrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- UI ----------
  return (
    <main
      className="min-h-screen flex flex-col items-center py-8 px-2 sm:px-4"
      style={{ background: "linear-gradient(135deg, #f7f9fb, #ffffff 45%, #e0e7ef)" }}
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
        {/* Título */}
        <h1
          style={{
            fontSize: "2.3rem",
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
          Cadastrar Demanda
        </h1>

        {/* Dica topo */}
        <div style={hintCardStyle}>
          <Info className="w-5 h-5" />
          <p style={{ margin: 0 }}>
            Quanto mais detalhes, melhor a conexão com fornecedores ideais. Você pode anexar
            imagens e adicionar referências.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Anexos */}
          <div style={sectionCardStyle}>
            <h3 style={sectionTitleStyle}>
              <Upload className="w-5 h-5 text-orange-500" /> Anexos (opcional)
            </h3>
            <ImageUploader imagens={imagens} setImagens={setImagens} max={5} />
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 7 }}>
              Adicione até 5 imagens reais para contextualizar sua necessidade.
            </p>
          </div>

          {/* Principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label style={labelStyle}>
                <Tag size={15} /> Título da Demanda *
              </label>
              <input
                name="titulo"
                value={form.titulo}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Ex: Manutenção em pá carregadeira CAT 938G"
                required
                maxLength={120}
              />
              <div style={smallInfoStyle}>{form.titulo.length}/120</div>
            </div>

            <div>
              <label style={labelStyle}>
                <Layers size={15} /> Tipo *
              </label>
              <select
                name="tipo"
                value={form.tipo}
                onChange={handleChange}
                style={inputStyle}
                required
              >
                <option value="">Selecione</option>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t[0].toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label style={labelStyle}>
                <BookOpen size={15} /> Descrição *
              </label>
              <textarea
                name="descricao"
                value={form.descricao}
                onChange={handleChange}
                style={{ ...inputStyle, height: 110 }}
                placeholder="Marca/modelo, sintomas, local, horários, prazos, requisitos etc."
                required
                maxLength={2000}
              />
              <div style={smallInfoStyle}>{form.descricao.length}/2000</div>
            </div>
          </div>

          {/* Categoria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>
                <List size={15} /> Categoria *
              </label>
              <select
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                style={inputStyle}
                required
              >
                <option value="">Selecione</option>
                {CATEGORIAS_PADRAO.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Atalhos de categoria */}
            <div>
              <label style={labelStyle}>Atalhos</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIAS_PADRAO.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, categoria: c }))}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1.6px solid #e5e7eb",
                      background: form.categoria === c ? "#fb8500" : "#fff",
                      color: form.categoria === c ? "#fff" : "#111827",
                      fontWeight: 700,
                      fontSize: 14,
                      transition: "all .2s",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Localização */}
          <div style={sectionCardStyle}>
            <h3 style={sectionTitleStyle}>
              <MapPin className="w-5 h-5 text-orange-500" /> Localização
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label style={labelStyle}>Estado (UF) {form.atendeBrasil ? "" : "*"}</label>
                <select
                  name="estado"
                  value={form.estado}
                  onChange={handleChange}
                  style={inputStyle}
                  disabled={form.atendeBrasil}
                  required={!form.atendeBrasil}
                >
                  <option value="">Selecione o Estado</option>
                  {ESTADOS.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Cidade {form.atendeBrasil ? "" : "*"}</label>
                <select
                  name="cidade"
                  value={form.cidade}
                  onChange={handleChange}
                  style={inputStyle}
                  disabled={form.atendeBrasil || !form.estado || carregandoCidades}
                  required={!form.atendeBrasil}
                >
                  <option value="">
                    {form.atendeBrasil
                      ? "Indisponível (Brasil inteiro)"
                      : carregandoCidades
                      ? "Carregando..."
                      : form.estado
                      ? "Selecione a cidade"
                      : "Selecione primeiro o estado"}
                  </option>
                  {cidades.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 6 }}>
                <input
                  id="atendeBrasil"
                  type="checkbox"
                  name="atendeBrasil"
                  checked={form.atendeBrasil}
                  onChange={handleChange}
                  style={{ width: 18, height: 18, accentColor: "#fb8500" }}
                />
                <label htmlFor="atendeBrasil" style={{ fontSize: 14, color: "#023047", fontWeight: 700 }}>
                  Atendo o Brasil inteiro
                </label>
              </div>
            </div>
          </div>

          {/* Prazos & Orçamento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label style={labelStyle}>
                <CheckCircle2 size={15} /> Prazo (urgência) *
              </label>
              <select
                name="prazo"
                value={form.prazo}
                onChange={handleChange}
                style={inputStyle}
                required
              >
                <option value="">Selecione</option>
                <option value="urgente">Urgente</option>
                <option value="até 3 dias">Até 3 dias</option>
                <option value="até 7 dias">Até 7 dias</option>
                <option value="até 15 dias">Até 15 dias</option>
                <option value="flexível">Flexível</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                <Calendar size={15} /> Data limite (opcional)
              </label>
              <input
                type="date"
                name="dataLimite"
                value={form.dataLimite}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                <CheckCircle2 size={15} /> Orçamento estimado (opcional)
              </label>
              <input
                name="orcamento"
                value={form.orcamento}
                onChange={onChangeOrcamento}
                style={inputStyle}
                placeholder="R$ 0,00"
                inputMode="numeric"
                aria-label="Orçamento estimado"
              />
            </div>
          </div>

          {/* Contato */}
          <div>
            <label style={labelStyle}>
              <MapPin size={15} /> WhatsApp / Telefone (opcional)
            </label>
            <input
              name="whatsapp"
              value={form.whatsapp}
              onChange={handleChange}
              style={inputStyle}
              placeholder="(xx) xxxxx-xxxx"
              inputMode="tel"
            />
          </div>

          {/* Status */}
          <div>
            <label style={labelStyle}>
              <CheckCircle2 size={15} /> Status *
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              style={inputStyle}
              required
            >
              <option value="Aberta">Aberta</option>
              <option value="Finalizada">Finalizada</option>
            </select>
          </div>

          {/* Tags */}
          <div>
            <label style={labelStyle}>
              <Tag size={15} /> Referências (até 5)
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tags.map((tg, idx) => (
                <span
                  key={idx}
                  style={{
                    background: "#fff7ed",
                    color: "#9a3412",
                    fontWeight: 700,
                    padding: "6px 10px",
                    borderRadius: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1.6px solid #fde7cf",
                    fontSize: 13,
                  }}
                >
                  {tg}
                  <button
                    type="button"
                    onClick={() => removeTag(idx)}
                    aria-label={`Remover ${tg}`}
                    style={{
                      color: "#fb8500",
                      fontWeight: 900,
                      fontSize: 16,
                      lineHeight: 1,
                      marginLeft: 2,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
              {tags.length < 5 && (
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Nova referência"
                  maxLength={24}
                  style={{
                    ...inputStyle,
                    width: 190,
                    padding: "10px 12px",
                    marginBottom: 0,
                    fontSize: 14,
                  }}
                />
              )}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label style={labelStyle}>
              <BookOpen size={15} /> Observações (opcional)
            </label>
            <textarea
              name="observacoes"
              value={form.observacoes}
              onChange={handleChange}
              style={{ ...inputStyle, height: 90 }}
              placeholder="Horários preferenciais, restrições de acesso, detalhes adicionais..."
              maxLength={600}
            />
            <div style={smallInfoStyle}>{form.observacoes.length}/600</div>
          </div>

          {/* Pré-visualização */}
          <div style={previewCardStyle}>
            <div style={{ fontWeight: 800, color: "#023047", marginBottom: 8 }}>
              Pré-visualização
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
              <div><span style={muted}>Título:</span> {preview.titulo}</div>
              <div><span style={muted}>Categoria:</span> {preview.categoria}</div>
              <div><span style={muted}>Tipo:</span> {preview.tipo}</div>
              <div><span style={muted}>Local:</span> {preview.local}</div>
              <div><span style={muted}>Prazo:</span> {preview.prazo}</div>
              <div><span style={muted}>Orçamento:</span> {preview.orcamento}</div>
              <div><span style={muted}>Imagens:</span> {preview.imagens}</div>
              <div><span style={muted}>Referências:</span> {preview.tags.join(", ") || "—"}</div>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
              {savingDraft ? "Salvando rascunho..." : "Rascunho salvo automaticamente"}
            </div>
          </div>

          {/* Alertas */}
          {error && (
            <div style={errorStyle}>
              {error}
            </div>
          )}
          {success && (
            <div style={successStyle}>
              {success}
            </div>
          )}

          {/* Botão principal (laranja sólido) */}
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
            onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.98)")}
            onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
          >
            {loading ? <Loader2 className="animate-spin w-7 h-7" /> : <Save className="w-6 h-6" />}
            {loading ? "Cadastrando..." : "Cadastrar Demanda"}
          </button>

          {/* Voltar */}
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              marginTop: 10,
              background: "#f3f4f6",
              color: "#111827",
              border: "1.6px solid #e5e7eb",
              borderRadius: 12,
              padding: "12px 0",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Voltar
          </button>
        </form>
      </section>
    </main>
  );
}

/* ---------- Estilos reutilizáveis (compatíveis com create-produto) ---------- */
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
const previewCardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1.6px solid #e5e7eb",
  background: "#f8fafc",
  padding: "14px 14px",
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
const smallInfoStyle: React.CSSProperties = { fontSize: 12, color: "#64748b", marginTop: 4 };
const errorStyle: React.CSSProperties = {
  background: "#fff7f7",
  color: "#d90429",
  border: "1.5px solid #ffe5e5",
  padding: "12px 0",
  borderRadius: 11,
  textAlign: "center",
  fontWeight: 700,
};
const successStyle: React.CSSProperties = {
  background: "#f7fafc",
  color: "#16a34a",
  border: "1.5px solid #c3f3d5",
  padding: "12px 0",
  borderRadius: 11,
  textAlign: "center",
  fontWeight: 700,
};
const muted: React.CSSProperties = { color: "#6b7280" };
