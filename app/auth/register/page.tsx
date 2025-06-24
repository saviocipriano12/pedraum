"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/firebaseConfig";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { Mail, Lock, User, Loader2, LogIn } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [tipo, setTipo] = useState<string>("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!nome || !email || !senha || !tipo) {
      setErro("Preencha todos os campos!");
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      const uid = cred.user.uid;
      await setDoc(doc(db, "usuarios", uid), {
        nome,
        email,
        tipo,
        criadoEm: serverTimestamp(),
      });
      router.push("/auth/login");
    } catch (e: any) {
      setErro(e.message || "Erro ao cadastrar. Tente novamente.");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f7fafc] px-2 py-8">
      <div
        className="w-full max-w-2xl mx-auto rounded-3xl border border-[#edf2f7] bg-white px-12 py-14 flex flex-col items-center"
        style={{
          boxShadow: "0 4px 36px 0 rgba(33,50,89,0.14)",
          borderImage: "linear-gradient(90deg,#FB8500 0%,#219EBC 100%) 1",
          minHeight: 540,
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
        {/* Título */}
        <h1
          className="text-3xl md:text-[2.4rem] font-black text-[#023047] mb-3 text-center"
          style={{ letterSpacing: "-0.5px" }}
        >
          Criar Conta
        </h1>
        <p className="text-gray-600 text-[17px] text-center mb-10 font-medium max-w-lg">
          Faça seu cadastro e aproveite o melhor do{" "}
          <span className="text-[#FB8500] font-bold">Pedraum Brasil</span>
        </p>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="w-full space-y-6">
          {/* Nome */}
          <div>
            <label className="block mb-1 font-semibold text-[#023047] text-[16px]">Nome completo</label>
            <div className="flex items-center border border-[#eaecef] rounded-xl px-4 py-3 bg-[#f9fafb] shadow-sm focus-within:border-[#FB8500] transition">
              <User size={22} className="text-[#FB8500] mr-2" />
              <input
                type="text"
                className="bg-transparent outline-none flex-1 text-[#023047] text-lg font-semibold"
                placeholder="Seu nome completo"
                value={nome}
                onChange={e => setNome(e.target.value)}
                autoComplete="name"
              />
            </div>
          </div>
          {/* Email */}
          <div>
            <label className="block mb-1 font-semibold text-[#023047] text-[16px]">E-mail</label>
            <div className="flex items-center border border-[#eaecef] rounded-xl px-4 py-3 bg-[#f9fafb] shadow-sm focus-within:border-[#FB8500] transition">
              <Mail size={22} className="text-[#FB8500] mr-2" />
              <input
                type="email"
                className="bg-transparent outline-none flex-1 text-[#023047] text-lg font-semibold"
                placeholder="Seu e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
          </div>
          {/* Senha */}
          <div>
            <label className="block mb-1 font-semibold text-[#023047] text-[16px]">Senha</label>
            <div className="flex items-center border border-[#eaecef] rounded-xl px-4 py-3 bg-[#f9fafb] shadow-sm focus-within:border-[#FB8500] transition">
              <Lock size={22} className="text-[#FB8500] mr-2" />
              <input
                type="password"
                className="bg-transparent outline-none flex-1 text-[#023047] text-lg font-semibold"
                placeholder="Crie uma senha"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          {/* Radio - Objetivo */}
          <div>
            <label className="block mb-1 font-semibold text-[#023047] text-[16px]">
              Qual o seu objetivo na plataforma?
            </label>
            <div className="flex flex-col gap-2 mt-1">
              <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition ${
                tipo === "comprador"
                  ? "border-[#FB8500] bg-orange-50 shadow-sm"
                  : "border-[#eaecef] bg-white"
              }`}>
                <input
                  type="radio"
                  name="tipo"
                  value="comprador"
                  checked={tipo === "comprador"}
                  onChange={() => setTipo("comprador")}
                  className="accent-[#FB8500] w-5 h-5"
                />
                <span className="text-[16px]">Quero comprar/contratar</span>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition ${
                tipo === "vendedor"
                  ? "border-[#FB8500] bg-orange-50 shadow-sm"
                  : "border-[#eaecef] bg-white"
              }`}>
                <input
                  type="radio"
                  name="tipo"
                  value="vendedor"
                  checked={tipo === "vendedor"}
                  onChange={() => setTipo("vendedor")}
                  className="accent-[#FB8500] w-5 h-5"
                />
                <span className="text-[16px]">Quero vender/prestar serviço</span>
              </label>
            </div>
          </div>
          {/* Erro */}
          {erro && (
            <div className="text-red-700 bg-red-100 border border-red-200 px-4 py-2 rounded-xl text-base text-center flex items-center justify-center gap-2 mb-1 w-full">
              {erro}
            </div>
          )}
          {/* Botão */}
          <button
            type="submit"
            disabled={loading}
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
          <Link href="/auth/login" className="ml-2 text-[#023047] font-bold hover:underline transition">
            Entrar
          </Link>
        </div>
      </div>
      {/* CSS responsivo para card */}
      <style>{`
        @media (max-width: 700px) {
          .max-w-2xl {
            max-width: 99vw !important;
            padding-left: 0.2rem !important;
            padding-right: 0.2rem !important;
          }
        }
        @media (max-width: 500px) {
          .max-w-2xl {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
        }
      `}</style>
    </main>
  );
}
