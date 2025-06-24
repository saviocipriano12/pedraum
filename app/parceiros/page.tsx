"use client";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { Users, ChevronLeft, Star, Link as LinkIcon, Loader } from "lucide-react";
import Link from "next/link";

// Tipo de parceiro
type Parceiro = {
  id: string;
  nome: string;
  segmento: string;
  descricao: string;
  url?: string;
  imagem?: string;
  destaque?: boolean;
};

export default function ParceirosPage() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchParceiros() {
      setLoading(true);
      try {
        const q = query(collection(db, "parceiros"), orderBy("destaque", "desc"), limit(24));
        const snap = await getDocs(q);
        const data: Parceiro[] = [];
        snap.forEach(doc => {
          data.push({ id: doc.id, ...doc.data() } as Parceiro);
        });
        setParceiros(data);
      } catch (e) {
        setParceiros([]);
      }
      setLoading(false);
    }
    fetchParceiros();
  }, []);

  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}>
      <Link href="/painel-vendedor" style={{ display: "flex", alignItems: "center", marginBottom: 24, color: "#2563eb", fontWeight: 700, fontSize: 16 }}>
        <ChevronLeft size={19} /> Voltar ao Painel
      </Link>
      <h1
        style={{
          fontSize: "2.2rem",
          fontWeight: 900,
          color: "#023047",
          letterSpacing: "-1.1px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <span style={{
          display: "inline-block",
          padding: "7px 30px",
          background: "#f3f6fa",
          color: "#023047",
          borderRadius: "12px",
          boxShadow: "0 2px 12px #0001",
          fontWeight: 800,
          fontSize: "2rem"
        }}>
          Parceiros
        </span>
        <Users size={36} color="#2563eb" />
      </h1>
      <div className="text-[#5B6476] mb-8" style={{ fontSize: 18 }}>
        Conheça as empresas e profissionais parceiros do <b>Pedraum</b>.  
        <br />Quer ser um parceiro? <Link href="/contato" className="text-[#FB8500] font-bold hover:underline ml-1">Fale conosco</Link>!
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin mr-2" size={28} color="#219EBC" />
          <span style={{ fontSize: 20, fontWeight: 700, color: "#219EBC" }}>Carregando parceiros...</span>
        </div>
      ) : parceiros.length === 0 ? (
        <div className="text-[#6b7680] text-center py-8">
          Nenhum parceiro cadastrado ainda.
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 32,
          marginBottom: 40,
        }}>
          {parceiros.map((p) => (
            <div
              key={p.id}
              style={{
                borderRadius: 18,
                boxShadow: "0 2px 22px #0001",
                background: "#fff",
                border: "1.5px solid #e4e8ef",
                padding: "32px 22px 22px 22px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minHeight: 260,
                position: "relative",
              }}
            >
              {/* Destaque */}
              {p.destaque && (
                <div style={{
                  position: "absolute",
                  top: 18,
                  right: 24,
                  background: "#FB8500",
                  color: "#fff",
                  fontWeight: 700,
                  borderRadius: 14,
                  fontSize: 13,
                  padding: "2px 15px",
                  display: "flex",
                  alignItems: "center",
                  gap: 5
                }}>
                  <Star size={14} /> Destaque
                </div>
              )}
              {/* Logo */}
              {p.imagem ? (
                <img
                  src={p.imagem}
                  alt={p.nome}
                  style={{
                    width: 62,
                    height: 62,
                    objectFit: "contain",
                    borderRadius: "12px",
                    marginBottom: 14,
                    background: "#f3f6fa",
                    border: "1.5px solid #e4e8ef",
                  }}
                />
              ) : (
                <Users size={48} color="#2563eb" style={{ marginBottom: 16 }} />
              )}
              {/* Nome */}
              <div style={{ fontWeight: 800, color: "#023047", fontSize: 22, textAlign: "center" }}>
                {p.nome}
              </div>
              {/* Segmento */}
              <div style={{ color: "#2563eb", fontWeight: 600, marginBottom: 6, marginTop: 1, fontSize: 15 }}>
                {p.segmento}
              </div>
              {/* Descrição */}
              <div style={{
                color: "#595b66",
                fontSize: 16,
                marginBottom: 8,
                textAlign: "center",
                minHeight: 54,
                maxWidth: 280,
              }}>
                {p.descricao}
              </div>
              {/* Botão de acesso */}
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#FB8500] flex items-center gap-2 text-white font-bold rounded-xl px-6 py-2 mt-2 shadow-md hover:opacity-90 transition"
                  style={{ marginTop: 7, fontSize: 16, textDecoration: "none" }}
                >
                  <LinkIcon size={17} /> Acessar site
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Chamada para ser parceiro */}
      <div
        style={{
          borderRadius: 16,
          boxShadow: "0 2px 14px #0001",
          background: "#e7f8fb",
          border: "1.2px solid #d1eaff",
          padding: "36px 22px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div className="font-bold text-[#023047] text-lg mb-2" style={{ fontSize: 22 }}>
          Seja nosso parceiro!
        </div>
        <div className="text-[#495668] mb-2 text-center" style={{ fontSize: 17 }}>
          Tem uma empresa, serviço ou tecnologia para agregar à mineração e britagem?  
          <br />
          <b>Cadastre-se ou entre em contato para parcerias estratégicas.</b>
        </div>
        <Link
          href="/contato"
          className="bg-[#FB8500] text-white font-bold rounded-xl px-8 py-3 mt-1 shadow-md hover:opacity-90 transition"
        >
          Quero ser parceiro
        </Link>
      </div>
    </section>
  );
}
