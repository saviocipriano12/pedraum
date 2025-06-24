"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function PainelRedirect() {
  const router = useRouter();

  useEffect(() => {
    const redirectPainel = async () => {
      const user = auth.currentUser;
      if (!user) {
        // Se não estiver logado, manda para login
        router.replace("/auth/login");
        return;
      }

      // Busca o usuário no Firestore (coleção "usuarios")
      const ref = doc(db, "usuarios", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        router.replace("/perfil"); // Ou alguma tela de onboarding
        return;
      }

      const dados = snap.data();
      // Exemplo: tipo: "vendedor", "comprador", "admin"
      if (dados.tipo === "vendedor") {
        router.replace("/painel-vendedor");
      } else if (dados.tipo === "comprador") {
        router.replace("/painel-comprador");
      } else if (dados.tipo === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/perfil"); // Ou página genérica
      }
    };
    redirectPainel();
  }, [router]);

  return (
    <div className="flex justify-center items-center h-40 text-lg text-blue-700 animate-pulse">
      Carregando painel...
    </div>
  );
}
