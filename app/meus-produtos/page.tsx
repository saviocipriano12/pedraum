"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Loader, Edit, PlusCircle, ChevronLeft, Eye } from "lucide-react";
import Link from "next/link";

type Produto = {
  id: string;
  nome: string;
  descricao?: string;
  status?: string;
  imagem?: string;
  createdAt?: any;
};

export default function MeusProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchProdutos() {
      if (!userId) return;
      setLoading(true);
      const q = query(collection(db, "produtos"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const data: Produto[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Produto);
      });
      setProdutos(data);
      setLoading(false);
    }
    if (userId) fetchProdutos();
  }, [userId]);

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}>
      <Link href="/painel" style={{
        display: "flex", alignItems: "center", marginBottom: 24,
        color: "#2563eb", fontWeight: 700, fontSize: 16
      }}>
        <ChevronLeft size={19} /> Voltar ao Painel
      </Link>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-end", gap: 12, marginBottom: 34, flexWrap: "wrap"
      }}>
        <h1 style={{
          fontSize: "2.2rem", fontWeight: 900, color: "#023047", letterSpacing: "-1.1px",
          display: "flex", alignItems: "center", gap: 12
        }}>
          <span style={{
            display: "inline-block", padding: "7px 30px", background: "#f3f6fa",
            color: "#023047", borderRadius: "12px", boxShadow: "0 2px 12px #0001",
            fontWeight: 800, fontSize: "2rem"
          }}>
            Meus Produtos
          </span>
        </h1>
        <Link
          href="/create-produto"
          style={{
            display: "inline-flex", alignItems: "center", background: "#FB8500",
            color: "#fff", fontWeight: 800, fontSize: 18, borderRadius: 14,
            padding: "12px 28px", boxShadow: "0 2px 12px #0001", gap: 10,
            textDecoration: "none", transition: "background .18s"
          }}
        >
          <PlusCircle size={21} /> Novo Produto
        </Link>
      </div>

      {loading ? (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 0"
        }}>
          <Loader className="animate-spin mr-2" size={26} color="#219EBC" />
          <span style={{ fontSize: 20, fontWeight: 700, color: "#219EBC" }}>Carregando produtos...</span>
        </div>
      ) : produtos.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0"
        }}>
          <img
            src="https://cdn-icons-png.flaticon.com/512/1170/1170576.png"
            alt="Sem produtos"
            style={{ width: 80, opacity: .70, marginBottom: 18 }}
          />
          <p style={{ color: "#5B6476", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            Você ainda não cadastrou produtos.
          </p>
          <Link
            href="/create-produto"
            style={{
              marginTop: 7, padding: "12px 32px", borderRadius: "11px", background: "#219ebc",
              color: "#fff", fontWeight: 800, fontSize: 17, boxShadow: "0 2px 10px #0001", transition: "background .2s"
            }}
          >
            Adicionar Produto
          </Link>
        </div>
      ) : (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 32
        }}>
          {produtos
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
            .map((prod) => (
              <div
                key={prod.id}
                style={{
                  borderRadius: 16, boxShadow: "0 2px 20px #0001", background: "#fff",
                  border: "1.6px solid #f2f3f7", padding: "26px 22px 20px 22px",
                  marginBottom: 2, display: "flex", flexDirection: "column", gap: 12,
                  minHeight: 160, position: "relative",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 5 }}>
                  {prod.imagem ? (
                    <img
                      src={prod.imagem}
                      alt={prod.nome}
                      style={{
                        width: 52, height: 52, objectFit: "cover", borderRadius: 12,
                        border: "1.2px solid #f2f3f7"
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 52, height: 52, background: "#f3f3f7", borderRadius: 12,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 30, fontWeight: 800, color: "#FB8500", border: "1.2px solid #f2f3f7"
                    }}>
                      📦
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "1.17rem", color: "#023047" }}>{prod.nome}</div>
                    <div style={{ color: "#219ebc", fontWeight: 600, fontSize: 15, marginTop: 2 }}>{prod.status}</div>
                  </div>
                </div>
                <div style={{
                  color: "#525252", fontSize: "1rem", marginBottom: 3,
                  minHeight: 44, maxHeight: 65, overflow: "hidden"
                }}>
                  {prod.descricao || <span style={{ color: "#A0A0A0" }}>Sem descrição.</span>}
                </div>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 13, marginTop: 7
                }}>
                  <Link
                    href={`/edit-produto/${prod.id}`}
                    style={{
                      color: "#2563eb", fontWeight: 700, display: "flex",
                      alignItems: "center", gap: 5, textDecoration: "none"
                    }}
                  >
                    <Edit size={18} /> Editar
                  </Link>
                  <Link
                    href={`/produtos/${prod.id}`}
                    target="_blank"
                    style={{
                      color: "#FB8500", fontWeight: 700, display: "flex",
                      alignItems: "center", gap: 5, textDecoration: "none"
                    }}
                  >
                    <Eye size={18} /> Ver
                  </Link>
                  {/* Implementar botão excluir se quiser depois */}
                </div>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
