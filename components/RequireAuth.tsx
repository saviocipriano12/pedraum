// components/RequireAuth.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/firebaseConfig";

type Props = {
  children: React.ReactNode;
  /** rota de login (padrão: /auth/login) */
  redirectTo?: string;
  /** título/descrição opcionais para telas que usam o guard como wrapper de página */
  title?: string;
  description?: string;
  /** se true, mantém o conteúdo montado e apenas bloqueia a renderização até autenticar */
  keepMounted?: boolean;
};

export default function RequireAuth({
  children,
  redirectTo = "/auth/login",
  title,
  description,
  keepMounted = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);
  const [userExists, setUserExists] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) {
        setUserExists(true);
        setChecking(false);
      } else {
        setUserExists(false);
        setChecking(false);
        // preserva a rota que o usuário tentou acessar (para redirecionar após login)
        const next = encodeURIComponent(pathname || "/");
        router.replace(`${redirectTo}?next=${next}`);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectTo, pathname]);

  if (checking) {
    // skeleton/loading amigável
    return (
      <main
        style={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          background:
            "linear-gradient(180deg,#f7fafc 0%, #f6f9fa 60%, #f1f5f9 100%)",
          padding: 24,
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: "28px 26px",
            width: "min(680px, 92vw)",
            boxShadow: "0 10px 28px #00000014",
            textAlign: "center",
          }}
        >
          <div
            className="animate-spin"
            style={{
              width: 30,
              height: 30,
              border: "3px solid #e5e7eb",
              borderTopColor: "#2563eb",
              borderRadius: "50%",
              margin: "0 auto 12px",
            }}
          />
          <div style={{ fontWeight: 800, color: "#023047", fontSize: 18 }}>
            Verificando acesso…
          </div>
          <div style={{ color: "#64748b", marginTop: 6, fontSize: 14.5 }}>
            Aguarde um instante.
          </div>
        </div>
      </main>
    );
  }

  if (!userExists) {
    // enquanto redireciona, não renderiza children (ou mantém montado se preferir)
    return keepMounted ? <>{children}</> : null;
  }

  // autenticado
  if (!title && !description) return <>{children}</>;

  // opcional: envelope com header simples quando usado como “página”
  return (
    <main style={{ minHeight: "100vh", background: "#f7fafc", padding: 16 }}>
      <section
        style={{
          margin: "0 auto",
          width: "min(1200px, 96vw)",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 20,
          padding: "24px 18px",
          boxShadow: "0 10px 28px #0000000d",
        }}
      >
        {(title || description) && (
          <header style={{ marginBottom: 14 }}>
            {title && (
              <h1
                style={{
                  fontWeight: 900,
                  letterSpacing: 0.2,
                  color: "#023047",
                  fontSize: 22,
                  marginBottom: 6,
                }}
              >
                {title}
              </h1>
            )}
            {description && (
              <p style={{ color: "#64748b", fontSize: 15.5 }}>{description}</p>
            )}
          </header>
        )}
        {children}
      </section>
    </main>
  );
}
