// app/perfil/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { db, auth } from "@/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import ImageUploader from "@/components/ImageUploader";
import {
  ChevronLeft,
  Loader,
  Tag,
  LinkIcon,
  MapPin,
  Lock,
  HelpCircle,
} from "lucide-react";

/** =========================
 *  Constantes / Listas
 *  ========================= */
// Use somente números com DDI+DDD, ex: Brasil (55) + DDD (31) + número
const SUPPORT_WHATSAPP = "5531990903613"; // <- troque pelo seu

const estados = [
  "BRASIL",
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const categoriasBase = [
  "Equipamentos de Perfuração e Demolição",
  "Equipamentos de Carregamento e Transporte",
  "Britagem e Classificação",
  "Beneficiamento e Processamento Mineral",
  "Peças e Componentes Industriais",
  "Desgaste e Revestimento",
  "Automação, Elétrica e Controle",
  "Lubrificação e Produtos Químicos",
  "Equipamentos Auxiliares e Ferramentas",
  "EPIs (Equipamentos de Proteção Individual)",
  "Instrumentos de Medição e Controle",
  "Manutenção e Serviços Industriais",
  "Veículos e Pneus",
  "Outros"
];

const diasSemana = [
  { key: "seg", label: "Segunda" },
  { key: "ter", label: "Terça" },
  { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" },
  { key: "sex", label: "Sexta" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
];

type AgendaDia = { ativo: boolean; das: string; ate: string };

type PerfilForm = {
  nome: string;
  email: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  cpf_cnpj?: string;
  bio?: string;
  avatar?: string;
  tipo?: string;
  // Atuação
  prestaServicos: boolean;
  vendeProdutos: boolean;
  categoriasAtuacao: string[];  // até 5
  categoriasLocked?: boolean;   // trava edição após salvar com 5
  categoriasLockedAt?: any;
  // Cobertura
  atendeBrasil: boolean;
  ufsAtendidas: string[];
  // Agenda
  agenda: Record<string, AgendaDia>;
  // Portfólio
  portfolioImagens: string[];
  portfolioVideos: string[];
  // Preferências de lead
  leadPreferencias: {
    categorias: string[];
    ufs: string[];
    ticketMin?: number | null;
    ticketMax?: number | null;
  };
  // Mercado Pago
  mpConnected?: boolean;
  mpStatus?: string;
};

export default function PerfilPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // inputs auxiliares
  const [categoriaInput, setCategoriaInput] = useState("");
  const [leadCategoriaInput, setLeadCategoriaInput] = useState("");
  const [leadUfInput, setLeadUfInput] = useState("");
  const [novoVideo, setNovoVideo] = useState("");

  // controle de lock definitivo de categorias
  const [categoriasLocked, setCategoriasLocked] = useState<boolean>(false);
  const [categoriasOriginais, setCategoriasOriginais] = useState<string[]>([]);

  // Cidades da UF (IBGE)
  const [cidades, setCidades] = useState<string[]>([]);
  const [cidadesLoading, setCidadesLoading] = useState(false);
  const [cidadesErro, setCidadesErro] = useState<string | null>(null);

  // form principal
  const [form, setForm] = useState<PerfilForm>({
    nome: "",
    email: "",
    telefone: "",
    cidade: "",
    estado: "",
    cpf_cnpj: "",
    bio: "",
    avatar: "",
    tipo: "Usuário",
    prestaServicos: false,
    vendeProdutos: false,
    categoriasAtuacao: [],
    categoriasLocked: false,
    atendeBrasil: false,
    ufsAtendidas: [],
    agenda: Object.fromEntries(
      diasSemana.map(d => [d.key, { ativo: d.key !== "dom", das: "08:00", ate: "18:00" }])
    ) as Record<string, AgendaDia>,
    portfolioImagens: [],
    portfolioVideos: [],
    leadPreferencias: {
      categorias: [],
      ufs: [],
      ticketMin: null,
      ticketMax: null
    },
    mpConnected: false,
    mpStatus: "desconectado",
  });

  const avatarLista = useMemo(() => (form.avatar ? [form.avatar] : []), [form.avatar]);

  /** =========================
   *  Auth + Carregamento inicial
   *  ========================= */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.uid);
      const ref = doc(db, "usuarios", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data() || {};
        const cats = Array.isArray(data.categoriasAtuacao) ? data.categoriasAtuacao : [];
        setCategoriasOriginais(cats);
        setCategoriasLocked(!!data.categoriasLocked);

        setForm((prev) => ({
          ...prev,
          nome: data.nome || "",
          email: data.email || user.email || "",
          telefone: data.telefone || "",
          cidade: data.cidade || "",
          estado: data.estado || "",
          cpf_cnpj: data.cpf_cnpj || "",
          bio: data.bio || "",
          avatar: data.avatar || "",
          tipo: data.tipo || prev.tipo,
          prestaServicos: !!data.prestaServicos,
          vendeProdutos: !!data.vendeProdutos,
          categoriasAtuacao: cats,
          categoriasLocked: !!data.categoriasLocked,
          atendeBrasil: !!data.atendeBrasil,
          ufsAtendidas: data.ufsAtendidas || [],
          agenda: data.agenda || prev.agenda,
          portfolioImagens: data.portfolioImagens || [],
          portfolioVideos: data.portfolioVideos || [],
          leadPreferencias: {
            categorias: data.leadPreferencias?.categorias || [],
            ufs: data.leadPreferencias?.ufs || [],
            ticketMin: data.leadPreferencias?.ticketMin ?? null,
            ticketMax: data.leadPreferencias?.ticketMax ?? null,
          },
          mpConnected: !!data.mpConnected,
          mpStatus: data.mpStatus || "desconectado",
        }));
      } else {
        setForm((prev) => ({ ...prev, email: user.email || prev.email }));
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /** =========================
   *  UF → Cidades (IBGE + cache localStorage)
   *  ========================= */
  useEffect(() => {
    async function carregarCidades(uf: string) {
      if (!uf || uf === "BRASIL") {
        setCidades([]);
        setCidadesErro(null);
        return;
      }

      try {
        setCidadesLoading(true);
        setCidadesErro(null);

        const cacheKey = `cidades:${uf}`;
        const cached = typeof window !== "undefined" ? window.localStorage.getItem(cacheKey) : null;
        if (cached) {
          setCidades(JSON.parse(cached) as string[]);
          setCidadesLoading(false);
          return;
        }

        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
        if (!res.ok) throw new Error("Falha ao buscar cidades");

        const data = await res.json();
        const nomes = (data || [])
          .map((m: any) => m?.nome)
          .filter(Boolean)
          .sort((a: string, b: string) => a.localeCompare(b, "pt-BR"));

        setCidades(nomes);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(cacheKey, JSON.stringify(nomes));
        }
      } catch (e: any) {
        console.error(e);
        setCidadesErro("Não foi possível carregar cidades agora. Você pode digitar manualmente.");
        setCidades([]);
      } finally {
        setCidadesLoading(false);
      }
    }

    if (form.estado && form.estado !== "BRASIL") {
      carregarCidades(form.estado);
    } else {
      setCidades([]);
      setCidadesErro(null);
    }
  }, [form.estado]);

  /** =========================
   *  Helpers / Handlers
   *  ========================= */
  function setField<K extends keyof PerfilForm>(key: K, value: PerfilForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addCategoria() {
    if (categoriasLocked) return; // travado: não mexe
    if (!categoriaInput || form.categoriasAtuacao.includes(categoriaInput)) return;
    if (form.categoriasAtuacao.length >= 5) {
      setMsg("Você pode escolher até 5 categorias de atuação.");
      return;
    }
    setForm(f => ({ ...f, categoriasAtuacao: [...f.categoriasAtuacao, categoriaInput] }));
    setCategoriaInput("");
  }

  function removeCategoria(cat: string) {
    if (categoriasLocked) return; // travado: não mexe
    setForm(f => ({ ...f, categoriasAtuacao: f.categoriasAtuacao.filter(c => c !== cat) }));
  }

  async function pedirAlteracaoViaWhatsApp() {
  if (!userId) return;

  // (opcional) registra no Firestore para você ter histórico
  try {
    await addDoc(collection(db, "supportRequests"), {
      userId,
      tipo: "categoriasAtuacao",
      mensagem: "Solicito alteração nas minhas categorias de atuação.",
      createdAt: serverTimestamp(),
      status: "open",
      canal: "whatsapp",
    });
  } catch (e) {
    console.warn("Falha ao registrar ticket (segue somente via WhatsApp):", e);
  }

  // monta uma mensagem útil pro time
  const texto = `
Olá, equipe de suporte! Quero alterar minhas categorias de atuação.

• UID: ${userId}
• Nome: ${form.nome || "-"}
• E-mail: ${form.email || "-"}
• Categorias atuais: ${form.categoriasAtuacao?.join(", ") || "-"}

Mensagem: Solicito liberação para alterar minhas categorias.
  `.trim();

  // abre o WhatsApp Web/app com a mensagem preenchida
  const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(texto)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

  function toggleUfAtendida(uf: string) {
    if (uf === "BRASIL") {
      setForm(f => ({
        ...f,
        atendeBrasil: !f.atendeBrasil,
        ufsAtendidas: !f.atendeBrasil ? ["BRASIL"] : []
      }));
      return;
    }
    if (form.atendeBrasil) {
      setForm(f => ({ ...f, atendeBrasil: false, ufsAtendidas: [uf] }));
      return;
    }
    const has = form.ufsAtendidas.includes(uf);
    setForm(f => ({
      ...f,
      ufsAtendidas: has ? f.ufsAtendidas.filter(u => u !== uf) : [...f.ufsAtendidas, uf]
    }));
  }

  function addLeadCategoria() {
    if (!leadCategoriaInput) return;
    if (!form.leadPreferencias.categorias.includes(leadCategoriaInput)) {
      setForm(f => ({
        ...f,
        leadPreferencias: {
          ...f.leadPreferencias,
          categorias: [...f.leadPreferencias.categorias, leadCategoriaInput]
        }
      }));
    }
    setLeadCategoriaInput("");
  }

  function removeLeadCategoria(cat: string) {
    setForm(f => ({
      ...f,
      leadPreferencias: {
        ...f.leadPreferencias,
        categorias: f.leadPreferencias.categorias.filter(c => c !== cat)
      }
    }));
  }

  function addLeadUf() {
    if (!leadUfInput) return;
    if (!form.leadPreferencias.ufs.includes(leadUfInput)) {
      setForm(f => ({
        ...f,
        leadPreferencias: {
          ...f.leadPreferencias,
          ufs: [...f.leadPreferencias.ufs, leadUfInput]
        }
      }));
    }
    setLeadUfInput("");
  }

  function removeLeadUf(uf: string) {
    setForm(f => ({
      ...f,
      leadPreferencias: {
        ...f.leadPreferencias,
        ufs: f.leadPreferencias.ufs.filter(u => u !== uf)
      }
    }));
  }

  function addVideo() {
    if (!novoVideo.trim()) return;
    setForm(f => ({ ...f, portfolioVideos: [...f.portfolioVideos, novoVideo.trim()] }));
    setNovoVideo("");
  }

  function removeVideo(url: string) {
    setForm(f => ({ ...f, portfolioVideos: f.portfolioVideos.filter(v => v !== url) }));
  }

  async function pedirAlteracaoAoSuporte() {
    if (!userId) return;
    try {
      await addDoc(collection(db, "supportRequests"), {
        userId,
        tipo: "categoriasAtuacao",
        mensagem: "Solicito alteração nas minhas categorias de atuação.",
        createdAt: serverTimestamp(),
        status: "open",
      });
      alert("Pedido enviado ao suporte. Em breve entraremos em contato.");
    } catch (e) {
      console.error(e);
      alert("Falha ao abrir ticket. Tente novamente mais tarde.");
    }
  }

  async function salvar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!userId) return;

    setSaving(true);
    setMsg("");

    try {
      // Se já está travado, ignora qualquer tentativa de alteração local
      const categoriasParaSalvar = categoriasLocked ? categoriasOriginais : form.categoriasAtuacao;

      // Travar DEFINITIVO somente quando tiver exatamente 5 no momento do salvar
      const shouldLockNow = !categoriasLocked && categoriasParaSalvar.length === 5;

      await updateDoc(doc(db, "usuarios", userId), {
        nome: form.nome,
        telefone: form.telefone || "",
        cidade: form.estado === "BRASIL" ? "" : (form.cidade || ""),
        estado: form.estado || "",
        cpf_cnpj: form.cpf_cnpj || "",
        bio: form.bio || "",
        avatar: form.avatar || "",
        // atuação
        prestaServicos: form.prestaServicos,
        vendeProdutos: form.vendeProdutos,
        categoriasAtuacao: categoriasParaSalvar,
        ...(shouldLockNow ? { categoriasLocked: true, categoriasLockedAt: serverTimestamp() } : {}),
        // cobertura
        atendeBrasil: form.atendeBrasil,
        ufsAtendidas: form.atendeBrasil ? ["BRASIL"] : form.ufsAtendidas,
        // agenda
        agenda: form.agenda,
        // portfolio
        portfolioImagens: form.portfolioImagens,
        portfolioVideos: form.portfolioVideos,
        // preferências de lead
        leadPreferencias: {
          categorias: form.leadPreferencias.categorias,
          ufs: form.leadPreferencias.ufs,
          ticketMin: form.leadPreferencias.ticketMin ?? null,
          ticketMax: form.leadPreferencias.ticketMax ?? null
        },
        // Mercado Pago
        mpConnected: !!form.mpConnected,
        mpStatus: form.mpStatus || "desconectado"
      });

      if (shouldLockNow) {
        setCategoriasLocked(true);
        setCategoriasOriginais(categoriasParaSalvar);
      }

      setMsg("Perfil atualizado com sucesso!");
    } catch (err) {
      console.error(err);
      setMsg("Erro ao salvar alterações.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 4000);
    }
  }

  const connectMercadoPago = () => {
    window.location.href = "/api/mercado-pago/connect";
  };

  /** =========================
   *  UI
   *  ========================= */

  if (loading) {
    return (
      <section style={{ maxWidth: 980, margin: "0 auto", padding: "50px 2vw 70px 2vw" }}>
        <div style={{ textAlign: "center", color: "#219EBC", fontWeight: 800 }}>
          <Loader className="animate-spin" /> Carregando perfil...
        </div>
      </section>
    );
  }

  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "40px 2vw 70px 2vw" }}>
      <Link
        href="/painel"
        className="hover:opacity-80"
        style={{ color: "#2563eb", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20, textDecoration: "none" }}
      >
        <ChevronLeft size={18} /> Voltar ao Painel
      </Link>

      <h1 style={{ fontSize: "2.2rem", fontWeight: 900, color: "#023047", letterSpacing: "-1px", marginBottom: 20 }}>
        Meu Perfil
      </h1>

      {/* Banner de lock de categorias */}
      {categoriasLocked && (
        <div className="lock-banner">
          <Lock size={16} />
          Suas categorias de atuação estão travadas. Para alterar, fale com o suporte.
          <button
  type="button"
  className="btn-sec"
  onClick={pedirAlteracaoViaWhatsApp}
>
  <HelpCircle size={14} /> Pedir alteração ao suporte
</button>

        </div>
      )}

      <form onSubmit={salvar} className="grid gap-16">
        {/* Card 1: Identidade */}
        <div className="card">
          <div className="card-title">Identidade e Contato</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <div className="label">Foto do Perfil</div>
              <ImageUploader imagens={avatarLista} setImagens={(arr) => setField("avatar", arr[0] || "")} max={1} />
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>Use uma imagem quadrada para melhor resultado.</div>
            </div>

            <div className="grid gap-4">
              <label className="label">Nome</label>
              <input className="input" value={form.nome} onChange={(e) => setField("nome", e.target.value)} required />

              <label className="label">E-mail</label>
              <input className="input" value={form.email} disabled />

              <label className="label">WhatsApp</label>
              <input className="input" value={form.telefone || ""} onChange={(e) => setField("telefone", e.target.value)} placeholder="(xx) xxxxx-xxxx" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Estado (UF)</label>
                  <select
                    className="input"
                    value={form.estado || ""}
                    onChange={(e) => {
                      const uf = e.target.value;
                      setForm(f => ({ ...f, estado: uf, cidade: "" })); // reset cidade
                    }}
                  >
                    <option value="">Selecione</option>
                    {estados.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Cidade</label>

                  {/* Sem UF ou BRASIL: desabilita */}
                  {(!form.estado || form.estado === "BRASIL") && (
                    <input className="input" value={form.cidade || ""} placeholder="—" disabled />
                  )}

                  {/* Com UF válida */}
                  {form.estado && form.estado !== "BRASIL" && (
                    <>
                      {cidadesLoading && (
                        <input className="input" value="Carregando cidades..." disabled />
                      )}

                      {!cidadesLoading && !cidadesErro && cidades.length > 0 && (
                        <select
                          className="input"
                          value={form.cidade || ""}
                          onChange={(e) => setField("cidade", e.target.value)}
                        >
                          <option value="">Selecione</option>
                          {cidades.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      )}

                      {!cidadesLoading && cidadesErro && (
                        <>
                          <input
                            className="input"
                            value={form.cidade || ""}
                            onChange={(e) => setField("cidade", e.target.value)}
                            placeholder="Digite sua cidade"
                          />
                          <div style={{ color: "#b45309", fontSize: 12, marginTop: 6 }}>
                            {cidadesErro}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              <label className="label">CPF ou CNPJ</label>
              <input className="input" value={form.cpf_cnpj || ""} onChange={(e) => setField("cpf_cnpj", e.target.value)} placeholder="Somente números" />

              <label className="label">Bio / Sobre você</label>
              <textarea className="input" rows={3} value={form.bio || ""} onChange={(e) => setField("bio", e.target.value)} placeholder="Conte um pouco sobre você, sua empresa ou serviços" />
            </div>
          </div>
        </div>

        {/* Card 2: Atuação / Categorias (lock definitivo) */}
        <div className="card">
          <div className="card-title">Atuação</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="grid gap-2">
              <label className="checkbox">
                <input type="checkbox" checked={form.prestaServicos}
                       onChange={(e) => setField("prestaServicos", e.target.checked)} />
                <span>Presto serviços</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={form.vendeProdutos}
                       onChange={(e) => setField("vendeProdutos", e.target.checked)} />
                <span>Vendo produtos</span>
              </label>
            </div>

            <div>
              <div className="label">Categorias que você atua (até 5)</div>
              <div className="flex gap-2 items-center">
                <select
                  className="input"
                  value={categoriaInput}
                  onChange={(e) => setCategoriaInput(e.target.value)}
                  disabled={categoriasLocked}
                >
                  <option value="">Selecionar categoria...</option>
                  {categoriasBase.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button type="button" className="btn-sec" onClick={addCategoria} disabled={categoriasLocked}>
                  + Adicionar
                </button>
              </div>

              {form.categoriasAtuacao.length > 0 && (
                <div className="chips">
                  {form.categoriasAtuacao.map((c) => (
                    <span key={c} className="chip" title={categoriasLocked ? "Categorias travadas" : ""}>
                      <Tag size={14} /> {c}
                      {!categoriasLocked && (
                        <button type="button" onClick={() => removeCategoria(c)}>×</button>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {categoriasLocked ? (
                <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", color: "#9a3412" }}>
                  <span style={{ fontWeight: 800 }}>
                    <Lock size={12} style={{ display: "inline", marginRight: 6 }} />
                    Categorias travadas
                  </span>
                  <button
  type="button"
  className="btn-sec"
  onClick={pedirAlteracaoViaWhatsApp}
>
  <HelpCircle size={14} /> Pedir alteração ao suporte
</button>

                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 12, color: "#334155" }}>
                  Ao salvar com 5 categorias, seu perfil ficará travado para alterações.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Cobertura */}
        <div className="card">
          <div className="card-title">Cobertura / UFs Atendidas</div>

          <label className="checkbox" style={{ marginBottom: 10 }}>
            <input type="checkbox" checked={form.atendeBrasil} onChange={() => toggleUfAtendida("BRASIL")} />
            <span>Atendo o Brasil inteiro</span>
          </label>

          {!form.atendeBrasil && (
            <>
              <div className="label">Selecione UFs</div>
              <div className="grid grid-cols-8 gap-2 max-sm:grid-cols-4">
                {estados.filter(e => e !== "BRASIL").map((uf) => {
                  const checked = form.ufsAtendidas.includes(uf);
                  return (
                    <button
                      key={uf}
                      type="button"
                      onClick={() => toggleUfAtendida(uf)}
                      className="pill"
                      style={{
                        background: checked ? "#219EBC" : "#f3f6fa",
                        color: checked ? "#fff" : "#023047",
                        borderColor: checked ? "#1a7a93" : "#e6e9ef"
                      }}
                    >{uf}</button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Card 4: Disponibilidade / Agenda */}
        <div className="card">
          <div className="card-title">Disponibilidade / Agenda</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {diasSemana.map((d) => {
              const dia = form.agenda[d.key] || { ativo: false, das: "08:00", ate: "18:00" };
              return (
                <div key={d.key} className="agenda-row">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={dia.ativo}
                      onChange={(e) => setForm(f => ({
                        ...f,
                        agenda: { ...f.agenda, [d.key]: { ...dia, ativo: e.target.checked } }
                      }))}
                    />
                    <span>{d.label}</span>
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="time"
                      className="input"
                      value={dia.das}
                      disabled={!dia.ativo}
                      onChange={(e) => setForm(f => ({
                        ...f,
                        agenda: { ...f.agenda, [d.key]: { ...dia, das: e.target.value } }
                      }))}
                    />
                    <span>às</span>
                    <input
                      type="time"
                      className="input"
                      value={dia.ate}
                      disabled={!dia.ativo}
                      onChange={(e) => setForm(f => ({
                        ...f,
                        agenda: { ...f.agenda, [d.key]: { ...dia, ate: e.target.value } }
                      }))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 5: Portfólio */}
        <div className="card">
          <div className="card-title">Portfólio</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <div className="label">Imagens (até 12)</div>
              <ImageUploader
                imagens={form.portfolioImagens}
                setImagens={(arr: string[]) => setField("portfolioImagens", arr)}
                max={12}
              />
            </div>
            <div>
              <div className="label">Vídeos (URLs YouTube/Vimeo)</div>
              <div className="flex gap-2">
                <input className="input" placeholder="https://..." value={novoVideo} onChange={(e) => setNovoVideo(e.target.value)} />
                <button type="button" className="btn-sec" onClick={addVideo}>+ Adicionar</button>
              </div>
              {form.portfolioVideos.length > 0 && (
                <ul style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {form.portfolioVideos.map((v) => (
                    <li key={v} className="video-row">
                      <LinkIcon size={16} /> <a href={v} target="_blank" className="a">{v}</a>
                      <button type="button" onClick={() => removeVideo(v)} title="Remover">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Card 6: Preferências de Lead */}
        <div className="card">
          <div className="card-title">Preferências de Lead</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <div className="label">Categorias preferidas</div>
              <div className="flex gap-2 items-center">
                <select className="input" value={leadCategoriaInput} onChange={(e) => setLeadCategoriaInput(e.target.value)}>
                  <option value="">Selecionar...</option>
                  {categoriasBase.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button type="button" className="btn-sec" onClick={addLeadCategoria}>+ Adicionar</button>
              </div>
              {form.leadPreferencias.categorias.length > 0 && (
                <div className="chips">
                  {form.leadPreferencias.categorias.map((c) => (
                    <span key={c} className="chip">
                      <Tag size={14} /> {c}
                      <button type="button" onClick={() => removeLeadCategoria(c)}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="label">UFs preferidas</div>
              <div className="flex gap-2 items-center">
                <select className="input" value={leadUfInput} onChange={(e) => setLeadUfInput(e.target.value)}>
                  <option value="">Selecionar UF...</option>
                  {estados.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
                <button type="button" className="btn-sec" onClick={addLeadUf}>+ Adicionar</button>
              </div>
              {form.leadPreferencias.ufs.length > 0 && (
                <div className="chips">
                  {form.leadPreferencias.ufs.map((u) => (
                    <span key={u} className="chip">
                      <MapPin size={14} /> {u}
                      <button type="button" onClick={() => removeLeadUf(u)}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3" style={{ marginTop: 10 }}>
                <div>
                  <div className="label">Ticket mínimo (R$)</div>
                  <input
                    type="number"
                    className="input"
                    value={form.leadPreferencias.ticketMin ?? ""}
                    onChange={(e) => setForm(f => ({
                      ...f, leadPreferencias: { ...f.leadPreferencias, ticketMin: e.target.value ? Number(e.target.value) : null }
                    }))}
                    min={0}
                  />
                </div>
                <div>
                  <div className="label">Ticket máximo (R$)</div>
                  <input
                    type="number"
                    className="input"
                    value={form.leadPreferencias.ticketMax ?? ""}
                    onChange={(e) => setForm(f => ({
                      ...f, leadPreferencias: { ...f.leadPreferencias, ticketMax: e.target.value ? Number(e.target.value) : null }
                    }))}
                    min={0}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mensagens + Salvar */}
        {msg && (
          <div
            style={{
              background: msg.includes("sucesso") ? "#f7fafc" : "#fff7f7",
              color: msg.includes("sucesso") ? "#16a34a" : "#b91c1c",
              border: `1.5px solid ${msg.includes("sucesso") ? "#c3f3d5" : "#ffdada"}`,
              padding: "12px",
              borderRadius: 12,
              textAlign: "center",
              fontWeight: 800,
              marginTop: -6
            }}
          >
            {msg}
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" className="btn-gradient" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </form>

      {/* estilos */}
      <style jsx>{`
        .card {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 4px 28px #0001;
          padding: 24px 22px;
        }
        .card-title {
          font-weight: 900;
          color: #023047;
          font-size: 1.2rem;
          margin-bottom: 14px;
        }
        .label {
          font-weight: 800;
          color: #023047;
          margin-bottom: 6px;
          display: block;
        }
        .input {
          width: 100%;
          border: 1.6px solid #e5e7eb;
          border-radius: 10px;
          background: #f8fafc;
          padding: 11px 12px;
          font-size: 16px;
          color: #222;
          outline: none;
        }
        .checkbox {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          color: #023047;
        }
        .chips {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f3f7ff;
          color: #2563eb;
          border: 1px solid #e0ecff;
          padding: 6px 10px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 0.95rem;
        }
        .chip button {
          background: none; border: none; color: #999; font-weight: 900; cursor: pointer;
        }
        .pill {
          border: 1px solid #e6e9ef;
          border-radius: 999px;
          padding: 6px 10px;
          font-weight: 800;
          font-size: 0.95rem;
        }
        .agenda-row {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 10px;
          border: 1px dashed #e8eaf0;
          border-radius: 12px;
          padding: 12px;
          background: #f9fafb;
        }
        .btn-sec {
          background: #f7f9fc;
          color: #2563eb;
          border: 1px solid #e0ecff;
          font-weight: 800;
          border-radius: 10px;
          padding: 10px 14px;
        }
        .btn-gradient {
          background: linear-gradient(90deg,#fb8500,#fb8500);
          color: #fff;
          font-weight: 900;
          border: none;
          border-radius: 14px;
          padding: 14px 26px;
          font-size: 1.08rem;
          box-shadow: 0 4px 18px #fb850033;
        }
        .video-row {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 8px;
          background: #f7fafc;
          border: 1px solid #e6edf6;
          border-radius: 10px;
          padding: 8px 10px;
        }
        .video-row .a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .video-row button {
          background: none; border: none; color: #999; font-weight: 900; cursor: pointer;
        }
        .lock-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff7ed;
          border: 1px solid #ffedd5;
          color: #9a3412;
          padding: 10px 12px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-weight: 800;
        }
        @media (max-width: 650px) {
          .card { padding: 18px 14px; border-radius: 14px; }
        }
      `}</style>
    </section>
  );
}
