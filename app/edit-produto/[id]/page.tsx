// app/produtos/[id]/editar/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { Loader2, Save, ArrowLeft } from "lucide-react";

/** =========================
 *  Tipos
 *  ========================= */
type Produto = {
  titulo: string;
  descricao?: string;
  preco?: number; // em centavos OU reais? Aqui tratamos como reais no formulário.
  categoria?: string;
  ativo?: boolean;
  atualizadoEm?: Timestamp;
};

function isEmpty(str?: string | null) {
  return !str || str.trim().length === 0;
}

/** =========================
 *  Página
 *  ========================= */
export default function EditarProdutoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [form, setForm] = useState<Produto>({
    titulo: "",
    descricao: "",
    preco: undefined,
    categoria: "",
    ativo: true,
  });

  const docRef = useMemo(() => (id ? doc(db, "produtos", id) : null), [id]);

  /** Carrega dados do produto */
  useEffect(() => {
    let ativo = true;
    async function run() {
      if (!docRef) return;
      setCarregando(true);
      setErro(null);
      try {
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          setErro("Produto não encontrado.");
          setCarregando(false);
          return;
        }
        const data = snap.data() as Produto;

        // Normalização simples
        setForm({
          titulo: data.titulo ?? "",
          descricao: data.descricao ?? "",
          // Se o preço estiver salvo em centavos, ajuste aqui conforme seu padrão:
          // preco: typeof data.preco === "number" ? data.preco / 100 : undefined,
          preco: typeof data.preco === "number" ? data.preco : undefined,
          categoria: data.categoria ?? "",
          ativo: typeof data.ativo === "boolean" ? data.ativo : true,
        });
      } catch (e: any) {
        if (!ativo) return;
        setErro(e?.message || "Falha ao carregar o produto.");
      } finally {
        if (!ativo) return;
        setCarregando(false);
      }
    }
    run();
    return () => {
      ativo = false;
    };
  }, [docRef]);

  /** Handlers */
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    if (name === "preco") {
      // Mantém como número (reais). Ajuste para centavos se preferir.
      const num = value.replace(",", "."); // permite vírgula
      const parsed = num === "" ? undefined : Number(num);
      setForm((f) => ({ ...f, preco: isNaN(parsed as number) ? undefined : parsed }));
      return;
    }
    if (type === "checkbox") {
      const target = e.target as HTMLInputElement;
      setForm((f) => ({ ...f, [name]: target.checked }));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setOkMsg(null);

    // Validação básica
    if (isEmpty(form.titulo)) {
      setErro("O título é obrigatório.");
      return;
    }
    if (form.preco !== undefined && form.preco < 0) {
      setErro("Preço inválido.");
      return;
    }

    if (!docRef) {
      setErro("Referência inválida do produto.");
      return;
    }

    setSalvando(true);
    try {
      // Se quiser salvar em centavos, converta aqui:
      // const precoEmCentavos = typeof form.preco === "number" ? Math.round(form.preco * 100) : undefined;

      await updateDoc(docRef, {
        titulo: form.titulo.trim(),
        descricao: (form.descricao || "").trim(),
        // preco: precoEmCentavos,
        preco: typeof form.preco === "number" ? form.preco : null,
        categoria: (form.categoria || "").trim(),
        ativo: !!form.ativo,
        atualizadoEm: serverTimestamp(),
      });

      setOkMsg("Produto atualizado com sucesso!");
      // Redirecionar após salvar? Descomente se quiser:
      // router.push(`/produtos/${id}`);
    } catch (e: any) {
      setErro(e?.message || "Falha ao salvar as alterações.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando produto...</span>
        </div>
      </div>
    );
  }

  if (erro && !salvando && isEmpty(form.titulo) && !okMsg) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-4">
          <Link
            href="/produtos"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {erro}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/produtos"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <h1 className="text-xl font-semibold">Editar Produto</h1>
      </div>

      {/* Alertas */}
      {erro && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          {erro}
        </div>
      )}
      {okMsg && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
          {okMsg}
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Título *</label>
          <input
            name="titulo"
            value={form.titulo}
            onChange={handleChange}
            placeholder="Ex: Retroescavadeira JCB 3C"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Descrição</label>
          <textarea
            name="descricao"
            value={form.descricao}
            onChange={handleChange}
            placeholder="Detalhes do produto..."
            rows={5}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Preço (R$)</label>
            <input
              name="preco"
              value={typeof form.preco === "number" ? String(form.preco) : ""}
              onChange={handleChange}
              inputMode="decimal"
              placeholder="Ex: 15000"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Dica: use apenas números. Ajuste para centavos no backend se preferir.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Categoria</label>
            <input
              name="categoria"
              value={form.categoria}
              onChange={handleChange}
              placeholder="Ex: Máquinas"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                name="ativo"
                checked={!!form.ativo}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium">Ativo</span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={salvando}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {salvando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar alterações
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => router.push(`/produtos/${id}`)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Visualizar
          </button>
        </div>
      </form>
    </div>
  );
}
