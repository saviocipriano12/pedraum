"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import Link from "next/link";
import { Calendar, MapPin, Tag, ClipboardCheck } from "lucide-react";
import { motion } from "framer-motion";

// Troque para o número real do WhatsApp de atendimento
const numeroWhatsApp = "5531990903613";

export default function DemandaDetalhePage() {
  const { id } = useParams();
  const router = useRouter();
  const [demanda, setDemanda] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDemanda() {
      if (!id) return;
      const docRef = doc(db, "demandas", String(id));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setDemanda({ id: docSnap.id, ...docSnap.data() });
      setLoading(false);
    }
    fetchDemanda();
  }, [id]);

  if (loading) {
    return <div style={{ textAlign: "center", padding: 80 }}>Carregando...</div>;
  }
  if (!demanda) {
    return <div style={{ textAlign: "center", padding: 80, color: "#FB8500", fontWeight: 700 }}>Demanda não encontrada.</div>;
  }

  // Mensagem automática para o WhatsApp
  const mensagemWhats = `Olá! Quero atender a demanda: "${demanda.titulo}" (ID: ${demanda.id})`;

  return (
    <section className="demanda-detalhe">
      <div className="demanda-header">
        <button
          className="demanda-voltar"
          onClick={() => router.back()}
        >
          &lt; Voltar para a Vitrine de Demandas
        </button>
      </div>

      <motion.div
        className="demanda-grid"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34 }}
      >
        <div className="demanda-info">
          <h1 className="demanda-titulo">{demanda.titulo}</h1>
          <div className="demanda-meta">
            <span><Tag size={19} /> {demanda.categoria || "Categoria não informada"}</span>
            <span><Calendar size={19} /> {demanda.createdAt?.toDate?.().toLocaleDateString?.("pt-BR") || "Data não informada"}</span>
            <span><MapPin size={19} /> {demanda.cidade || "Cidade não informada"}, {demanda.estado || "UF"}</span>
            <span><ClipboardCheck size={19} /> Status: <span style={{ fontWeight: 700 }}>{demanda.status || "Aberta"}</span></span>
          </div>

          <div className="demanda-bloco">
            <div className="demanda-bloco-titulo">Descrição da Demanda</div>
            <div className="demanda-bloco-texto">{demanda.descricao}</div>
          </div>

          <div className="demanda-orcamento-prazo">
            {demanda.orcamento && (
              <span>
                <b>Orçamento estimado:</b> R$ {Number(demanda.orcamento).toLocaleString("pt-BR")}
              </span>
            )}
            {demanda.prazo && (
              <span>
                <b>Prazo/urgência:</b> {demanda.prazo}
              </span>
            )}
          </div>

          {/* BOTÃO LARANJA PADRÃO */}
          <a
            href={`https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagemWhats)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="demanda-btn-laranja"
            title="Atender esta demanda"
          >
            Atender Demanda
          </a>
        </div>
      </motion.div>

      {demanda.observacoes && (
        <div className="demanda-bloco" style={{ marginTop: 34 }}>
          <div className="demanda-bloco-titulo">Observações Extras</div>
          <div className="demanda-bloco-texto">{demanda.observacoes}</div>
        </div>
      )}

      <style jsx>{`
        .demanda-detalhe {
          max-width: 880px;
          margin: 0 auto;
          padding: 44px 4vw 72px 4vw;
          background: #f8fbfd;
        }
        .demanda-header {
          margin-bottom: 22px;
        }
        .demanda-voltar {
          color: #219EBC;
          font-size: 1rem;
          text-decoration: underline;
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 700;
        }
        .demanda-grid {
          background: #fff;
          border-radius: 22px;
          box-shadow: 0 4px 32px #0001;
          padding: 42px 44px 36px 44px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .demanda-titulo {
          font-size: 2.05rem;
          font-weight: 900;
          color: #023047;
          margin-bottom: 11px;
          line-height: 1.19;
        }
        .demanda-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 19px 32px;
          font-size: 1.08rem;
          color: #2c2c3a;
          margin-bottom: 26px;
        }
        .demanda-meta span {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .demanda-bloco {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 18px 16px 18px 18px;
          margin-bottom: 18px;
          box-shadow: 0 1px 8px #fb850022;
        }
        .demanda-bloco-titulo {
          color: #219EBC;
          font-weight: 700;
          font-size: 1.11rem;
          margin-bottom: 5px;
        }
        .demanda-bloco-texto {
          color: #212;
          font-size: 1.13rem;
        }
        .demanda-orcamento-prazo {
          margin-top: 8px;
          margin-bottom: 14px;
          display: flex;
          gap: 28px;
          flex-wrap: wrap;
          color: #555;
          font-size: 1.05rem;
        }
        /* BOTÃO LARANJA PADRÃO */
        .demanda-btn-laranja {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          background: #FB8500;
          color: #fff;
          border-radius: 13px;
          font-weight: 900;
          font-size: 1.18rem;
          padding: 16px 0;
          margin-top: 16px;
          width: 100%;
          box-shadow: 0 3px 15px #FB850044;
          text-decoration: none;
          transition: background .15s, transform .13s;
          border: none;
        }
        .demanda-btn-laranja:hover {
          background: #e17000;
          transform: scale(1.02);
        }
        @media (max-width: 700px) {
          .demanda-grid { padding: 18px 6px 20px 6px; }
          .demanda-detalhe { padding: 10px 2vw 56px 2vw; }
          .demanda-titulo { font-size: 1.21rem; }
        }
      `}</style>
    </section>
  );
}
