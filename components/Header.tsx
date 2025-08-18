"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, Bell, LogIn, User } from "lucide-react";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header
        style={{
          width: "100%",
          background: "#fff",
          boxShadow: "0 2px 18px #0001",
          position: "relative",
          zIndex: 50,
          minHeight: 66,
          borderBottom: "1.5px solid #e5e7eb",
        }}
      >
        <nav
          style={{
            maxWidth: 1360,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 2vw",
            height: 66,
            position: "relative",
          }}
        >
          {/* Logo */}
          <Link href="/">
            <span style={{
              display: "flex",
              alignItems: "center",
              fontWeight: 900,
              fontSize: "2rem",
              letterSpacing: "-1.5px",
              color: "#023047",
              textDecoration: "none",
              marginRight: 24,
              height: 56,
            }}>
              <img
                src="/logo-pedraum.png"
                alt="Pedraum Brasil"
                style={{ height: 44, marginRight: 10, display: "block" }}
              />
            </span>
          </Link>

          <div className="header-mobile-icons" style={{
            display: "none",
            alignItems: "center",
            gap: 4,
          }}>
            <Link href="/auth/login" title="Login">
              <span style={{
                color: "#FB8500",
                padding: 7,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
              }}>
                <LogIn size={26} />
              </span>
            </Link>
          </div>

          {/* Menu Desktop */}
          <ul className="header-menu-desktop" style={{
            display: "flex",
            gap: 36,
            alignItems: "center",
            listStyle: "none",
            padding: 0,
            margin: 0,
            flex: 1,
            justifyContent: "center",
          }}>
            {[
              
              { href: "/vitrine", label: "Produtos e Serviços" },
              { href: "/demandas", label: "Oportunidades" },
            
              { href: "/blog", label: "Blog" },
              { href: "/painel", label: "Painel" },

            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href}>
                  <span style={{
                    color: "#023047",
                    fontWeight: 500,
                    fontSize: "1.07rem",
                    textDecoration: "none",
                    transition: "color .14s",
                  }}>{label}</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Ícones + Botão */}
          <div className="header-actions" style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}>
            <Link href="/perfil" title="Meu Perfil">
              <span style={{ color: "#219EBC", padding: 6, borderRadius: 9 }}>
                <User size={24} strokeWidth={2.1} />
              </span>
            </Link>
            <Link href="/auth/login" title="Login">
              <span style={{ color: "#FB8500", padding: 6, borderRadius: 9 }}>
                <LogIn size={24} strokeWidth={2.1} />
              </span>
            </Link>
            <Link href="/auth/register">
              <span style={{
                background: "#FB8500",
                color: "#fff",
                fontWeight: 700,
                fontSize: "1.01rem",
                borderRadius: "15px",
                padding: "11px 28px",
                boxShadow: "0 4px 14px #0001",
                marginLeft: 5,
                textDecoration: "none",
                letterSpacing: ".01em",
                border: "none",
                outline: "none",
                transition: "background .15s, transform .13s",
                display: "inline-block",
              }}
                onMouseOver={e => (e.currentTarget.style.background = "#e17000")}
                onMouseOut={e => (e.currentTarget.style.background = "#FB8500")}
              >Cadastrar</span>
            </Link>
          </div>

          {/* Botão Hambúrguer */}
          <button
            className="header-hamburger"
            style={{
              background: "none",
              border: "none",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              marginLeft: 15,
              padding: 6,
              zIndex: 51,
            }}
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={32} color="#023047" />
          </button>
        </nav>

        {/* Overlay Mobile */}
        <div
          className="header-mobile-overlay"
          style={{
            display: open ? "block" : "none",
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.29)",
            zIndex: 100,
            transition: "opacity .2s",
          }}
          onClick={() => setOpen(false)}
        />

        {/* Menu Mobile */}
        <nav
          className="header-mobile-menu"
          style={{
            position: "fixed",
            top: 0,
            right: open ? 0 : "-110vw",
            width: "81vw",
            maxWidth: 320,
            height: "100vh",
            background: "#fff",
            zIndex: 150,
            boxShadow: open ? "-8px 0 36px #0002" : "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            padding: "26px 18px",
            transition: "right .22s cubic-bezier(.42,.91,.56,1.17)",
          }}
        >
          <button
            onClick={() => setOpen(false)}
            style={{
              alignSelf: "flex-end",
              background: "none",
              border: "none",
              marginBottom: 12,
              marginRight: -6,
              cursor: "pointer",
            }}
            aria-label="Fechar menu"
          >
            <X size={34} color="#023047" />
          </button>

          <Link href="/">
            <span onClick={() => setOpen(false)} style={{
              fontWeight: 900,
              fontSize: "1.6rem",
              letterSpacing: "-1.5px",
              color: "#023047",
              textDecoration: "none",
              marginBottom: 26,
              marginTop: 5,
              display: "flex",
              alignItems: "center",
            }}>
              <img src="/logo-pedraum.png" alt="Pedraum Brasil" style={{ height: 44, marginRight: 8 }} />
            </span>
          </Link>

          {[
            { href: "/", label: "Início" },
            { href: "/painel", label: "Painel" },
            { href: "/vitrine", label: "Produtos e Serviços" },
            { href: "/demandas", label: "Oportunidades" },
            { href: "/contato", label: "Contato" },
            { href: "/blog", label: "Blog" },
            { href: "/auth/login", label: <><LogIn size={20} style={{ marginRight: 6, verticalAlign: "middle" }} />Login</> },
            { href: "/notificacoes", label: <><Bell size={20} style={{ marginRight: 6, verticalAlign: "middle" }} />Notificações</> },
          ].map(({ href, label }) => (
            <Link key={href} href={href}>
              <span onClick={() => setOpen(false)} style={linkMobile}>{label}</span>
            </Link>
          ))}

          <Link href="/auth/register">
            <span onClick={() => setOpen(false)} style={{
              ...linkMobile,
              background: "#FB8500",
              color: "#fff",
              borderRadius: "15px",
              padding: "12px 18px",
              fontWeight: 700,
              marginTop: 19,
              textAlign: "center",
              width: "100%",
              display: "block",
            }}>
              Cadastrar
            </span>
          </Link>
        </nav>
      </header>

      {/* CSS Responsivo */}
      <style>{`
        @media (max-width: 950px) {
          .header-menu-desktop {
            display: none !important;
          }
          .header-hamburger {
            display: flex !important;
          }
          .header-mobile-icons {
            display: flex !important;
          }
          .header-actions {
            display: none !important;
          }
        }
        @media (max-width: 700px) {
          .header-actions {
            display: none !important;
          }
        }
        .header-mobile-menu a {
          color: #023047;
          font-size: 1.13rem;
          text-decoration: none;
          margin-bottom: 14px;
          font-weight: 600;
          transition: color .12s;
          border-radius: 10px;
          padding: 8px 0;
        }
        .header-mobile-menu a:hover {
          color: #FB8500;
          background: #f8fafc;
        }
          .header-menu-desktop a {
  text-decoration: none !important;
}
      `}</style>
    </>
  );
}

const linkMobile = {
  color: "#023047",
  fontSize: "1.13rem",
  textDecoration: "none",
  marginBottom: "14px",
  fontWeight: 600,
  borderRadius: "10px",
  padding: "8px 0",
  display: "block",
  width: "100%",
  transition: "color .12s, background .12s"
};
