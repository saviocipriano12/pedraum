"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { db, auth } from "@/firebaseConfig";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

/* ========= COMPONENTES ORIGINAIS (sem alterar) ========= */
import RawImageUploader from "@/components/ImageUploader";
const DrivePDFViewer: any = dynamic(() => import("@/components/DrivePDFViewer"), { ssr: false });
import { UploadButton as RawUploadButton } from "@/utils/uploadthing";
const UploadButton: any = RawUploadButton as any;

/* ========= ADAPTADORES LOCAIS (não mexem nos originais) ========= */

/** 
 * Envia o array de imagens sob vários nomes comuns (images, imagens, value, files, list, items),
 * e também expõe callbacks que costumam existir. Isso evita `undefined.map`.
 */
function ImageUploaderAdapter(props: {
  images: string[];
  onAdd: (urls: string[]) => void;
  onRemove: (url: string) => void;
  max?: number;
}) {
  const Comp: any = RawImageUploader;

  const passCommonArrays = {
    images: props.images,
    imagens: props.images,
    value: props.images,
    files: props.images,
    list: props.images,
    items: props.images,
    existingImages: props.images,
  };

  const passCommonHandlers = {
    onImagesAdded: (urls: string[]) => props.onAdd(urls),
    onChange: (urls: string[]) => props.onAdd(urls),
    onAdd: (urls: string[]) => props.onAdd(urls),
    setImages: (urls: string[]) => props.onAdd(urls),
    onRemoveImage: (url: string) => props.onRemove(url),
    onRemove: (url: string) => props.onRemove(url),
  };

  return (
    <Comp
      {...passCommonArrays}
      {...passCommonHandlers}
      maxImages={props.max ?? 5}
      limit={props.max ?? 5}
      max={props.max ?? 5}
    />
  );
}

/** DrivePDFViewer pode esperar `url`, `fileUrl` ou `src`. Enviamos as três. */
function PDFThumb({ url, height = 180 }: { url: string; height?: number }) {
  const Comp: any = DrivePDFViewer;
  return <Comp url={url} fileUrl={url} src={url} height={height} />;
}

/* ===================== Tipos ===================== */
type Produto = {
  id?: string;
  titulo?: string;
  descricao?: string;
  preco?: number | null;
  categoria?: string;
  subcategoria?: string;
  uf?: string;
  cidade?: string;
  imagens?: string[];
  pdfs?: { name: string; url: string }[];
  createdAt?: any;
  updatedAt?: any;
  userId?: string;
};

