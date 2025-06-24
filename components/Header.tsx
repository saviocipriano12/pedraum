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
          <Link href="/" legacyBehavior>
            <a style={{
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
                src="/logo-pedraum.png" // Altere para seu caminho/logo
                alt="Pedraum Brasil"
                style={{ height: 44, marginRight: 10, display: "block" }}
              />
            
            </a>
          </Link>
          <div className="header-mobile-icons" style={{
  display: "none",
  alignItems: "center",
  gap: 4,
}}>
  <Link href="/auth/login" legacyBehavior>
    <a title="Login" style={{
      color: "#FB8500",
      padding: 7,
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      background: "none",
      border: "none",
    }}>
      <LogIn size={26} />
    </a>
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
            <li>
              <Link href="/" legacyBehavior>
                <a style={{
                  color: "#023047",
                  fontWeight: 500,
                  fontSize: "1.07rem",
                  textDecoration: "none",
                  transition: "color .14s",
                }}>Início</a>
              </Link>
            </li>
            <li>
              <Link href="/services" legacyBehavior>
                <a style={{
                  color: "#023047",
                  fontWeight: 500,
                  fontSize: "1.07rem",
                  textDecoration: "none",
                  transition: "color .14s",
                }}>Serviços</a>
              </Link>
            </li>
            <li>
              <Link href="/contato" legacyBehavior>
                <a style={{
                  color: "#023047",
                  fontWeight: 500,
                  fontSize: "1.07rem",
                  textDecoration: "none",
                  transition: "color .14s",
                }}>Contato</a>
              </Link>
            </li>
            <li>
              <Link href="/blog" legacyBehavior>
                <a style={{
                  color: "#023047",
                  fontWeight: 500,
                  fontSize: "1.07rem",
                  textDecoration: "none",
                  transition: "color .14s",
                }}>Blog</a>
              </Link>
            </li>
           <li>
    <Link href="/painel" legacyBehavior>
      <a style={{
        color: "#023047",
        fontWeight: 500,
        fontSize: "1.07rem",
        textDecoration: "none",
        transition: "color .14s",
      }}>Painel</a>
    </Link>
  </li>
</ul>

          {/* Ícones + Botão */}
          <div className="header-actions" style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}>
             <Link href="/perfil" legacyBehavior>
    <a title="Meu Perfil" style={{ color: "#219EBC", padding: 6, borderRadius: 9 }}>
      <User size={24} strokeWidth={2.1} />
              </a>
            </Link>
            <Link href="/auth/login" legacyBehavior>
              <a title="Login" style={{ color: "#FB8500", padding: 6, borderRadius: 9 }}>
                <LogIn size={24} strokeWidth={2.1} />
              </a>
            </Link>
            <Link href="/auth/register" legacyBehavior>
              <a style={{
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
              >Cadastrar</a>
            </Link>
          </div>
          {/* Botão Hambúrguer Mobile */}
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
        {/* Mobile menu */}
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
          <Link href="/" legacyBehavior>
            <a onClick={() => setOpen(false)} style={{
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
              <img
                src="/logo-pedraum.png"
                alt="Pedraum Brasil"
                style={{ height: 44, marginRight: 8 }}
              />
            </a>
          </Link>
          <Link href="/" legacyBehavior><a onClick={() => setOpen(false)} style={linkMobile}>Início</a></Link>
          <Link href="/painel" legacyBehavior>
  <a onClick={() => setOpen(false)} style={linkMobile}>
    Painel
  </a>
</Link>
          <Link href="/services" legacyBehavior><a onClick={() => setOpen(false)} style={linkMobile}>Serviços</a></Link>
          <Link href="/contato" legacyBehavior><a onClick={() => setOpen(false)} style={linkMobile}>Contato</a></Link>
          <Link href="/blog" legacyBehavior><a onClick={() => setOpen(false)} style={linkMobile}>Blog</a></Link>
          <div style={{ height: 18 }} />
          <Link href="/auth/login" legacyBehavior><a onClick={() => setOpen(false)} style={linkMobile}><LogIn size={20} style={{ verticalAlign: "middle", marginRight: 6 }} />Login</a></Link>
          <Link href="/notificacoes" legacyBehavior><a onClick={() => setOpen(false)} style={linkMobile}><Bell size={20} style={{ verticalAlign: "middle", marginRight: 6 }} />Notificações</a></Link>
          <Link href="/auth/register" legacyBehavior>
            <a onClick={() => setOpen(false)} style={{
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
            </a>
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
        }
        @media (max-width: 700px) {
          .header-actions {
            display: none !important;
          }
        }
          @media (max-width: 950px) {
  .header-mobile-icons {
    display: flex !important;
  }
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
      `}</style>
    </>
  );
}

// Links mobile estilo para evitar repetição
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
