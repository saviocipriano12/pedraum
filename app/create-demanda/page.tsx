// app/create-demanda/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import ImageUploader from "@/components/ImageUploader";
import {
  Loader2, Save, Tag, MapPin, CheckCircle2, Sparkles, Upload, BookOpen, List, Layers, Info
} from "lucide-react";

/* ================== Categorias (mesmas do create-produto) ================== */
const categorias = [
  {
    nome: "Equipamentos de Perfuração e Demolição",
    subcategorias: [
      "Perfuratrizes – Rotativas", "Perfuratrizes – Pneumáticas", "Perfuratrizes – Hidráulicas",
      "Martelos Demolidores – Hidráulicos", "Martelos Demolidores – Pneumáticos",
      "Brocas para rocha", "Coroas diamantadas", "Varetas de extensão",
      "Explosivos – Dinamite", "Explosivos – ANFO", "Detonadores", "Cordel detonante"
    ]
  },
  {
    nome: "Equipamentos de Carregamento e Transporte",
    subcategorias: [
      "Escavadeiras hidráulicas", "Pás carregadeiras", "Caminhões basculantes", "Caminhões pipa",
      "Correias transportadoras", "Alimentadores vibratórios", "Esteiras rolantes"
    ]
  },
  {
    nome: "Britagem e Classificação",
    subcategorias: [
      "Britadores – Mandíbulas", "Britadores – Cônicos", "Britadores – Impacto", "Britadores – Rolos",
      "Rebritadores", "Peneiras vibratórias", "Trommels", "Hidrociclones", "Classificadores",
      "Moinhos de bolas", "Moinhos de barras", "Moinhos verticais",
      "Lavadores de areia", "Silos e chutes", "Carcaças e bases metálicas"
    ]
  },
  {
    nome: "Beneficiamento e Processamento Mineral",
    subcategorias: [
      "Separadores Magnéticos", "Flotação – Células", "Flotação – Espumantes e coletores",
      "Filtros prensa", "Espessadores", "Secadores rotativos"
    ]
  },
  {
    nome: "Peças e Componentes Industriais",
    subcategorias: [
      "Rolamentos", "Engrenagens", "Polias", "Eixos", "Mancais", "Buchas",
      "Correntes", "Correias transportadoras", "Esticadores de correia", "Parafusos e porcas",
      "Molas industriais"
    ]
  },
  {
    nome: "Desgaste e Revestimento",
    subcategorias: [
      "Mandíbulas", "Martelos", "Revestimentos de britadores", "Chapas de desgaste",
      "Barras de impacto", "Grelhas", "Telas metálicas", "Telas em borracha"
    ]
  },
  {
    nome: "Automação, Elétrica e Controle",
    subcategorias: [
      "Motores elétricos", "Inversores de frequência", "Painéis elétricos", "Controladores ASRi",
      "Soft starters", "Sensores e detectores", "Detectores de metais", "CLPs e módulos"
    ]
  },
  {
    nome: "Lubrificação e Produtos Químicos",
    subcategorias: [
      "Óleos lubrificantes", "Graxas industriais", "Selantes industriais",
      "Desengripantes", "Produtos químicos para peneiramento"
    ]
  },
  {
    nome: "Equipamentos Auxiliares e Ferramentas",
    subcategorias: [
      "Compressores de Ar – Estacionários", "Compressores de Ar – Móveis", "Geradores de Energia",
      "Bombas de água", "Bombas de lama", "Ferramentas manuais", "Ferramentas elétricas",
      "Mangueiras e Conexões Hidráulicas", "Iluminação Industrial", "Abraçadeiras e Fixadores",
      "Soldas e Eletrodos", "Equipamentos de Limpeza Industrial"
    ]
  },
  {
    nome: "EPIs (Equipamentos de Proteção Individual)",
    subcategorias: [
      "Capacetes", "Protetores auriculares", "Máscaras contra poeira", "Respiradores",
      "Luvas", "Botas de segurança", "Óculos de proteção", "Colete refletivo"
    ]
  },
  {
    nome: "Instrumentos de Medição e Controle",
    subcategorias: [
      "Monitoramento de Estabilidade", "Inclinômetros", "Extensômetros", "Análise de Material",
      "Teor de umidade", "Granulometria", "Sensores de nível e vazão", "Sistemas de controle remoto"
    ]
  },
  {
    nome: "Manutenção e Serviços Industriais",
    subcategorias: [
      "Filtros de ar e combustível", "Óleos hidráulicos e graxas", "Rolamentos e correias",
      "Martelos e mandíbulas para britadores", "Pastilhas de desgaste",
      "Serviços de manutenção industrial", "Usinagem e caldeiraria"
    ]
  },
  {
    nome: "Veículos e Pneus",
    subcategorias: [
      "Pneus industriais", "Rodas e aros", "Recapagens e reformas de pneus",
      "Serviços de montagem e balanceamento"
    ]
  },
  {
    nome: "Outros",
    subcategorias: [
      "Outros equipamentos", "Produtos diversos", "Serviços diversos"
    ]
  }
];

