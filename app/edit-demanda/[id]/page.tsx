// app/edit/demanda/page.tsx
"use client";

import AuthGateRedirect from "@/components/AuthGateRedirect";
import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { db, auth } from "@/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  DocumentData,
} from "firebase/firestore";
import ImageUploader from "@/components/ImageUploader";
import nextDynamic from "next/dynamic";
import {
  Loader2,
  Save,
  Tag,
  MapPin,
  CheckCircle2,
  Sparkles,
  Upload,
  BookOpen,
  List,
  Layers,
  Info,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useTaxonomia } from "@/hooks/useTaxonomia";

export const dynamic = "force-dynamic";

const PDFUploader = nextDynamic(() => import("@/components/PDFUploader"), { ssr: false });
const DrivePDFViewer = nextDynamic(() => import("@/components/DrivePDFViewer"), { ssr: false });

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
  whatsapp?: string;
  outraCategoriaTexto: string;
  imagens: string[];
  pdfUrl: string | null;
  status?: string;
};

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function EditDemandaPage() {
  const router = useRouter();
  const { id } = useParams();

  const { categorias, loading: taxLoading } = useTaxonomia();

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
    imagens: [],
    pdfUrl: null,
    status: "Aberta",
  });

  const [cidades, setCidades] = useState<string[]>([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const initialStatusRef = useRef<string | null>(null);

  /* ---------- fetch demanda ---------- */
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const ref = doc(db, "demandas", String(id));
        const snap = await getDoc(ref);
        if (!mounted) return;
        if (!snap.exists()) {
          setError("Demanda não encontrada.");
          return;
        }
        const data = snap.data() as DocumentData;
        setForm((prev) => ({
          ...prev,
          titulo: data.titulo ?? prev.titulo,
          descricao: data.descricao ?? prev.descricao,
          categoria: data.categoria ?? prev.categoria,
          subcategoria: data.subcategoria ?? prev.subcategoria,
          estado: data.estado ?? prev.estado,
          cidade: data.cidade ?? prev.cidade,
          prazo: data.prazo ?? prev.prazo,
          autorNome: data.autorNome ?? prev.autorNome,
          autorEmail: data.autorEmail ?? prev.autorEmail,
          autorWhatsapp: data.autorWhatsapp ?? prev.autorWhatsapp,
          whatsapp: data.whatsapp ?? prev.whatsapp,
          outraCategoriaTexto: data.outraCategoriaTexto ?? prev.outraCategoriaTexto,
          imagens: Array.isArray(data.imagens) ? data.imagens : prev.imagens,
          pdfUrl: data.pdfUrl ?? prev.pdfUrl,
          status: data.status ?? prev.status,
        }));
        initialStatusRef.current = data.status ?? "Aberta";
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar demanda.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  /* ---------- Cidades por UF (IBGE) ---------- */
  useEffect(() => {
    let abort = false;
    async function fetchCidades(uf: string) {
      if (!uf) {
        setCidades([]);
        return;
      }
      setCarregandoCidades(true);
      try {
        const res = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
          { cache: "no-store" }
        );
        const data = (await res.json()) as Array<{ nome: string }>;
        if (abort) return;
        const nomes = data.map((m) => m.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));
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

  /* ---------- Handlers ---------- */
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target as any;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "estado" ? { cidade: "" } : null),
      ...(name === "categoria" ? { subcategoria: "", outraCategoriaTexto: "" } : null),
    }));
  }

  /* imagens/pdf handlers */
  function setImagens(imagens: string[]) {
    setForm((prev) => ({ ...prev, imagens }));
  }
  function setPdfUrl(url: string | null) {
    setForm((prev) => ({ ...prev, pdfUrl: url }));
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
      subcategoria: isOutros ? (form.outraCategoriaTexto?.trim() || "—") : (form.subcategoria || "—"),
      local,
      prazo: form.prazo || "—",
      imagens: (form.imagens || []).length,
    };
  }, [form, isOutros]);

  /* ---------- Submit (update) ---------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const subcategoriaOk = isOutros ? !!form.outraCategoriaTexto?.trim() : !!form.subcategoria;
    if (!form.titulo || !form.descricao || !form.categoria || !subcategoriaOk || !form.prazo || !form.estado || !form.cidade) {
      setError("Preencha todos os campos obrigatórios (*).");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError("Você precisa estar logado para editar a demanda.");
      return;
    }

    setSaving(true);
    try {
      const ref = doc(db, "demandas", String(id));

      const payload: Partial<FormState & { updatedAt: any; statusHistory?: any[] }> = {
        titulo: form.titulo,
        descricao: form.descricao,
        categoria: form.categoria,
        subcategoria: isOutros ? "Outros (livre)" : form.subcategoria,
        outraCategoriaTexto: isOutros ? form.outraCategoriaTexto?.trim() : "",
        estado: form.estado,
        cidade: form.cidade,
        prazo: form.prazo,
        autorNome: form.autorNome || "",
        autorEmail: form.autorEmail || "",
        autorWhatsapp: form.autorWhatsapp || "",
        whatsapp: form.whatsapp || form.autorWhatsapp || "",
        imagens: form.imagens || [],
        pdfUrl: form.pdfUrl || null,
        status: form.status || "Aberta",
        updatedAt: serverTimestamp(),
      };

      await updateDoc(ref, payload as any);

      setSuccess("Demanda atualizada com sucesso!");
      router.replace("/demandas");
    } catch (err) {
      console.error(err);
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------- UI ---------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-3" />
          <div className="font-bold text-slate-700">Carregando demanda...</div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center py-8 px-2 sm:px-4"
      style={{ background: "linear-gradient(135deg, #f7f9fb, #ffffff 45%, #e0e7ef)" }}>
      <div className="w-full max-w-3xl px-2 mb-3 flex">
        <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-sm shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
          style={{ background: "linear-gradient(90deg,#e0e7ef,#f8fafc)", border: "1.5px solid #cfd8e3", color: "#023047" }}>
          <ArrowLeft className="w-4 h-4 text-orange-500" /> Voltar
        </button>
      </div>

      <section style={{ maxWidth: 760, width: "100%", background: "#fff", borderRadius: 22, boxShadow: "0 4px 32px #0001", padding: "48px 2vw 55px 2vw", marginTop: 8, border: "1px solid #eef2f7" }}>
        <AuthGateRedirect />

        <h1 style={{ fontSize: "2.3rem", fontWeight: 900, color: "#023047", letterSpacing: "-1px", margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: 10 }}>
          <Sparkles className="w-9 h-9 text-orange-500" /> Editar Demanda
        </h1>

        <div style={hintCardStyle}>
          <Info className="w-5 h-5" />
          <p style={{ margin: 0 }}>Aqui você pode ajustar título, descrição, categoria, anexos e contato. Alterações são salvas no Firestore.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Categoria / Subcategoria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}><List size={15} /> Categoria *</label>
              <select name="categoria" value={form.categoria} onChange={handleChange} style={inputStyle} required>
                <option value="">{taxLoading ? "Carregando..." : "Selecione"}</option>
                {categorias.map((cat) => (
                  <option key={cat.slug ?? cat.nome} value={cat.nome}>{cat.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}><Layers size={15} /> {form.categoria === "Outros" ? "Descreva sua necessidade *" : "Subcategoria *"}</label>
              {form.categoria === "Outros" ? (
                <input name="outraCategoriaTexto" value={form.outraCategoriaTexto} onChange={handleChange} style={inputStyle} placeholder="Descreva com suas palavras o que você precisa" required />
              ) : (
                <select name="subcategoria" value={form.subcategoria} onChange={handleChange} style={inputStyle} required disabled={!form.categoria}>
                  <option value="">{form.categoria ? "Selecione" : "Selecione a categoria primeiro"}</option>
                  {subcategoriasDisponiveis.map((sub) => (
                    <option key={sub.slug ?? sub.nome} value={sub.nome}>{sub.nome}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          {/* ... resto do form igual ao seu atual (imagens, pdf, localização, autor, preview, botão) ... */}
        </form>
      </section>
    </main>
  );
}

/* ---------- Estilos ---------- */
const labelStyle: React.CSSProperties = { fontWeight: 800, color: "#023047", marginBottom: 4, display: "flex", alignItems: "center", gap: 6, fontSize: 14 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "13px 14px", borderRadius: 12, border: "1.6px solid #e5e7eb", fontSize: 16, color: "#0f172a", background: "#f8fafc", fontWeight: 600, marginBottom: 6, outline: "none", marginTop: 2, minHeight: 46 };
const hintCardStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, background: "#eef6ff", border: "1.6px solid #dbeafe", color: "#0c4a6e", padding: "12px 14px", borderRadius: 14, marginBottom: 16 };
const smallInfoStyle: React.CSSProperties = { fontSize: 12, color: "#64748b", marginTop: 4 };
const errorStyle: React.CSSProperties = { background: "#fff7f7", color: "#d90429", border: "1.5px solid #ffe5e5", padding: "12px", borderRadius: 11, textAlign: "center", fontWeight: 700 };
const successStyle: React.CSSProperties = { background: "#f7fafc", color: "#16a34a", border: "1.5px solid #c3f3d5", padding: "12px", borderRadius: 11, textAlign: "center", fontWeight: 700 };
const muted: React.CSSProperties = { color: "#6b7280" };
