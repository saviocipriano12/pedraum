"use client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useRef } from "react";

// Exemplo de demandas (pode receber por props/fetch)
const demands = [
  {
    id: "1",
    title: "Britador",
    date: "02/06/2025",
    description: "Preciso de um britador móvel para obra em MG. Contato urgente.",
    city: "Belo Horizonte",
    url: "/demanda/1",
  },
  {
    id: "2",
    title: "Peças",
    date: "01/06/2025",
    description: "Busco fornecedor de peças para peneira vibratória.",
    city: "Uberaba",
    url: "/demanda/2",
  },
  {
    id: "3",
    title: "Serviço Técnico",
    date: "31/05/2025",
    description: "Necessito assistência técnica em correias transportadoras.",
    city: "Montes Claros",
    url: "/demanda/3",
  },
  {
    id: "4",
    title: "Transporte",
    date: "29/05/2025",
    description: "Procurando caminhão para transportar material de britagem.",
    city: "Sete Lagoas",
    url: "/demanda/4",
  },
  {
    id: "5",
    title: "Usina de Asfalto",
    date: "27/05/2025",
    description: "Quero orçamento de usina de asfalto portátil, novo ou usado.",
    city: "Divinópolis",
    url: "/demanda/5",
  },
];

export default function DemandsShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <section
      style={{
        background: "#F6F9FA",
        padding: "0",
        width: "100%",
        position: "relative",
      }}
    >
      <div
        style={{
          maxWidth: 1220,
          margin: "0 auto",
          padding: "0 2vw",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 10,
            paddingTop: 36,
            paddingBottom: 14,
          }}
        >
          <h2
            style={{
              color: "#023047",
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.8px",
              fontFamily: "'Poppins','Inter',sans-serif",
              margin: 0,
              lineHeight: 1.13,
            }}
          >
            Demandas Recentes
          </h2>
          <Link
            href="/demandas"
            style={{
              color: "#FB8500",
              fontWeight: 700,
              fontSize: 16,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "color .16s",
            }}
          >
            Ver todas <ChevronRight size={21} strokeWidth={2.1} />
          </Link>
        </div>

        {/* CARDS */}
        <div
          ref={containerRef}
          className="demands-showcase-row"
          style={{
            display: "flex",
            gap: 16,
            overflowX: "auto",
            paddingBottom: 22,
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {demands.map((demand) => (
            <div
              key={demand.id}
              className="demands-card"
              style={{
                minWidth: 230,
                maxWidth: 270,
                background: "#fff",
                borderRadius: 18,
                boxShadow: "0 6px 32px #0001",
                padding: "20px 18px 16px 18px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 8,
                scrollSnapAlign: "start",
                border: "1.5px solid #f0eaea",
                transition: "box-shadow .16s, border .16s",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 15.7,
                    fontWeight: 700,
                    color: "#023047",
                    marginBottom: 2,
                    fontFamily: "'Poppins',sans-serif",
                  }}
                >
                  {demand.title}
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    color: "#FB8500",
                    fontWeight: 600,
                    marginBottom: 2,
                  }}
                >
                  {demand.date}
                </div>
                <div
                  style={{
                    fontSize: 14.2,
                    color: "#232323",
                    marginBottom: 10,
                    fontWeight: 500,
                    minHeight: 40,
                  }}
                >
                  {demand.description}
                </div>
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 5,
                }}
              >
                <span
                  style={{
                    color: "#7A7A7A",
                    fontSize: 14,
                  }}
                >
                  {demand.city}
                </span>
                <Link
                  href={demand.url}
                  style={{
                    background: "#FB8500",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14.5,
                    borderRadius: 99,
                    padding: "6px 28px",
                    textDecoration: "none",
                    marginLeft: 6,
                    boxShadow: "0 2px 9px #fb850035",
                    letterSpacing: ".01em",
                    border: "none",
                    outline: "none",
                    transition: "background .14s, transform .12s",
                    display: "inline-block",
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = "#e17000")}
                  onMouseOut={e => (e.currentTarget.style.background = "#FB8500")}
                >
                  Atender
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* RESPONSIVO */}
      <style jsx>{`
        .demands-showcase-row {
          flex-wrap: nowrap;
        }
        @media (min-width: 900px) {
          .demands-showcase-row {
            overflow-x: visible !important;
            display: grid !important;
            grid-template-columns: repeat(5, 1fr);
            gap: 18px;
            padding-bottom: 20px;
          }
          .demands-card {
            min-width: 0 !important;
            max-width: none !important;
          }
        }
        @media (max-width: 900px) {
          .demands-showcase-row {
            flex-direction: row !important;
            overflow-x: auto !important;
            gap: 16px !important;
            padding-bottom: 18px !important;
          }
          .demands-card {
            min-width: 230px !important;
            max-width: 270px !important;
          }
        }
        @media (max-width: 600px) {
          .demands-showcase-row {
            gap: 13px !important;
            padding-bottom: 13px !important;
          }
          .demands-card {
            min-width: 81vw !important;
            max-width: 95vw !important;
            padding: 14px 9px 13px 14px !important;
          }
        }
      `}</style>
    </section>
  );
}
