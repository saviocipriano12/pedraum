"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import AuthGateRedirect from "@/components/AuthGateRedirect";
import { useRouter } from "next/navigation";
import { db, auth } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import ImageUploader from "@/components/ImageUploader";
import dynamic from "next/dynamic"; // <-- IMPORTANTE

// ✅ Usa dynamic para evitar DOMMatrix no build
const PDFUploader = dynamic(() => import("@/components/PDFUploader"), { ssr: false });
const DrivePDFViewer = dynamic(() => import("@/components/DrivePDFViewer"), { ssr: false });

import {
  Loader2, Save, Tag, DollarSign, Layers, Calendar, MapPin, BookOpen, Package, List, FileText, Upload, Image as ImageIcon
} from "lucide-react";

/* ===================== Taxonomias ===================== */
const categorias = [
  { nome: "Equipamentos de Perfuração e Demolição", subcategorias: [
    "Perfuratrizes – Rotativas","Perfuratrizes – Pneumáticas","Perfuratrizes – Hidráulicas",
    "Martelos Demolidores – Hidráulicos","Martelos Demolidores – Pneumáticos",
    "Brocas para rocha","Coroas diamantadas","Varetas de extensão",
    "Explosivos – Dinamite","Explosivos – ANFO","Detonadores","Cordel detonante"
  ]},
  { nome: "Equipamentos de Carregamento e Transporte", subcategorias: [
    "Escavadeiras hidráulicas","Pás carregadeiras","Caminhões basculantes","Caminhões pipa",
    "Correias transportadoras","Alimentadores vibratórios","Esteiras rolantes"
  ]},
  { nome: "Britagem e Classificação", subcategorias: [
    "Britadores – Mandíbulas","Britadores – Cônicos","Britadores – Impacto","Britadores – Rolos",
    "Rebritadores","Peneiras vibratórias","Trommels","Hidrociclones","Classificadores",
    "Moinhos de bolas","Moinhos de barras","Moinhos verticais",
    "Lavadores de areia","Silos e chutes","Carcaças e bases metálicas"
  ]},
  { nome: "Beneficiamento e Processamento Mineral", subcategorias: [
    "Separadores Magnéticos","Flotação – Células","Flotação – Espumantes e coletores",
    "Filtros prensa","Espessadores","Secadores rotativos"
  ]},
  { nome: "Peças e Componentes Industriais", subcategorias: [
    "Rolamentos","Engrenagens","Polias","Eixos","Mancais","Buchas",
    "Correntes","Correias transportadoras","Esticadores de correia","Parafusos e porcas",
    "Molas industriais"
  ]},
  { nome: "Desgaste e Revestimento", subcategorias: [
    "Mandíbulas","Martelos","Revestimentos de britadores","Chapas de desgaste",
    "Barras de impacto","Grelhas","Telas metálicas","Telas em borracha"
  ]},
  { nome: "Automação, Elétrica e Controle", subcategorias: [
    "Motores elétricos","Inversores de frequência","Painéis elétricos","Controladores ASRi",
    "Soft starters","Sensores e detectores","Detectores de metais","CLPs e módulos"
  ]},
  { nome: "Lubrificação e Produtos Químicos", subcategorias: [
    "Óleos lubrificantes","Graxas industriais","Selantes industriais",
    "Desengripantes","Produtos químicos para peneiramento"
  ]},
  { nome: "Equipamentos Auxiliares e Ferramentas", subcategorias: [
    "Compressores de Ar – Estacionários","Compressores de Ar – Móveis","Geradores de Energia",
    "Bombas de água","Bombas de lama","Ferramentas manuais","Ferramentas elétricas",
    "Mangueiras e Conexões Hidráulicas","Iluminação Industrial","Abraçadeiras e Fixadores",
    "Soldas e Eletrodos","Equipamentos de Limpeza Industrial"
  ]},
  { nome: "EPIs (Equipamentos de Proteção Individual)", subcategorias: [
    "Capacetes","Protetores auriculares","Máscaras contra poeira","Respiradores",
    "Luvas","Botas de segurança","Óculos de proteção","Colete refletivo"
  ]},
  { nome: "Instrumentos de Medição e Controle", subcategorias: [
    "Monitoramento de Estabilidade","Inclinômetros","Extensômetros","Análise de Material",
    "Teor de umidade","Granulometria","Sensores de nível e vazão","Sistemas de controle remoto"
  ]},
  { nome: "Manutenção e Serviços Industriais", subcategorias: [
    "Filtros de ar e combustível","Óleos hidráulicos e graxas","Rolamentos e correias",
    "Martelos e mandíbulas para britadores","Pastilhas de desgaste",
    "Serviços de manutenção industrial","Usinagem e caldeiraria"
  ]},
  { nome: "Veículos e Pneus", subcategorias: [
    "Pneus industriais","Rodas e aros","Recapagens e reformas de pneus",
    "Serviços de montagem e balanceamento"
  ]},
  { nome: "Outros", subcategorias: ["Outros equipamentos","Produtos diversos","Serviços diversos"] }
];
const condicoes = ["Nova", "Seminova", "Usada"];
const estados = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

