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
 *  Taxonomia (Categoria → Subcategorias)
 *  ========================= */
const TAXONOMIA: Record<string, string[]> = {
  "Equipamentos de Perfuração e Demolição": [
    "Perfuratrizes",
    "Rompedores/Martelos",
    "Bits/Brocas",
    "Carretas de Perfuração",
    "Compressores",
    "Ferramentas de Demolição",
  ],
  "Equipamentos de Carregamento e Transporte": [
    "Pás-Carregadeiras",
    "Escavadeiras",
    "Retroescavadeiras",
    "Caminhões Fora-de-Estrada",
    "Tratores de Esteiras",
    "Motoniveladoras",
  ],
  "Britagem e Classificação": [
    "Britador de Mandíbulas",
    "Britador Cônico",
    "Britador de Impacto",
    "Peneiras Vibratórias",
    "Alimentadores",
    "Correias Transportadoras",
  ],
  "Beneficiamento e Processamento Mineral": [
    "Moinhos (Bolas/Rolos)",
    "Ciclones",
    "Classificadores Espirais",
    "Espessadores",
    "Flotação",
    "Bombas de Polpa",
  ],
  "Peças e Componentes Industriais": [
    "Motores",
    "Transmissões/Redutores",
    "Sistemas Hidráulicos",
    "Sistemas Elétricos",
    "Filtros e Filtração",
    "Mangueiras/Conexões",
  ],
  "Desgaste e Revestimento": [
    "Revestimento de Britadores",
    "Chapas AR",
    "Dentes/Lâminas",
    "Placas Cerâmicas",
    "Revestimentos de Borracha",
  ],
  "Automação, Elétrica e Controle": [
    "CLPs/Controladores",
    "Sensores/Instrumentação",
    "Inversores/Soft-Starters",
    "Painéis/Quadros",
    "SCADA/Supervisório",
  ],
  "Lubrificação e Produtos Químicos": [
    "Óleos e Graxas",
    "Sistemas Centralizados",
    "Aditivos",
    "Reagentes de Flotação",
    "Desincrustantes/Limpeza",
  ],
  "Equipamentos Auxiliares e Ferramentas": [
    "Geradores",
    "Soldagem/Corte",
    "Bombas",
    "Ferramentas de Torque",
    "Compressores Auxiliares",
  ],
  "EPIs (Equipamentos de Proteção Individual)": [
    "Capacetes",
    "Luvas",
    "Óculos/Face Shield",
    "Respiradores",
    "Protetores Auriculares",
    "Botas",
  ],
  "Instrumentos de Medição e Controle": [
    "Vibração/Análise",
    "Alinhamento a Laser",
    "Balanças/Pesagem",
    "Medidores de Espessura",
    "Termografia",
  ],
  "Manutenção e Serviços Industriais": [
    "Mecânica Pesada",
    "Caldeiraria/Solda",
    "Usinagem",
    "Alinhamento/Balanceamento",
    "Inspeções/NR",
    "Elétrica/Automação",
  ],
  "Veículos e Pneus": [
    "Pickups/Utilitários",
    "Caminhões 3/4",
    "Empilhadeiras",
    "Pneus OTR",
    "Recapagem/Serviços",
  ],
  "Outros": ["Diversos"],
};

// Derivados
const CATEGORIAS = Object.keys(TAXONOMIA);

// Use somente números com DDI+DDD, ex: Brasil (55) + DDD (31) + número
const SUPPORT_WHATSAPP = "5531990903613";

