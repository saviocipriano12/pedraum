"use client";

import { useState } from "react";
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
  Building,
  MapPin,
  FileText,
} from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [comoConheceu, setComoConheceu] = useState("");
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!aceitaTermos) {
      setErro("É necessário aceitar os termos e política de privacidade.");
      return;
    }
    setLoading(true);
    try {
      // Só cria a conta se e-mail e senha estiverem preenchidos (obrigatório pelo Firebase)
      let cred = null;
      let uid = "";
      if (email && senha) {
        cred = await createUserWithEmailAndPassword(auth, email, senha);
        uid = cred.user.uid;
      } else {
        // Usuário pode se cadastrar sem e-mail/senha? Caso não, pode mostrar erro diferente.
        setErro("Preencha e-mail e senha para cadastrar sua conta.");
        setLoading(false);
        return;
      }
      await setDoc(doc(db, "usuarios", uid), {
        nome,
        email,
        whatsapp,
        cpfCnpj,
        cidade,
        estado,
        empresa,
        comoConheceu,
        tipo: "usuario", // Agora é tudo usuário!
        newsletter,
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
          Faça seu cadastro e aproveite o melhor do{" "}
          <span className="text-[#FB8500] font-bold">Pedraum Brasil</span>
        </p>

        <form
          onSubmit={handleSubmit}
          className="w-full flex flex-col gap-6 md:gap-7"
          autoComplete="off"
        >
          <InputGroup
            icon={<User size={22} className="text-[#FB8500]" />}
            placeholder="Nome completo"
            value={nome}
            onChange={setNome}
          />
          <InputGroup
            icon={<Mail size={22} className="text-[#FB8500]" />}
            placeholder="E-mail"
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="username"
          />
          <InputGroup
            icon={<Lock size={22} className="text-[#FB8500]" />}
            placeholder="Senha"
            value={senha}
            onChange={setSenha}
            type="password"
            autoComplete="new-password"
          />
          <InputGroup
            icon={<Phone size={22} className="text-[#FB8500]" />}
            placeholder="WhatsApp"
            value={whatsapp}
            onChange={setWhatsapp}
            type="tel"
            autoComplete="tel"
          />
          <InputGroup
            icon={<FileText size={22} className="text-[#FB8500]" />}
            placeholder="CPF ou CNPJ"
            value={cpfCnpj}
            onChange={setCpfCnpj}
          />
          <div className="flex gap-4">
            <InputGroup
              icon={<MapPin size={22} className="text-[#FB8500]" />}
              placeholder="Cidade"
              value={cidade}
              onChange={setCidade}
              className="flex-1"
            />
            <InputGroup
              placeholder="UF"
              value={estado}
              onChange={setEstado}
              maxLength={2}
              className="w-24"
            />
          </div>
          <InputGroup
            icon={<Building size={22} className="text-[#FB8500]" />}
            placeholder="Empresa (opcional)"
            value={empresa}
            onChange={setEmpresa}
          />
          <div>
            <select
              className="w-full border border-[#eaecef] rounded-xl px-4 py-3 bg-[#f9fafb] text-lg text-[#023047] font-semibold focus:border-[#FB8500] transition"
              value={comoConheceu}
              onChange={e => setComoConheceu(e.target.value)}
              style={{ marginBottom: 2 }}
            >
              <option value="">Como conheceu a plataforma?</option>
              <option value="indicacao">Indicação</option>
              <option value="instagram">Instagram</option>
              <option value="google">Google</option>
              <option value="feira">Feira/Evento</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div className="flex items-center mt-1 gap-2">
            <input
              type="checkbox"
              required
              className="accent-[#FB8500] w-5 h-5"
              checked={aceitaTermos}
              onChange={e => setAceitaTermos(e.target.checked)}
            />
            <span className="text-sm text-gray-700">
              Li e aceito os{" "}
              <Link href="/termos" className="underline text-[#FB8500]">
                Termos
              </Link>{" "}
              e a{" "}
              <Link href="/privacidade" className="underline text-[#FB8500]">
                Política de Privacidade
              </Link>
            </span>
          </div>
          <div className="flex items-center gap-2 mt-[-6px]">
            <input
              type="checkbox"
              className="accent-[#219EBC] w-5 h-5"
              checked={newsletter}
              onChange={e => setNewsletter(e.target.checked)}
            />
            <span className="text-sm text-gray-700">
              Desejo receber novidades e oportunidades por WhatsApp/e-mail
            </span>
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
            style={{
              letterSpacing: ".01em",
              boxShadow: "0 6px 18px #ffb70355",
              marginTop: 14,
            }}
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
      `}</style>
    </main>
  );
}

// Componente de Input agrupado com ícone (para facilitar responsividade e reuso)
function InputGroup({
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
  autoComplete,
  className = "",
  maxLength,
}: any) {
  return (
    <div className={`flex items-center border border-[#eaecef] rounded-xl px-4 py-4 bg-[#f9fafb] shadow-sm focus-within:border-[#FB8500] transition ${className}`}>
      {icon && icon}
      <input
        type={type}
        className="bg-transparent outline-none flex-1 text-[#023047] text-lg font-semibold"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        maxLength={maxLength}
        style={{ minWidth: 0 }}
      />
    </div>
  );
}
