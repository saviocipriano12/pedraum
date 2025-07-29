"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/firebaseConfig";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Edit, Trash2, PlusCircle, ChevronLeft } from "lucide-react";

type Produto = {
  id: string;
  nome: string;
  descricao?: string;
  preco?: number;
  imagens?: string[];
  categoria?: string;
  cidade?: string;
  estado?: string;
  status?: string;
  createdAt?: any;
  userId?: string;
};

export default function AdminProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProdutos() {
      setLoading(true);
      const snap = await getDocs(collection(db, "produtos"));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Produto));
      setProdutos(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setLoading(false);
    }
    fetchProdutos();
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm("Tem certeza que deseja excluir este produto?")) return;
    await deleteDoc(doc(db, "produtos", id));
    setProdutos(produtos => produtos.filter(p => p.id !== id));
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f9fafb",
      padding: "40px 0 0 0",
    }}>
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "0 2vw",
      }}>
        {/* Título + Botão */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 40,
          gap: 18,
          flexWrap: "wrap"
        }}>
          <Link href="/admin" style={{
            display: "flex",
            alignItems: "center",
            color: "#2563eb",
            fontWeight: 700,
            fontSize: 16,
            textDecoration: "none"
          }}>
            <ChevronLeft size={19} /> Voltar ao Painel
          </Link>
          <h1 style={{
            fontSize: "2.1rem",
            fontWeight: 800,
            color: "#134074",
            margin: 0,
            letterSpacing: "-1.2px"
          }}>
            Produtos Cadastrados
          </h1>
          <Link href="/create-produto" style={{
            background: "#FB8500",
            color: "#fff",
            fontWeight: 700,
            borderRadius: "15px",
            padding: "12px 24px",
            boxShadow: "0 4px 14px #0001",
            fontSize: "1.01rem",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 10,
            transition: "background .13s"
          }}
            onMouseOver={e => (e.currentTarget.style.background = "#e17000")}
            onMouseOut={e => (e.currentTarget.style.background = "#FB8500")}
          >
            <PlusCircle size={20} /> Novo Produto
          </Link>
        </div>

        {/* Lista de Produtos */}
        {loading ? (
          <div style={{
            color: "#FB8500", fontWeight: 700, padding: 44, textAlign: "center"
          }}>Carregando...</div>
        ) : produtos.length === 0 ? (
          <div style={{
            color: "#adb0b6", fontWeight: 600, padding: 44, textAlign: "center"
          }}>Nenhum produto encontrado.</div>
        ) : (
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 34,
            alignItems: "stretch",
            justifyContent: "flex-start"
          }}>
            {produtos.map(prod => (
              <div key={prod.id} style={{
                background: "#fff",
                borderRadius: 18,
                boxShadow: "0 2px 18px #0001",
                minWidth: 280,
                maxWidth: 370,
                flex: "1 1 320px",
                padding: "22px 24px 18px 24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                marginBottom: 10,
                position: "relative",
              }}>
                {/* Nome + Imagem */}
                <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 5 }}>
                  {prod.imagens?.[0] ? (
                    <img
                      src={prod.imagens[0]}
                      alt={prod.nome}
                      style={{
                        width: 54,
                        height: 54,
                        objectFit: "cover",
                        borderRadius: 12,
                        border: "1.2px solid #f2f3f7"
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 54,
                      height: 54,
                      background: "#f3f3f7",
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 31,
                      fontWeight: 800,
                      color: "#FB8500",
                      border: "1.2px solid #f2f3f7"
                    }}>
                      📦
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "1.14rem", color: "#023047" }}>{prod.nome}</div>
                    <div style={{ color: "#FB8500", fontWeight: 700, fontSize: 15 }}>{prod.categoria}</div>
                    <div style={{ color: "#a0a0a0", fontWeight: 600, fontSize: 14 }}>{prod.cidade}, {prod.estado}</div>
                  </div>
                </div>
                {/* Descrição */}
                <div style={{
                  color: "#525252",
                  fontSize: "1rem",
                  marginBottom: 3,
                  minHeight: 36,
                  maxHeight: 60,
                  overflow: "hidden"
                }}>
                  {prod.descricao || <span style={{ color: "#A0A0A0" }}>Sem descrição.</span>}
                </div>
                {/* Preço, Editar, Excluir */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 7
                }}>
                  <span style={{ color: "#FB8500", fontWeight: 900, fontSize: 21 }}>
                    {prod.preco ? `R$ ${Number(prod.preco).toLocaleString("pt-BR")}` : ""}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Link
                      href={`/admin/produtos/${prod.id}/edit`}
                      style={{
                        background: "#e8f8fe",
                        color: "#2563eb",
                        border: "1px solid #e0ecff",
                        fontWeight: 600,
                        fontSize: ".99rem",
                        padding: "7px 18px",
                        borderRadius: 9,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        textDecoration: "none",
                        transition: "background .12s"
                      }}
                    >
                      <Edit size={16} /> Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(prod.id)}
                      style={{
                        background: "#fff0f0",
                        color: "#d90429",
                        border: "1px solid #ffe5e5",
                        fontWeight: 700,
                        fontSize: ".99rem",
                        padding: "7px 16px",
                        borderRadius: 9,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      <Trash2 size={16} /> Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 650px) {
          h1 { font-size: 1.2rem !important; }
          .main { padding: 16px 0 !important; }
        }
      `}</style>
    </main>
  );
}
