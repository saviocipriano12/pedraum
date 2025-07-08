"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Loader, Save } from "lucide-react";
import Link from "next/link";

export default function EditProdutoPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [produto, setProduto] = useState<any>({
    nome: "",
    descricao: "",
    status: "",
    imagem: "",
  });

  useEffect(() => {
    async function fetchProduto() {
      setLoading(true);
      try {
        const ref = doc(db, "produtos", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error("Produto não encontrado!");
        setProduto({ id, ...snap.data() });
      } catch (err: any) {
        setErro(err.message || "Erro ao carregar produto");
      }
      setLoading(false);
    }
    if (id) fetchProduto();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      await updateDoc(doc(db, "produtos", id), {
        nome: produto.nome,
        descricao: produto.descricao,
        status: produto.status,
        imagem: produto.imagem,
        atualizadoEm: new Date(),
      });
      router.push("/meus-produtos");
    } catch (err: any) {
      setErro(err.message || "Erro ao salvar.");
    }
    setSalvando(false);
  }

  function handleChange(e: any) {
    setProduto((old: any) => ({
      ...old,
      [e.target.name]: e.target.value,
    }));
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader className="animate-spin mb-3" size={38} />
      <div className="text-lg font-bold text-[#219EBC]">Carregando produto...</div>
    </div>
  );

  return (
    <section style={{ maxWidth: 580, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}>
      <Link href="/meus-produtos" className="text-[#2563eb] font-bold mb-6 inline-block">
        ← Voltar para Meus Produtos
      </Link>
      <h1 className="text-2xl md:text-3xl font-black text-[#023047] mb-6">Editar Produto</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block mb-1 font-bold text-[#023047]">Nome do produto</label>
          <input
            name="nome"
            className="w-full px-4 py-3 border rounded-xl outline-none text-lg font-semibold"
            value={produto.nome}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-bold text-[#023047]">Descrição</label>
          <textarea
            name="descricao"
            className="w-full px-4 py-3 border rounded-xl outline-none text-base min-h-[90px]"
            value={produto.descricao}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block mb-1 font-bold text-[#023047]">Status</label>
          <input
            name="status"
            className="w-full px-4 py-3 border rounded-xl outline-none text-base"
            value={produto.status}
            onChange={handleChange}
            placeholder="ex: disponível, vendido..."
          />
        </div>
        <div>
          <label className="block mb-1 font-bold text-[#023047]">URL da imagem</label>
          <input
            name="imagem"
            className="w-full px-4 py-3 border rounded-xl outline-none text-base"
            value={produto.imagem}
            onChange={handleChange}
            placeholder="https://"
          />
        </div>

        {erro && (
          <div className="text-red-700 bg-red-100 border border-red-200 px-4 py-2 rounded-xl text-base text-center mb-1 w-full">
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={salvando}
          className="w-full bg-gradient-to-r from-[#FB8500] to-[#FFB703] hover:from-[#FB8500] hover:to-[#ff9800] text-white py-4 rounded-xl font-bold text-xl flex items-center justify-center transition disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
          style={{ letterSpacing: ".01em", boxShadow: "0 6px 18px #ffb70355" }}
        >
          {salvando ? (
            <Loader className="animate-spin mr-2" size={24} />
          ) : (
            <Save className="mr-2" size={24} />
          )}
          {salvando ? "Salvando..." : "Salvar Alterações"}
        </button>
      </form>
    </section>
  );
}
