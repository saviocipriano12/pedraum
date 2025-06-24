"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

type Machine = {
  id: string;
  nome: string;
  imagens?: string[];
  imagem?: string;
  preco: number;
  local?: string;
  ano?: string;
};

export default function MachinesShowcase() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMachines() {
      setLoading(true);
      const q = query(
        collection(db, "machines"),
        orderBy("createdAt", "desc"),
        limit(8) // pega só 8, ajuste se quiser mais/menos
      );
      const snapshot = await getDocs(q);
      const data: Machine[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Machine);
      });
      setMachines(data);
      setLoading(false);
    }
    fetchMachines();
  }, []);

  function scrollLeft() {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -340, behavior: "smooth" });
  }
  function scrollRight() {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: 340, behavior: "smooth" });
  }

  // Função para pegar a imagem correta (primeira imagem do array ou string única)
  const getMachineImage = (m: Machine) => {
    if (Array.isArray(m.imagens) && m.imagens[0]) return m.imagens[0];
    if (typeof m.imagem === "string" && m.imagem) return m.imagem;
    return "/machines/placeholder.jpg";
  };

  return (
    <section className="machines-bg" style={{ background: "#fff", padding: "64px 0 74px 0", width: "100%" }}>
      <div style={{ maxWidth: 1220, margin: "0 auto", padding: "0 2vw" }}>
        {/* Título */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <h2 style={{
            fontSize: 32, fontWeight: 900, color: "#023047", letterSpacing: "-1px", marginBottom: 8,
            fontFamily: "'Poppins','Inter',sans-serif"
          }}>
            Vitrine de <span style={{ color: "#FB8500" }}>Máquinas</span>
          </h2>
          <div style={{
            color: "#7687A3", fontSize: 17, fontWeight: 500, maxWidth: 510,
            margin: "0 auto 14px auto", lineHeight: 1.5,
          }}>
            Confira as máquinas à venda e os equipamentos em destaque no mercado de mineração e construção.
          </div>
        </div>

        {/* Link "Ver todas" */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/machines"
            style={{
              color: "#FB8500", fontWeight: 700, fontSize: 16, textDecoration: "none",
              letterSpacing: ".01em", transition: "color .18s",
            }}
            onMouseOver={e => (e.currentTarget.style.color = "#e17000")}
            onMouseOut={e => (e.currentTarget.style.color = "#FB8500")}
          >Ver todas &rarr;</Link>
        </div>

        {/* Carrossel */}
        <div className="machines-carousel-row" style={{
          position: "relative", width: "100%", display: "flex", alignItems: "center",
        }}>
          {/* Seta esquerda */}
          <button
            className="carousel-arrow-left"
            style={{
              position: "absolute", left: -22, zIndex: 2, background: "#fff", border: "1.5px solid #eee",
              boxShadow: "0 6px 28px #0001", borderRadius: 99, width: 46, height: 46, display: "none",
              alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background .13s, box-shadow .15s",
            }}
            onClick={scrollLeft} aria-label="Anterior" type="button"
          >
            <ChevronLeft size={27} color="#FB8500" />
          </button>

          {/* Carrossel */}
          <div
            ref={scrollRef}
            className="machines-carousel"
            style={{
              display: "flex", gap: 26, overflowX: "auto", overflowY: "hidden", paddingBottom: 12,
              scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none", msOverflowStyle: "none", minHeight: 300, margin: "0 auto", width: "100%",
            }}
          >
            {loading ? (
              <div style={{
                width: "100%", textAlign: "center", color: "#219ebc",
                fontWeight: 700, fontSize: 22, padding: 50
              }}>
                Carregando máquinas...
              </div>
            ) : machines.length === 0 ? (
              <div style={{
                width: "100%", textAlign: "center", color: "#5B6476",
                fontWeight: 700, fontSize: 19, padding: 42
              }}>
                Nenhuma máquina cadastrada ainda.
              </div>
            ) : (
              machines.map((m) => (
                <div
                  key={m.id}
                  className="machines-card"
                  style={{
                    minWidth: 266, maxWidth: 296, background: "#fff", borderRadius: 18,
                    boxShadow: "0 4px 18px #2222", border: "1.1px solid #e8e8e8",
                    display: "flex", flexDirection: "column", overflow: "hidden",
                    scrollSnapAlign: "start", transition: "box-shadow .16s, transform .15s",
                    flex: "0 0 266px", position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: "100%", height: 140, overflow: "hidden",
                      borderRadius: "18px 18px 0 0", background: "#F6F9FA",
                    }}
                  >
                    <img
                      src={getMachineImage(m)}
                      alt={m.nome}
                      style={{
                        width: "100%", height: "100%", objectFit: "cover",
                        display: "block", userSelect: "none",
                      }}
                      draggable={false}
                    />
                  </div>
                  <div style={{
                    display: "flex", flexDirection: "column", padding: "15px 18px 10px 18px", gap: 7, flex: 1,
                  }}>
                    <h3 style={{
                      fontWeight: 700, fontSize: 17.3, margin: "2px 0 1px 0",
                      color: "#023047", lineHeight: 1.23,
                    }}>
                      {m.nome}
                    </h3>
                    <span style={{
                      fontSize: 15.7, color: "#FB8500", fontWeight: 800, letterSpacing: ".01em", marginBottom: 2,
                    }}>
                      R$ {Number(m.preco).toLocaleString("pt-BR")}
                    </span>
                    <div style={{
                      fontSize: 13.4, color: "#7687A3", fontWeight: 500, marginBottom: 2,
                    }}>
                      {m.local || "Localização não informada"} {m.ano ? `• ${m.ano}` : ""}
                    </div>
                    <Link
                      href={`/machines/${m.id}`}
                      style={{
                        marginTop: "auto", color: "#FB8500", fontWeight: 700, fontSize: 14.7,
                        textDecoration: "none", transition: "color .13s", letterSpacing: ".01em",
                        border: "none", outline: "none",
                      }}
                      onMouseOver={e => (e.currentTarget.style.color = "#e17000")}
                      onMouseOut={e => (e.currentTarget.style.color = "#FB8500")}
                    >
                      Ver detalhes &rarr;
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Seta direita */}
          <button
            className="carousel-arrow-right"
            style={{
              position: "absolute", right: -22, zIndex: 2, background: "#fff", border: "1.5px solid #eee",
              boxShadow: "0 6px 28px #0001", borderRadius: 99, width: 46, height: 46, display: "none",
              alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background .13s, box-shadow .15s",
            }}
            onClick={scrollRight} aria-label="Próximo" type="button"
          >
            <ChevronRight size={27} color="#FB8500" />
          </button>
        </div>
      </div>
      {/* CSS responsivo */}
      <style jsx>{`
        .machines-carousel::-webkit-scrollbar { display: none; }
        .machines-carousel { scrollbar-width: none; }
        @media (min-width: 900px) {
          .machines-carousel {
            gap: 36px !important;
          }
          .carousel-arrow-left, .carousel-arrow-right {
            display: flex !important;
          }
        }
        @media (max-width: 900px) {
          .machines-carousel {
            gap: 11px !important;
            padding-bottom: 10px !important;
          }
          .carousel-arrow-left, .carousel-arrow-right {
            display: none !important;
          }
          .machines-card {
            min-width: 88vw !important;
            max-width: 96vw !important;
            padding: 0 !important;
          }
        }
        @media (max-width: 600px) {
          .machines-bg {
            padding: 38px 0 29px 0 !important;
          }
        }
      `}</style>
    </section>
  );
}