/* ================== Tipos e Constantes ================== */
type FormState = {
  titulo: string;
  descricao: string;
  categoria: string;
  subcategoria: string;
  estado: string;
  cidade: string;
  prazo: string;
  autorNome: string;
  autorEmail: string;
  autorWhatsapp: string;
  // compat legado para telas antigas:
  whatsapp?: string;
  // texto livre quando categoria = "Outros"
  outraCategoriaTexto: string;
};

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const RASCUNHO_KEY = "pedraum:create-demandas:draft_v2";

/* ================== Página ================== */
export default function CreateDemandaPage() {
  const router = useRouter();

  const [imagens, setImagens] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>({
    titulo: "",
    descricao: "",
    categoria: "",
    subcategoria: "",
    estado: "",
    cidade: "",
    prazo: "",
    autorNome: "",
    autorEmail: "",
    autorWhatsapp: "",
    whatsapp: "",
    outraCategoriaTexto: "",
  });

  const [cidades, setCidades] = useState<string[]>([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);
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
        if (p?.form) {
          setForm((prev) => ({
            ...prev,
            ...Object.fromEntries(
              Object.entries(p.form).filter(([k]) =>
                [
                  "titulo","descricao","categoria","subcategoria",
                  "estado","cidade","prazo",
                  "autorNome","autorEmail","autorWhatsapp","whatsapp",
                  "outraCategoriaTexto",
                ].includes(k)
              )
            ),
          }));
        }
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
          autorNome: prev.autorNome || prof?.nome || user.displayName || "",
          autorEmail: prev.autorEmail || prof?.email || user.email || "",
          autorWhatsapp: prev.autorWhatsapp || prof?.whatsapp || prof?.telefone || "",
          // 👇 compat com telas antigas:
          whatsapp: prev.whatsapp || prof?.whatsapp || prof?.telefone || "",
        }));
      } catch {
        setForm((prev) => ({
          ...prev,
          autorNome: prev.autorNome || auth.currentUser?.displayName || "",
          autorEmail: prev.autorEmail || auth.currentUser?.email || "",
        }));
      }
    });
    return () => unsub();
  }, []);

  /* ---------- Cidades por UF (IBGE) ---------- */
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

  /* ---------- Handlers ---------- */
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target as any;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "estado" ? { cidade: "" } : null),
      ...(name === "categoria" ? { subcategoria: "", outraCategoriaTexto: "" } : null),
    }));
  }

  const isOutros = form.categoria === "Outros";

  const subcategoriasDisponiveis =
    categorias.find((c) => c.nome === form.categoria)?.subcategorias || [];

  /* ---------- Preview ---------- */
  const preview = useMemo(() => {
    const local = form.estado ? `${form.cidade ? form.cidade + ", " : ""}${form.estado}` : "—";
    return {
      titulo: form.titulo?.trim() || "—",
      categoria: form.categoria || "—",
      subcategoria: isOutros
        ? (form.outraCategoriaTexto?.trim() || "—")
        : (form.subcategoria || "—"),
      local,
      prazo: form.prazo || "—",
      imagens: imagens.length,
    };
  }, [form, imagens, isOutros]);

  /* ---------- Submit ---------- */
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

    // regras: se categoria = "Outros", exige texto livre; senão, subcategoria é obrigatória
    const subcategoriaOk = isOutros ? !!form.outraCategoriaTexto.trim() : !!form.subcategoria;

    if (
      !form.titulo ||
      !form.descricao ||
      !form.categoria ||
      !subcategoriaOk ||
      !form.prazo ||
      !form.estado ||
      !form.cidade
    ) {
      setError("Preencha todos os campos obrigatórios (*).");
      setLoading(false);
      return;
    }

    try {
      const searchBase = [
        form.titulo, form.descricao, form.categoria,
        isOutros ? form.outraCategoriaTexto : form.subcategoria,
        form.estado, form.cidade,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const payload = {
        titulo: form.titulo,
        descricao: form.descricao,
        categoria: form.categoria,
        subcategoria: isOutros ? "Outros (livre)" : form.subcategoria,
        outraCategoriaTexto: isOutros ? form.outraCategoriaTexto.trim() : "",
        estado: form.estado,
        cidade: form.cidade,
        prazo: form.prazo,

        // novos
        autorNome: form.autorNome || "",
        autorEmail: form.autorEmail || "",
        autorWhatsapp: form.autorWhatsapp || "",

        // compat legado p/ admin antigo
        whatsapp: form.whatsapp || form.autorWhatsapp || "",

        imagens,
        imagesCount: imagens.length,
        searchKeywords: searchBase.split(/\s+/).slice(0, 60),

        status: "Aberta",
        statusHistory: [{ status: "Aberta", at: new Date() }],

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

  /* ---------- UI ---------- */
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
            Quanto mais detalhes, melhor a conexão com fornecedores ideais. Você pode anexar imagens.
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

          {/* Categoria / Subcategoria */}
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
                {categorias.map((cat) => (
                  <option key={cat.nome} value={cat.nome}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                <Layers size={15} /> {isOutros ? "Descreva sua necessidade *" : "Subcategoria *"}
              </label>

              {/* Quando "Outros": input de texto livre; senão: select de subcategoria */}
              {isOutros ? (
                <input
                  name="outraCategoriaTexto"
                  value={form.outraCategoriaTexto}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Descreva com suas palavras o que você precisa"
                  required
                />
              ) : (
                <select
                  name="subcategoria"
                  value={form.subcategoria}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                  disabled={!form.categoria}
                >
                  <option value="">
                    {form.categoria ? "Selecione" : "Selecione a categoria primeiro"}
                  </option>
                  {subcategoriasDisponiveis.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Localização */}
          <div style={sectionCardStyle}>
            <h3 style={sectionTitleStyle}>
              <MapPin className="w-5 h-5 text-orange-500" /> Localização
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap:4 md:gap-4">
              <div>
                <label style={labelStyle}>Estado (UF) *</label>
                <select
                  name="estado"
                  value={form.estado}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                >
                  <option value="">Selecione o Estado</option>
                  {ESTADOS.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label style={labelStyle}>Cidade *</label>
                <select
                  name="cidade"
                  value={form.cidade}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                  disabled={!form.estado || carregandoCidades}
                >
                  <option value="">
                    {carregandoCidades
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
            </div>
          </div>

          {/* Dados do autor (autofill + editável) */}
          <div style={sectionCardStyle}>
            <h3 style={sectionTitleStyle}>
              <Info className="w-5 h-5 text-orange-500" /> Seus dados (editáveis)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label style={labelStyle}>Nome *</label>
                <input
                  name="autorNome"
                  value={form.autorNome}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label style={labelStyle}>E-mail *</label>
                <input
                  name="autorEmail"
                  value={form.autorEmail}
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
                  name="autorWhatsapp"
                  value={form.autorWhatsapp}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="(xx) xxxxx-xxxx"
                  inputMode="tel"
                />
              </div>
            </div>
          </div>

          {/* Pré-visualização */}
          <div style={previewCardStyle}>
            <div style={{ fontWeight: 800, color: "#023047", marginBottom: 8 }}>
              Pré-visualização
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
              <div><span style={muted}>Título:</span> {preview.titulo}</div>
              <div><span style={muted}>Categoria:</span> {preview.categoria}</div>
              <div><span style={muted}>Subcategoria/Texto:</span> {preview.subcategoria}</div>
              <div><span style={muted}>Local:</span> {preview.local}</div>
              <div><span style={muted}>Prazo:</span> {preview.prazo}</div>
              <div><span style={muted}>Imagens:</span> {preview.imagens}</div>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
              {savingDraft ? "Salvando rascunho..." : "Rascunho salvo automaticamente"}
            </div>
          </div>

          {/* Alertas */}
          {error && <div style={errorStyle}>{error}</div>}
          {success && <div style={successStyle}>{success}</div>}

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