const estados = [
  "BRASIL",
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
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
type CategoriaPair = { categoria: string; subcategoria: string };

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
  // NOVO: pares de atuação (Categoria → Subcategoria), até 5
  categoriasAtuacaoPairs: CategoriaPair[];
  // legado (mantido por compatibilidade com telas antigas/filtros):
  categoriasAtuacao: string[];
  categoriasLocked?: boolean;
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
    categorias: string[]; // mantém simples por enquanto
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

  // Seletores categoria → subcategoria
  const [selCategoria, setSelCategoria] = useState("");
  const [selSubcategoria, setSelSubcategoria] = useState("");

  // controle de lock definitivo de categorias
  const [categoriasLocked, setCategoriasLocked] = useState<boolean>(false);
  const [pairsOriginais, setPairsOriginais] = useState<CategoriaPair[]>([]);

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
    categoriasAtuacaoPairs: [],
    categoriasAtuacao: [], // legado
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
        const data: any = snap.data() || {};

        // Lock e pares (novo) + fallback para legado
        const locked = !!data.categoriasLocked;
        const pairs: CategoriaPair[] = Array.isArray(data.categoriasAtuacaoPairs)
          ? (data.categoriasAtuacaoPairs as CategoriaPair[])
          : [];

        // Se não tem pares, tentar construir a partir do legado (categoria sem sub ainda)
        let initialPairs = pairs;
        if (!pairs?.length && Array.isArray(data.categoriasAtuacao) && data.categoriasAtuacao.length) {
          initialPairs = (data.categoriasAtuacao as string[])
            .slice(0, 5)
            .map((c: string) => ({
              categoria: c,
              subcategoria: "", // usuário deverá selecionar antes de salvar
            }));
        }

        setPairsOriginais(initialPairs);
        setCategoriasLocked(locked);

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
          categoriasAtuacaoPairs: initialPairs,
          categoriasAtuacao: Array.isArray(data.categoriasAtuacao) ? data.categoriasAtuacao : [], // legado
          categoriasLocked: locked,
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

  const subcatsDaSelecionada = selCategoria ? TAXONOMIA[selCategoria] || [] : [];

  function addParCategoria() {
    if (categoriasLocked) return; // travado: não mexe
    if (!selCategoria) {
      setMsg("Selecione uma categoria.");
      return;
    }
    if (!selSubcategoria) {
      setMsg("Selecione uma subcategoria.");
      return;
    }
    if (form.categoriasAtuacaoPairs.length >= 5) {
      setMsg("Você pode escolher até 5 categorias (pares).");
      return;
    }
    // Regra: 1 categoria principal não pode se repetir (garante 5 categorias distintas)
    const jaTemMesmaCategoria = form.categoriasAtuacaoPairs.some(
      (p) => p.categoria === selCategoria
    );
    if (jaTemMesmaCategoria) {
      setMsg("Você já escolheu essa categoria. Remova o par atual para trocar a subcategoria.");
      return;
    }
    const novoPar: CategoriaPair = { categoria: selCategoria, subcategoria: selSubcategoria };
    setForm((f) => ({
      ...f,
      categoriasAtuacaoPairs: [...f.categoriasAtuacaoPairs, novoPar],
    }));
    setSelCategoria("");
    setSelSubcategoria("");
    setMsg("");
  }

  function removeParCategoria(par: CategoriaPair) {
    if (categoriasLocked) return;
    setForm((f) => ({
      ...f,
      categoriasAtuacaoPairs: f.categoriasAtuacaoPairs.filter(
        (p) => !(p.categoria === par.categoria && p.subcategoria === par.subcategoria)
      ),
    }));
  }

  async function pedirAlteracaoViaWhatsApp() {
    if (!userId) return;
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

    const texto = `
Olá, equipe de suporte! Quero alterar minhas categorias de atuação.

• UID: ${userId}
• Nome: ${form.nome || "-"}
• E-mail: ${form.email || "-"}
• Categorias atuais: ${form.categoriasAtuacaoPairs?.map(p=>`${p.categoria} › ${p.subcategoria||"-"}`).join(" | ") || "-"}

Mensagem: Solicito liberação para alterar minhas categorias.
    `.trim();

    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function toggleUfAtendida(uf: string) {
    if (uf === "BRASIL") {
      setForm((f) => ({
        ...f,
        atendeBrasil: !f.atendeBrasil,
        ufsAtendidas: !f.atendeBrasil ? ["BRASIL"] : [],
      }));
      return;
    }
    if (form.atendeBrasil) {
      setForm((f) => ({ ...f, atendeBrasil: false, ufsAtendidas: [uf] }));
      return;
    }
    const has = form.ufsAtendidas.includes(uf);
    setForm((f) => ({
      ...f,
      ufsAtendidas: has ? f.ufsAtendidas.filter((u) => u !== uf) : [...f.ufsAtendidas, uf],
    }));
  }

  function addLeadCategoria() {
    // Mantemos preferências simples por enquanto
    const escolha = selCategoria || "";
    if (!escolha) return;
    if (!form.leadPreferencias.categorias.includes(escolha)) {
      setForm((f) => ({
        ...f,
        leadPreferencias: {
          ...f.leadPreferencias,
          categorias: [...f.leadPreferencias.categorias, escolha],
        },
      }));
    }
  }

  function removeLeadCategoria(cat: string) {
    setForm((f) => ({
      ...f,
      leadPreferencias: {
        ...f.leadPreferencias,
        categorias: f.leadPreferencias.categorias.filter((c) => c !== cat),
      },
    }));
  }

  function addLeadUf(uf: string) {
    if (!uf) return;
    if (!form.leadPreferencias.ufs.includes(uf)) {
      setForm((f) => ({
        ...f,
        leadPreferencias: {
          ...f.leadPreferencias,
          ufs: [...f.leadPreferencias.ufs, uf],
        },
      }));
    }
  }

  function removeLeadUf(uf: string) {
    setForm((f) => ({
      ...f,
      leadPreferencias: {
        ...f.leadPreferencias,
        ufs: f.leadPreferencias.ufs.filter((u) => u !== uf),
      },
    }));
  }

  function addVideo(url?: string) {
    const value = (url ?? "").trim();
    if (!value) return;
    setForm((f) => ({ ...f, portfolioVideos: [...f.portfolioVideos, value] }));
  }

  function removeVideo(url: string) {
    setForm((f) => ({ ...f, portfolioVideos: f.portfolioVideos.filter((v) => v !== url) }));
  }

  async function salvar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!userId) return;

    setSaving(true);
    setMsg("");

    try {
      // Valida pares: todos precisam ter subcategoria
      if (!form.categoriasAtuacaoPairs.length) {
        setMsg("Escolha pelo menos 1 par (Categoria + Subcategoria).");
        setSaving(false);
        return;
      }
      if (form.categoriasAtuacaoPairs.length > 5) {
        setMsg("Você pode escolher no máximo 5 categorias (pares).");
        setSaving(false);
        return;
      }
      const algumSemSub = form.categoriasAtuacaoPairs.some(
        (p) => !p.subcategoria || p.subcategoria.trim() === ""
      );
      if (algumSemSub) {
        setMsg("Todos os pares precisam de subcategoria selecionada.");
        setSaving(false);
        return;
      }

      // Garante unicidade de categorias principais:
      const categoriasPrincipais = form.categoriasAtuacaoPairs.map((p) => p.categoria);
      const setCategorias = new Set(categoriasPrincipais);
      if (setCategorias.size !== categoriasPrincipais.length) {
        setMsg("Cada categoria principal deve ser única (uma subcategoria por categoria).");
        setSaving(false);
        return;
      }

      // Se já está travado, ignora qualquer tentativa de alteração local
      const paresParaSalvar = categoriasLocked ? pairsOriginais : form.categoriasAtuacaoPairs;

      // Travar DEFINITIVO somente quando tiver exatamente 5 no momento do salvar
      const shouldLockNow = !categoriasLocked && paresParaSalvar.length === 5;

      // Legado: mantemos também `categoriasAtuacao` como lista de categorias principais (para filtros antigos)
      const legadoCategorias = paresParaSalvar.map((p) => p.categoria);

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
        categoriasAtuacaoPairs: paresParaSalvar,
        categoriasAtuacao: legadoCategorias, // <- compatibilidade
        ...(shouldLockNow ? { categoriasLocked: true, categoriasLockedAt: serverTimestamp() } : {}),
        // cobertura
        atendeBrasil: form.atendeBrasil,
        ufsAtendidas: form.atendeBrasil ? ["BRASIL"] : form.ufsAtendidas,
        // agenda
        agenda: form.agenda,
        // portfolio
        portfolioImagens: form.portfolioImagens,
        portfolioVideos: form.portfolioVideos,
        // preferências de lead (mantidas simples)
        leadPreferencias: {
          categorias: form.leadPreferencias.categorias,
          ufs: form.leadPreferencias.ufs,
          ticketMin: form.leadPreferencias.ticketMin ?? null,
          ticketMax: form.leadPreferencias.ticketMax ?? null,
        },
        // Mercado Pago
        mpConnected: !!form.mpConnected,
        mpStatus: form.mpStatus || "desconectado",
      });

      if (shouldLockNow) {
        setCategoriasLocked(true);
        setPairsOriginais(paresParaSalvar);
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
          <button type="button" className="btn-sec" onClick={pedirAlteracaoViaWhatsApp}>
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
                      setForm((f) => ({ ...f, estado: uf, cidade: "" }));
                    }}
                  >
                    <option value="">Selecione</option>
                    {estados.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Cidade</label>

                  {(!form.estado || form.estado === "BRASIL") && (
                    <input className="input" value={form.cidade || ""} placeholder="—" disabled />
                  )}

                  {form.estado && form.estado !== "BRASIL" && (
                    <>
                      {cidadesLoading && <input className="input" value="Carregando cidades..." disabled />}

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

        {/* Card 2: Atuação (pares) */}
        <div className="card">
          <div className="card-title">Atuação</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="grid gap-2">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.prestaServicos}
                  onChange={(e) => setField("prestaServicos", e.target.checked)}
                />
                <span>Presto serviços</span>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.vendeProdutos}
                  onChange={(e) => setField("vendeProdutos", e.target.checked)}
                />
                <span>Vendo produtos</span>
              </label>
            </div>

            <div>
              <div className="label">Categorias que você atua (até 5 pares)</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
                <select
                  className="input"
                  value={selCategoria}
                  disabled={categoriasLocked}
                  onChange={(e) => {
                    setSelCategoria(e.target.value);
                    setSelSubcategoria(""); // reset sub
                  }}
                >
                  <option value="">Selecionar categoria...</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  className="input"
                  value={selSubcategoria}
                  disabled={categoriasLocked || !selCategoria}
                  onChange={(e) => setSelSubcategoria(e.target.value)}
                >
                  <option value="">{selCategoria ? "Selecionar subcategoria..." : "Escolha uma categoria"}</option>
                  {subcatsDaSelecionada.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <div className="md:col-span-2">
                  <button type="button" className="btn-sec" onClick={addParCategoria} disabled={categoriasLocked}>
                    + Adicionar par
                  </button>
                </div>
              </div>

              {/* Chips com pares */}
              {form.categoriasAtuacaoPairs.length > 0 && (
                <div className="chips" style={{ marginTop: 10 }}>
                  {form.categoriasAtuacaoPairs.map((p) => (
                    <span key={`${p.categoria}__${p.subcategoria || "-"}`} className="chip" title={categoriasLocked ? "Categorias travadas" : ""}>
                      <Tag size={14} /> {p.categoria} <span style={{ opacity: 0.5 }}>›</span> {p.subcategoria || "—"}
                      {!categoriasLocked && (
                        <button type="button" onClick={() => removeParCategoria(p)}>×</button>
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
                  <button type="button" className="btn-sec" onClick={pedirAlteracaoViaWhatsApp}>
                    <HelpCircle size={14} /> Pedir alteração ao suporte
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 12, color: "#334155" }}>
                  Ao salvar com 5 pares (Categoria + Subcategoria), seu perfil ficará travado para alterações.
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
                      onChange={(e) => setForm((f) => ({
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
                      onChange={(e) => setForm((f) => ({
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
                      onChange={(e) => setForm((f) => ({
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
                <input
                  className="input"
                  placeholder="https://..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addVideo((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
                <button type="button" className="btn-sec" onClick={() => {
                  const el = document.querySelector<HTMLInputElement>('input[placeholder="https://..."]');
                  if (el?.value) {
                    addVideo(el.value);
                    el.value = "";
                  }
                }}>+ Adicionar</button>
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

        {/* Card 6: Preferências de Lead (simples) */}
        <div className="card">
          <div className="card-title">Preferências de Lead</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <div className="label">Categorias preferidas</div>
              <div className="flex gap-2 items-center">
                <select
                  className="input"
                  value={selCategoria}
                  onChange={(e) => {
                    setSelCategoria(e.target.value);
                    setSelSubcategoria("");
                  }}
                >
                  <option value="">Selecionar...</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
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
                <select className="input" onChange={(e) => addLeadUf(e.target.value)}>
                  <option value="">Selecionar UF...</option>
                  {estados.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
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
                    onChange={(e) => setForm((f) => ({
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
                                        onChange={(e) => setForm((f) => ({
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

