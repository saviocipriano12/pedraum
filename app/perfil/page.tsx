"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import ImageUploader from "@/components/ImageUploader";
import { Loader, ChevronLeft, User } from "lucide-react";
import Link from "next/link";

type Perfil = {
  nome: string;
  email: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  cpf_cnpj?: string;
  bio?: string;
  avatar?: string; // URL da imagem
  tipo?: string;
};

export default function PerfilPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Perfil>({
    nome: "",
    email: "",
    telefone: "",
    cidade: "",
    estado: "",
    cpf_cnpj: "",
    bio: "",
    avatar: "",
    tipo: "",
  });
  const [avatar, setAvatar] = useState<string>(""); // Armazena a url da foto enviada
  const [msg, setMsg] = useState("");

  // Descobre usuário logado
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  // Busca dados do perfil
  useEffect(() => {
    async function fetchPerfil() {
      if (!userId) return;
      setLoading(true);
      const refUser = doc(db, "usuarios", userId);
      const snap = await getDoc(refUser);
      if (snap.exists()) {
        const data = snap.data() as Perfil;
        setPerfil(data);
        setForm({
          nome: data.nome || "",
          email: data.email || "",
          telefone: data.telefone || "",
          cidade: data.cidade || "",
          estado: data.estado || "",
          cpf_cnpj: data.cpf_cnpj || "",
          bio: data.bio || "",
          avatar: data.avatar || "",
          tipo: data.tipo || "",
        });
        setAvatar(data.avatar || "");
      }
      setLoading(false);
    }
    if (userId) fetchPerfil();
  }, [userId]);

  // Salva alterações
  async function salvar() {
    if (!userId) return;
    setSaving(true);
    setMsg("");
    try {
      await updateDoc(doc(db, "usuarios", userId), {
        nome: form.nome,
        telefone: form.telefone,
        cidade: form.cidade,
        estado: form.estado,
        cpf_cnpj: form.cpf_cnpj,
        bio: form.bio,
        avatar: avatar,
      });
      setMsg("Perfil atualizado com sucesso!");
    } catch {
      setMsg("Erro ao salvar alterações.");
    }
    setSaving(false);
  }

  return (
    <section style={{ maxWidth: 620, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}>
      <Link href="/painel" style={{
        display: "flex", alignItems: "center", marginBottom: 24, color: "#2563eb", fontWeight: 700, fontSize: 16
      }}>
        <ChevronLeft size={19} /> Voltar ao Painel
      </Link>
      <h1 style={{
        fontSize: "2.2rem",
        fontWeight: 900,
        color: "#023047",
        letterSpacing: "-1.1px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 38,
      }}>
        <span style={{
          display: "inline-block",
          padding: "7px 30px",
          background: "#f3f6fa",
          color: "#023047",
          borderRadius: "12px",
          boxShadow: "0 2px 12px #0001",
          fontWeight: 800,
          fontSize: "2rem"
        }}>
          Meu Perfil
        </span>
      </h1>
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 0" }}>
          <Loader className="animate-spin mr-2" size={26} color="#219EBC" />
          <span style={{ fontSize: 20, fontWeight: 700, color: "#219EBC" }}>Carregando dados...</span>
        </div>
      ) : (
        <form
          className="w-full bg-white rounded-2xl shadow-2xl p-8 flex flex-col gap-7"
          onSubmit={e => { e.preventDefault(); salvar(); }}
        >
          {/* Imagem do Perfil */}
          <div className="flex flex-col items-center gap-3 mb-5">
            <ImageUploader imagens={avatar ? [avatar] : []} setImagens={arr => setAvatar(arr[0] || "")} max={1} circular />
            <div className="font-bold text-lg text-[#023047]">{form.nome || "Seu Nome"}</div>
            <div className="text-gray-500">{form.email}</div>
            <div className="text-[#2563eb] font-semibold">{form.tipo || "Usuário"}</div>
          </div>
          {/* Campos editáveis */}
          <div className="flex flex-col gap-4">
            <label className="font-semibold text-[#023047]">
              Nome
              <input
                className="block w-full mt-1 px-4 py-3 border border-[#e4e8ef] rounded-lg bg-[#f7fafd] font-medium text-base outline-none"
                type="text"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                required
              />
            </label>
            <label className="font-semibold text-[#023047]">
              Telefone
              <input
                className="block w-full mt-1 px-4 py-3 border border-[#e4e8ef] rounded-lg bg-[#f7fafd] font-medium text-base outline-none"
                type="tel"
                value={form.telefone}
                onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                placeholder="(xx) xxxxx-xxxx"
              />
            </label>
            <label className="font-semibold text-[#023047]">
              Cidade
              <input
                className="block w-full mt-1 px-4 py-3 border border-[#e4e8ef] rounded-lg bg-[#f7fafd] font-medium text-base outline-none"
                type="text"
                value={form.cidade}
                onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                placeholder="Cidade"
              />
            </label>
            <label className="font-semibold text-[#023047]">
              Estado
              <input
                className="block w-full mt-1 px-4 py-3 border border-[#e4e8ef] rounded-lg bg-[#f7fafd] font-medium text-base outline-none"
                type="text"
                value={form.estado}
                onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                placeholder="Estado"
              />
            </label>
            <label className="font-semibold text-[#023047]">
              CPF/CNPJ
              <input
                className="block w-full mt-1 px-4 py-3 border border-[#e4e8ef] rounded-lg bg-[#f7fafd] font-medium text-base outline-none"
                type="text"
                value={form.cpf_cnpj}
                onChange={e => setForm(f => ({ ...f, cpf_cnpj: e.target.value }))}
                placeholder="CPF ou CNPJ"
              />
            </label>
            <label className="font-semibold text-[#023047]">
              Bio / Sobre você
              <textarea
                className="block w-full mt-1 px-4 py-3 border border-[#e4e8ef] rounded-lg bg-[#f7fafd] font-medium text-base outline-none"
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                rows={3}
                placeholder="Conte um pouco sobre você, sua empresa ou serviços"
              />
            </label>
          </div>
          {msg && <div className="text-center mt-3 font-semibold" style={{ color: msg.includes("sucesso") ? "#18B56D" : "#E85D04" }}>{msg}</div>}
          <button
            type="submit"
            disabled={saving}
            className="bg-[#FB8500] text-white text-lg font-bold rounded-xl py-3 mt-5 shadow-md hover:opacity-90 transition"
          >
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </form>
      )}
      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 650px) {
          h1 span { font-size: 1.23rem !important; padding: 7px 10px !important; }
          .rounded-2xl { border-radius: 0.95rem !important; }
          .p-8 { padding: 1.2rem !important; }
        }
      `}</style>
    </section>
  );
}