/* ===================== Page Wrapper ===================== */
export default function CreateProdutoPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[#023047]">Carregando…</div>}>
      <CreateProdutoForm />
    </Suspense>
  );
}

/* ===================== Form Component ===================== */
function CreateProdutoForm() {
  const router = useRouter();

  // imagens e PDF
  const [imagens, setImagens] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // form
  const [form, setForm] = useState({
    nome: "",
    tipo: "produto",
    categoria: "",
    subcategoria: "",
    preco: "",
    estado: "",
    cidade: "",
    ano: "",
    condicao: "",
    descricao: ""
  });

  // cidades por UF (IBGE)
  const [cidades, setCidades] = useState<string[]>([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: value,
      ...(name === "categoria" ? { subcategoria: "" } : null),
      ...(name === "estado" ? { cidade: "" } : null),
    }));
  }

  // carrega cidades ao escolher UF (IBGE)
  useEffect(() => {
    let abort = false;
    async function fetchCidades(uf: string) {
      if (!uf) {
        setCidades([]);
        return;
      }
      setCarregandoCidades(true);
      try {
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/distritos`, { cache: "no-store" });
        const data = (await res.json()) as Array<{ nome: string }>;
        if (abort) return;
        const nomes = Array.from(new Set(data.map((d) => d.nome))).sort((a, b) =>
          a.localeCompare(b, "pt-BR")
        );
        setCidades(nomes);
      } catch {
        if (!abort) setCidades([]);
      } finally {
        if (!abort) setCarregandoCidades(false);
      }
    }
    fetchCidades(form.estado);
    return () => { abort = true; };
  }, [form.estado]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const user = auth.currentUser;
    if (!user) {
      setError("Você precisa estar logado para cadastrar um produto.");
      setLoading(false);
      return;
    }

    // validações
    if (
      !form.nome ||
      !form.tipo ||
      !form.estado ||
      !form.cidade ||
      !form.descricao ||
      !form.categoria ||
      !form.subcategoria ||
      !form.ano ||
      !form.condicao
    ) {
      setError("Preencha todos os campos obrigatórios.");
      setLoading(false);
      return;
    }

    if (imagens.length === 0) {
      setError("Envie pelo menos uma imagem.");
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(now.getDate() + 45); // 45 dias

      await addDoc(collection(db, "produtos"), {
        ...form,
        preco: form.preco ? parseFloat(form.preco) : null,
        imagens,
        pdfUrl: pdfUrl || null, // salva a URL do PDF (Firebase Storage ou externa)
        userId: user.uid,
        createdAt: serverTimestamp(),
        expiraEm: Timestamp.fromDate(expiresAt),
        status: "ativo",
        updatedAt: serverTimestamp(),
        visivel: true,
      });

      setSuccess("Produto cadastrado com sucesso!");
      setForm({
        nome: "",
        tipo: "produto",
        categoria: "",
        subcategoria: "",
        preco: "",
        estado: "",
        cidade: "",
        ano: "",
        condicao: "",
        descricao: ""
      });
      setImagens([]);
      setPdfUrl(null);
      setTimeout(() => router.push("/vitrine"), 1000);
    } catch (err) {
      setError("Erro ao cadastrar. Tente novamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const subcategoriasDisponiveis =
    categorias.find((c) => c.nome === form.categoria)?.subcategorias || [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#e0e7ef] flex flex-col items-center py-8 px-2 sm:px-4">
      <section
        style={{
          maxWidth: 960,
          width: "100%",
          background: "#fff",
          borderRadius: 22,
          boxShadow: "0 8px 40px rgba(2,48,71,0.08)",
          padding: "40px 2vw 48px 2vw",
          marginTop: 18,
          border: "1px solid #eef2f7",
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1
            style={{
              fontSize: "2.2rem",
              fontWeight: 900,
              color: "#023047",
              letterSpacing: "-0.5px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Package className="w-9 h-9 text-orange-500" />
            Cadastrar Produto
          </h1>
          <div className="hidden sm:flex text-sm text-slate-500 font-semibold">
            Campos marcados com * são obrigatórios
          </div>
        </div>

        {/* Gate de autenticação */}
        <AuthGateRedirect />

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* ================= Uploads (Imagens + PDF) ================= */}
          <div
            className="rounded-2xl border"
            style={{
              background: "linear-gradient(180deg,#f8fbff, #ffffff)",
              borderColor: "#e6ebf2",
              padding: "18px",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Upload className="w-4 h-4 text-slate-700" />
              <h3 className="text-slate-800 font-black tracking-tight">Arquivos do anúncio</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Card Imagens */}
              <div
                className="rounded-xl border overflow-hidden"
                style={{
                  borderColor: "#e6ebf2",
                  background:
                    "radial-gradient(1200px 300px at -200px -200px, #eef6ff 0%, transparent 60%), #ffffff",
                }}
              >
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-sky-700" />
                  <strong className="text-[#0f172a]">Imagens do Produto *</strong>
                </div>
                <div className="px-4 pb-4">
                  <div className="rounded-lg border border-dashed p-3">
                    <ImageUploader imagens={imagens} setImagens={setImagens} max={5} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Envie até 5 imagens (JPG/PNG). Dica: use fotos nítidas e com boa iluminação.
                  </p>
                </div>
              </div>

              {/* Card PDF */}
              <div
                className="rounded-xl border overflow-hidden"
                style={{
                  borderColor: "#e6ebf2",
                  background:
                    "radial-gradient(1200px 300px at -200px -200px, #fff1e6 0%, transparent 60%), #ffffff",
                }}
              >
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-600" />
                  <strong className="text-[#0f172a]">Ficha técnica (PDF) — opcional</strong>
                </div>
                <div className="px-4 pb-4 space-y-3">
                  <div className="rounded-lg border border-dashed p-3">
                    {/* O PDFUploader deve retornar a URL final do arquivo (ex.: Firebase Storage) */}
                    <PDFUploader mode="create" onUploaded={setPdfUrl} />
                  </div>

                  {pdfUrl ? (
  <div className="rounded-lg border overflow-hidden" style={{ height: 300 }}>
    <DrivePDFViewer
  fileUrl={`/api/pdf-proxy?file=${encodeURIComponent(pdfUrl || "")}`}
  height={300}
/>
  </div>
) : (
  <p className="text-xs text-slate-500">
    Anexe manuais, especificações ou ficha técnica (até 8MB).
  </p>
)}
                </div>
              </div>
            </div>
          </div>

          {/* ================= Campos ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <FormField label="Nome *" icon={<Tag size={15} />}>
              <input
                name="nome"
                value={form.nome}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Ex: Pá carregadeira, motor, filtro, etc."
                required
              />
            </FormField>

            {/* Tipo */}
            <FormField label="Tipo *" icon={<Layers size={15} />}>
              <select
                name="tipo"
                value={form.tipo}
                onChange={handleChange}
                style={inputStyle}
                required
              >
                <option value="produto">Produto</option>
                <option value="máquina">Máquina</option>
              </select>
            </FormField>

            {/* Categoria */}
            <FormField label="Categoria *" icon={<List size={15} />}>
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
            </FormField>

            {/* Subcategoria */}
            <FormField label="Subcategoria *" icon={<Tag size={15} />}>
              <select
                name="subcategoria"
                value={form.subcategoria}
                onChange={handleChange}
                style={inputStyle}
                required
                disabled={!form.categoria}
              >
                <option value="">{form.categoria ? "Selecione" : "Selecione a categoria primeiro"}</option>
                {subcategoriasDisponiveis.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Preço */}
            <FormField label="Preço (R$)" icon={<DollarSign size={15} />}>
              <input
                name="preco"
                value={form.preco}
                onChange={handleChange}
                type="number"
                style={inputStyle}
                placeholder="Ex: 15000"
                min={0}
                step={0.01}
              />
            </FormField>

            {/* Ano */}
            <FormField label="Ano *" icon={<Calendar size={15} />}>
              <input
                name="ano"
                value={form.ano}
                onChange={handleChange}
                type="number"
                style={inputStyle}
                placeholder="Ex: 2021"
                required
                min={1900}
              />
            </FormField>

            {/* Condição */}
            <FormField label="Condição *" icon={<Tag size={15} />}>
              <select
                name="condicao"
                value={form.condicao}
                onChange={handleChange}
                style={inputStyle}
                required
              >
                <option value="">Selecione</option>
                {condicoes.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </FormField>

            {/* Estado */}
            <FormField label="Estado *" icon={<MapPin size={15} />}>
              <select
                name="estado"
                value={form.estado}
                onChange={handleChange}
                style={inputStyle}
                required
              >
                <option value="">Selecione</option>
                {estados.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Cidade (dependente da UF) */}
          <FormField label="Cidade *" icon={<MapPin size={15} />}>
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
          </FormField>

          {/* Descrição */}
          <FormField label="Descrição *" icon={<BookOpen size={15} />}>
            <textarea
              name="descricao"
              value={form.descricao}
              onChange={handleChange}
              style={{ ...inputStyle, height: 110 }}
              placeholder="Descreva com detalhes o produto, condição, uso, etc."
              rows={4}
              required
            />
          </FormField>

          {/* Alerts */}
          {error && (
            <div
              style={{
                background: "#fff7f7",
                color: "#d90429",
                border: "1.5px solid #ffe5e5",
                padding: "12px 0",
                borderRadius: 11,
                textAlign: "center",
                marginTop: -10,
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
                marginTop: -10,
                fontWeight: 700,
              }}
            >
              {success}
            </div>
          )}

          {/* Submit */}
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
              fontSize: 20,
              boxShadow: "0 8px 40px rgba(251,133,0,0.25)",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginTop: 4,
            }}
          >
            {loading ? <Loader2 className="animate-spin w-6 h-6" /> : <Save className="w-5 h-5" />}
            {loading ? "Salvando..." : "Cadastrar Produto"}
          </button>
        </form>
      </section>
    </main>
  );
}

/* ===================== UI helpers ===================== */
function FormField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

/* ===================== Estilos ===================== */
const labelStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#023047",
  marginBottom: 6,
  display: "flex",
  alignItems: "center",
  gap: 6,
  letterSpacing: -0.2,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 12,
  border: "1.6px solid #e5e7eb",
  fontSize: 16,
  color: "#0f172a",
  background: "#f8fafc",
  fontWeight: 600,
  marginBottom: 2,
  outline: "none",
  marginTop: 2,
  minHeight: 46,
  boxShadow: "0 0 0 0 rgba(0,0,0,0)",
};
