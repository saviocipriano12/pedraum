import Link from "next/link";
import { useEffect, useRef } from "react";

export default function Hero() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.classList.add("animate-hero-fade");
    }
  }, []);

  return (
    <section
      className="hero-premium"
      style={{
        backgroundImage: "url('/hero-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "400px",
        height: "clamp(400px, 60vw, 650px)",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        marginBottom: 0,
      }}
    >
      {/* Overlay escuro */}
      <div style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.65)",
        zIndex: 1,
      }} />
      {/* Degradê suave na base */}
      <div style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "120px",
        zIndex: 2,
        background: "linear-gradient(to bottom, rgba(0,0,0,0) 10%, #f6f9fa 100%)",
        pointerEvents: "none",
      }} />
      {/* Conteúdo centralizado */}
      <div
        ref={containerRef}
        className="hero-content"
        style={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          maxWidth: "640px",
          width: "100%",
          padding: "40px 24px 48px 24px",
          animation: "none",
        }}
        tabIndex={-1}
      >
        <h1
          style={{
            color: "#fff",
            fontSize: "clamp(2.3rem, 7vw, 3.6rem)",
            fontWeight: 800,
            lineHeight: 1.08,
            marginBottom: "22px",
            textShadow: "0 4px 24px #2226, 0 1px 0 #0003",
            width: "100%",
            letterSpacing: "-1.5px",
          }}
        >
          Conecte-se às Melhores <br />
         Oportunidades do Setor de Britagem e<br /> 
        </h1>
        {/* Subtítulo */}
        <p
          style={{
            color: "#fff",
            fontSize: "1.14rem",
            lineHeight: 1.54,
            marginBottom: "34px",
            textShadow: "0 2px 12px #0008",
            maxWidth: 460,
            opacity: 0.93,
            fontWeight: 500,
            width: "100%",
          }}
        >
         Encontre, anuncie e atenda demandas de todo o Brasil 
         de forma direta, sem intermediação!
        </p>
        {/* Botões */}
        <div
          className="hero-buttons"
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "14px",
            width: "100%",
            flexWrap: "wrap",
            justifyContent: "flex-start",
            marginBottom: "8px",
          }}
        >
          <Link href="/demandas" passHref legacyBehavior>
            <a
              style={{
                background: "#FB8500",
                color: "#fff",
                fontSize: "1.09rem",
                fontWeight: 700,
                borderRadius: "18px",
                padding: "14px 28px",
                boxShadow: "0 4px 20px #0003",
                cursor: "pointer",
                transition: "background .15s, transform .13s",
                border: "none",
                outline: "none",
                textDecoration: "none",
                marginBottom: "0px",
                display: "inline-block",
                width: "auto",
                minWidth: "160px",
                textAlign: "center",
                letterSpacing: "-.5px",
              }}
              onMouseOver={e => (e.currentTarget.style.background = "#e17000")}
              onMouseOut={e => (e.currentTarget.style.background = "#FB8500")}
              tabIndex={0}
            >
              Ver Oportunidades
            </a>
          </Link>
          <Link href="/vitrine" passHref legacyBehavior>
            <a
              style={{
                background: "#FB8500",
                color: "#fff",
                fontSize: "1.09rem",
                fontWeight: 700,
                borderRadius: "18px",
                padding: "14px 28px",
                boxShadow: "0 4px 20px #0003",
                cursor: "pointer",
                transition: "background .15s, transform .13s",
                border: "none",
                outline: "none",
                textDecoration: "none",
                marginBottom: "0px",
                display: "inline-block",
                width: "auto",
                minWidth: "180px",
                textAlign: "center",
                letterSpacing: "-.5px",
              }}
              onMouseOver={e => (e.currentTarget.style.background = "#e17000")}
              onMouseOut={e => (e.currentTarget.style.background = "#FB8500")}
              tabIndex={0}
            >
              Ver Produtos Disponiveis
            </a>
          </Link>
        </div>
        {/* Seta animada */}
        <div
          style={{
            marginTop: 34,
            display: "flex",
            justifyContent: "center",
            width: "100%",
            minHeight: 32,
          }}
        >
          <span
            style={{
              display: "block",
              width: 32,
              height: 32,
              opacity: 0.35,
              animation: "hero-bounce 1.5s infinite",
              filter: "drop-shadow(0 2px 6px #0007)",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 7v18M16 25l-7-7m7 7l7-7" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
      {/* CSS Animations + responsividade premium */}
      <style>{`
        @media (max-width: 900px) {
          .hero-content {
            align-items: center !important;
            padding-left: 8px !important;
            padding-right: 8px !important;
            max-width: 100% !important;
          }
          .hero-content h1,
          .hero-content p {
            text-align: center !important;
            width: 100% !important;
          }
          .hero-buttons {
            flex-direction: column !important;
            gap: 11px !important;
            align-items: center !important;
            width: 100% !important;
            margin-bottom: 2px !important;
          }
          .hero-buttons a {
            width: 75vw !important;
            max-width: 330px !important;
            min-width: 140px !important;
            font-size: 1.08rem !important;
            padding: 14px 0 !important;
            margin-bottom: 0 !important;
          }
        }
        @media (max-width: 600px) {
          .hero-content {
            padding-left: 2vw !important;
            padding-right: 2vw !important;
            padding-top: 10px !important;
            padding-bottom: 10px !important;
            max-width: 100vw !important;
          }
          .hero-content h1 {
            font-size: 1.44rem !important;
            line-height: 1.17 !important;
            letter-spacing: -.5px !important;
            margin-bottom: 18px !important;
          }
          .hero-content p {
            font-size: 1.01rem !important;
            margin-bottom: 17px !important;
          }
          .hero-buttons a {
            font-size: 1.01rem !important;
            padding: 13px 0 !important;
            max-width: 92vw !important;
          }
        }
        @keyframes hero-bounce {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(15px);}
        }
                .animate-hero-fade { 
          animation: fadeinhero 1.2s cubic-bezier(.28,.79,.66,1.14);
        }
        @keyframes fadeinhero {
          0% { opacity: 0; transform: translateY(30px);}
          100% { opacity: 1; transform: translateY(0);}
        }
      `}</style>
    </section>
  );
}
