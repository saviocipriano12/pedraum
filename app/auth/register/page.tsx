"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/firebaseConfig";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import {
  Mail,
  Lock,
  User,
  Loader2,
  LogIn,
  Phone,
  Eye,
  EyeOff,
} from "lucide-react";

/* =========================
   Utils
========================= */
function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function formatWhatsapp(v: string) {
  // Ex.: (31) 91234-5678  | aceita 10 ou 11 dígitos
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/* =========================
   Page
========================= */
export default function RegisterPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const whatsappDigits = useMemo(() => onlyDigits(whatsapp), [whatsapp]);

  const formValido = useMemo(() => {
    return (
      nome.trim().length >= 3 &&
      isValidEmail(email) &&
      senha.length >= 6 &&
      (whatsappDigits.length === 10 || whatsappDigits.length === 11)
    );
  }, [nome, email, senha, whatsappDigits]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (!formValido) {
      setErro(
        "Verifique os dados: nome (mín. 3), e‑mail válido, senha (mín. 6) e WhatsApp completo."
      );
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha);
      const uid = cred.user.uid;

      await setDoc(doc(db, "usuarios", uid), {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        whatsapp: whatsappDigits, // salvo apenas dígitos para facilitar contato/consulta
        tipo: "usuario",
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        status: "ativo",
      });

      router.push("/auth/login");
    } catch (e: any) {
      // Mensagens amigáveis
      let msg = "Erro ao cadastrar. Tente novamente.";
      const code = e?.code || e?.message || "";

      if (String(code).includes("auth/email-already-in-use"))
        msg = "Este e‑mail já está em uso.";
      else if (String(code).includes("auth/invalid-email"))
        msg = "E‑mail inválido.";
      else if (String(code).includes("auth/weak-password"))
        msg = "Senha muito fraca. Use pelo menos 6 caracteres.";
      else if (String(code).includes("network"))
        msg = "Falha de conexão. Verifique sua internet.";

      setErro(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f7fafc] px-2 py-8">
      <div
        className="w-full max-w-xl mx-auto rounded-3xl border border-[#edf2f7] bg-white px-6 md:px-14 py-11 md:py-14 flex flex-col items-center shadow-xl"
        style={{
          borderTop: "5px solid #FB8500",
          borderImage: "linear-gradient(90deg,#FB8500 0%,#219EBC 100%) 1",
        }}
      >
        {/* Logo */}
        <Link href="/" className="mb-6 flex justify-center">
          <img
            src="/logo-pedraum.png"
            alt="Pedraum Brasil"
            style={{ height: 38, marginBottom: 10 }}
          />
        </Link>

        <h1
          className="text-3xl md:text-[2.2rem] font-black text-[#023047] mb-2 text-center"
          style={{ letterSpacing: "-0.5px" }}
        >
          Criar Conta
        </h1>
        <p className="text-gray-600 text-[16px] text-center mb-9 font-medium max-w-lg">
          Cadastre-se para acessar as{" "}
          <span className="text-[#FB8500] font-bold">oportunidades</span> do{" "}
          <span className="text-[#023047] font-black">Pedraum Brasil</span>
        </p>

        <form
          onSubmit={handleSubmit}
          className="w-full flex flex-col gap-6 md:gap-7"
          autoComplete="off"
        >
          {/* Nome */}
          <InputGroup
            icon={<User size={22} className="text-[#FB8500]" />}
            placeholder="Nome completo"
            value={nome}
            onChange={setNome}
            autoComplete="name"
          />

          {/* Email */}
          <InputGroup
            icon={<Mail size={22} className="text-[#FB8500]" />}
            placeholder="E‑mail"
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="username"
          />

          {/* Senha + toggle */}
          <InputGroup
            icon={<Lock size={22} className="text-[#FB8500]" />}
            placeholder="Senha (mín. 6 caracteres)"
            value={senha}
            onChange={setSenha}
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            trailing={
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="p-1 -mr-1"
                aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            }
          />

          {/* WhatsApp */}
          <InputGroup
            icon={<Phone size={22} className="text-[#FB8500]" />}
            placeholder="WhatsApp"
            value={whatsapp}
            onChange={(v: string) => setWhatsapp(formatWhatsapp(v))}
            type="tel"
            autoComplete="tel"
            maxLength={16}
            hint={
              whatsappDigits.length > 0 &&
              !(whatsappDigits.length === 10 || whatsappDigits.length === 11)
                ? "Informe DDD + número"
                : undefined
            }
          />

          {/* Erro */}
          {erro && (
            <div className="text-red-700 bg-red-100 border border-red-200 px-4 py-2 rounded-xl text-base text-center flex items-center justify-center gap-2 -mt-2">
              {erro}
            </div>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={loading || !formValido}
            className="w-full bg-gradient-to-r from-[#FB8500] to-[#FFB703] hover:from-[#FB8500] hover:to-[#ff9800] text-white py-4 rounded-xl font-bold text-xl flex items-center justify-center transition disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
            style={{ letterSpacing: ".01em", boxShadow: "0 6px 18px #ffb70355" }}
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2" size={26} />
            ) : (
              <LogIn className="mr-2" size={26} />
            )}
            {loading ? "Criando conta..." : "Criar Conta"}
          </button>
        </form>

        {/* Link Login */}
        <div className="mt-8 text-center text-[17px] w-full">
          <span className="text-gray-600">Já tem uma conta?</span>
          <Link
            href="/auth/login"
            className="ml-2 text-[#023047] font-bold hover:underline transition"
          >
            Entrar
          </Link>
        </div>
      </div>

      {/* CSS responsivo */}
      <style>{`
        @media (max-width: 700px) {
          .max-w-xl {
            max-width: 99vw !important;
            padding-left: 0.2rem !important;
            padding-right: 0.2rem !important;
          }
        }
        @media (max-width: 500px) {
          .max-w-xl {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
        }
        input::placeholder { color: #9aa3af; }
      `}</style>
    </main>
  );
}

/* =========================
   Components
========================= */
function InputGroup({
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
  autoComplete,
  className = "",
  maxLength,
  trailing,
  hint,
}: {
  icon?: React.ReactNode;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  className?: string;
  maxLength?: number;
  trailing?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className={`${className}`}>
      <div className="flex items-center border border-[#eaecef] rounded-xl px-4 py-4 bg-[#f9fafb] shadow-sm focus-within:border-[#FB8500] transition">
        {icon && <span className="mr-3">{icon}</span>}
        <input
          type={type}
          className="bg-transparent outline-none flex-1 text-[#023047] text-lg font-semibold"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          maxLength={maxLength}
          style={{ minWidth: 0 }}
          required
        />
        {trailing}
      </div>
      {hint && (
        <div className="text-xs text-[#dd6b20] mt-1 ml-1">{hint}</div>
      )}
    </div>
  );
}
