"use client";

import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebaseConfig";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Lock, X } from "lucide-react";

/**
 * Envolva o conteúdo da página com <RequireAuth> ... </RequireAuth>
 * Se não houver usuário logado, abre um modal bloqueando a interação.
 *
 * Props:
 * - children: conteúdo da página
 * - title?: título do modal
 * - description?: texto do modal
 * - allowClose?: se true, mostra um X para fechar o modal (libera leitura sem ação)
 */
export default function RequireAuth({
  children,
  title = "Faça login para continuar",
  description = "Para acessar esta página, é necessário estar autenticado.",
  allowClose = false,
}: {
  children: ReactNode;
  title?: string;
  description?: string;
  allowClose?: boolean;
}) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setShowModal(!u); // mostra modal quando não há usuário
    });
    return () => unsub();
  }, []);

  // Enquanto carrega o estado de auth, evita flicker
  if (user === undefined) {
    return (
      <div className="min-h-[40vh] grid place-items-center">
        <div className="animate-pulse text-sm text-muted-foreground">
          Carregando…
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Conteúdo da página (embaçado quando modal aberto) */}
      <div className={showModal ? "blur-sm pointer-events-none select-none" : ""}>
        {children}
      </div>

      {/* Modal de login obrigatório */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm grid place-items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200/60 dark:border-zinc-800 p-6"
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              {allowClose && (
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute right-3 top-3 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              )}

              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 dark:bg-blue-950">
                <Lock className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>

              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {description}
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Entrar
                </Link>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-sm font-semibold"
                >
                  Cadastrar
                </Link>
              </div>

              <p className="mt-4 text-xs text-zinc-500">
                Dica: se você já tem conta, entre com o mesmo e-mail usado no cadastro.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