/* ===================== Página ===================== */
export default function EditProdutoPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Campos
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState<string>("");
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");

  // Mídias
  const [imagens, setImagens] = useState<string[]>([]);
  const [pdfs, setPdfs] = useState<{ name: string; url: string }[]>([]);

  /* ---------- Auth Gate ---------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      if (!user) router.push("/auth/login?next=" + encodeURIComponent(`/edit-produto/${id}`));
    });
    return () => unsub();
  }, [id, router]);

  /* ---------- Load Produto ---------- */
  useEffect(() => {
    if (!id || !authReady) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const ref = doc(db, "produtos", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError("Produto não encontrado.");
          setLoading(false);
          return;
        }
        const data = snap.data() as Produto;

        setTitulo(data.titulo ?? "");
        setDescricao(data.descricao ?? "");
        setPreco(typeof data.preco === "number" && !Number.isNaN(data.preco) ? String(data.preco) : "");
        setCategoria(data.categoria ?? "");
        setSubcategoria(data.subcategoria ?? "");
        setUf(data.uf ?? "");
        setCidade(data.cidade ?? "");
        setImagens(Array.isArray(data.imagens) ? data.imagens.slice(0, 5) : []);
        setPdfs(Array.isArray(data.pdfs) ? data.pdfs : []);

        setLoading(false);
      } catch (e) {
        console.error(e);
        setError("Falha ao carregar o produto.");
        setLoading(false);
      }
    })();
  }, [id, authReady]);

  /* ---------- Helpers ---------- */
  const canSave = useMemo(() => titulo.trim().length > 2 && descricao.trim().length > 5, [titulo, descricao]);

  const handleAddImages = (urls: string[]) => {
    setImagens((prev) => {
      const merged = [...prev, ...urls].filter(Boolean);
      const unique = Array.from(new Set(merged));
      return unique.slice(0, 5);
    });
  };
  const handleRemoveImage = (url: string) => setImagens((prev) => prev.filter((u) => u !== url));

  const handleAddPdfs = (newFiles: { name: string; url: string }[]) => {
    setPdfs((prev) => {
      const urls = new Set(prev.map((p) => p.url));
      const merged = [...prev];
      for (const f of newFiles) if (f?.url && !urls.has(f.url)) merged.push({ name: f.name || "Documento.pdf", url: f.url });
      return merged;
    });
  };
  const handleRemovePdf = (url: string) => setPdfs((prev) => prev.filter((p) => p.url !== url));

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const payload: Partial<Produto> = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        preco: preco ? Number(preco) : null,
        categoria: categoria || "",
        subcategoria: subcategoria || "",
        uf: uf || "",
        cidade: cidade || "",
        imagens: imagens.slice(0, 5),
        pdfs,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, "produtos", id), payload as any);
      setSuccessMsg("Produto atualizado com sucesso!");
    } catch (e) {
      console.error(e);
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- UI ---------- */
  if (!authReady || loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Carregando produto…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="size-5" />
          <span>{error}</span>
        </div>
        <div className="mt-4">
          <Link href="/dashboard" className="text-blue-600 hover:underline inline-flex items-center gap-2">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>

      {successMsg && (
        <div className="mb-6 rounded-xl border border-green-300/50 bg-green-50 p-4 text-green-700 flex items-center gap-2">
          <CheckCircle2 className="size-5" /> {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA ESQUERDA: Campos */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Informações do Produto</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Título</label>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex.: Britador Mandíbulas 8050" />
            </div>

            <div>
              <label className="block text-sm mb-1">Preço (R$)</label>
              <input
                value={preco}
                onChange={(e) => {
                  const v = e.target.value.replace(",", ".");
                  if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) setPreco(v);
                }}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex.: 125000"
                inputMode="decimal"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Categoria</label>
              <input value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex.: Máquinas" />
            </div>

            <div>
              <label className="block text-sm mb-1">Subcategoria</label>
              <input value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex.: Britadores" />
            </div>

            <div>
              <label className="block text-sm mb-1">UF</label>
              <input value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} maxLength={2} className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex.: MG" />
            </div>

            <div>
              <label className="block text-sm mb-1">Cidade</label>
              <input value={cidade} onChange={(e) => setCidade(e.target.value)} className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex.: Belo Horizonte" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Descrição</label>
              <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className="min-h-[140px] w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Detalhes técnicos, estado de conservação, observações…" />
            </div>
          </div>
        </motion.div>

        {/* COLUNA DIREITA: Mídias */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Imagens */}
          <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <ImageIcon className="size-4" />
                Imagens (máx. 5)
              </h3>
              <span className="text-xs text-muted-foreground">{imagens.length}/5</span>
            </div>

            {/* Uploader de imagem via adaptador */}
            <ImageUploaderAdapter images={imagens} onAdd={handleAddImages} onRemove={handleRemoveImage} max={5} />

            {/* Grade de imagens (sempre exibe) */}
            {imagens.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {imagens.map((url) => (
                  <div key={url} className="relative group rounded-xl overflow-hidden border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Imagem do produto" className="h-28 w-full object-cover" />
                    <button onClick={() => handleRemoveImage(url)} className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-lg p-1 shadow" title="Remover" type="button">
                      <Trash2 className="size-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PDFs */}
          <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <FileText className="size-4" />
              Documentos (PDF)
            </h3>

            <UploadButton
              endpoint="pdfUploader" // troque se o seu endpoint tiver outro nome
              onClientUploadComplete={(res: any[]) => {
                const mapped = (res ?? []).map((f: any) => ({ name: f?.name || "Documento.pdf", url: f?.url })).filter((x: any) => !!x.url);
                if (mapped.length) handleAddPdfs(mapped);
              }}
              onUploadError={(err: Error) => {
                console.error(err);
                setError("Falha no upload do PDF.");
              }}
              appearance={{ button: "rounded-xl border px-3 py-2 text-sm", container: "mb-3" }}
              content={{ button: "Anexar PDF" }}
            />

            {pdfs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum PDF anexado.</p>
            ) : (
              <div className="space-y-3">
                {pdfs.map((p) => (
                  <div key={p.url} className="rounded-xl border overflow-hidden">
                    <div className="flex items-center justify-between p-3">
                      <div className="text-sm">
                        <div className="font-medium line-clamp-1">{p.name}</div>
                        <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                          Abrir em nova aba
                        </a>
                      </div>
                      <button onClick={() => handleRemovePdf(p.url)} className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50" title="Remover PDF" type="button">
                        <Trash2 className="size-4" />
                        Remover
                      </button>
                    </div>
                    <div className="border-t">
                      <PDFThumb url={p.url} height={180} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
