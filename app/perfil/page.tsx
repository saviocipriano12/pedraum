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

const CATEGORIAS = Object.keys(TAXONOMIA);
const SUPPORT_WHATSAPP = "5531990903613";
const estados = [
  "BRASIL",
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
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
  prestaServicos: boolean;
  vendeProdutos: boolean;
  categoriasAtuacaoPairs: CategoriaPair[];
  categoriasAtuacao: string[]; // legado p/ filtros antigos
  categoriasLocked?: boolean;
  categoriasLockedAt?: any;
  atendeBrasil: boolean;
  ufsAtendidas: string[];
  agenda: Record<string, AgendaDia>;
  portfolioImagens: string[];
  portfolioVideos: string[];
  leadPreferencias: {
    categorias: string[];
    ufs: string[];
    ticketMin?: number | null;
    ticketMax?: number | null;
  };
  mpConnected?: boolean;
  mpStatus?: string;
};

const MAX_CATEGORIAS = 5;

export default function PerfilPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [selCategoria, setSelCategoria] = useState("");
  const [selSubcategoria, setSelSubcategoria] = useState("");

  const [categoriasLocked, setCategoriasLocked] = useState<boolean>(false);
  const [pairsOriginais, setPairsOriginais] = useState<CategoriaPair[]>([]);
  const categoriasOriginaisSet = useMemo(
    () => new Set(pairsOriginais.map((p) => p.categoria)),
    [pairsOriginais]
  );

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
    categoriasAtuacao: [],
    categoriasLocked: false,
    atendeBrasil: false,
    ufsAtendidas: [],
    agenda: {
      seg: { ativo: true, das: "08:00", ate: "18:00" },
      ter: { ativo: true, das: "08:00", ate: "18:00" },
      qua: { ativo: true, das: "08:00", ate: "18:00" },
      qui: { ativo: true, das: "08:00", ate: "18:00" },
      sex: { ativo: true, das: "08:00", ate: "18:00" },
      sab: { ativo: false, das: "08:00", ate: "12:00" },
      dom: { ativo: false, das: "08:00", ate: "12:00" },
    },
    portfolioImagens: [],
    portfolioVideos: [],
    leadPreferencias: { categorias: [], ufs: [], ticketMin: null, ticketMax: null },
    mpConnected: false,
    mpStatus: "desconectado",
  });

  const avatarLista = useMemo(() => (form.avatar ? [form.avatar] : []), [form.avatar]);

  /** Auth + load inicial */
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
        const locked = !!data.categoriasLocked;
        const pairs: CategoriaPair[] = Array.isArray(data.categoriasAtuacaoPairs)
          ? (data.categoriasAtuacaoPairs as CategoriaPair[])
          : [];

        let initialPairs = pairs;
        if (!pairs?.length && Array.isArray(data.categoriasAtuacao) && data.categoriasAtuacao.length) {
          initialPairs = (data.categoriasAtuacao as string[])
            .slice(0, MAX_CATEGORIAS)
            .map((c: string) => ({ categoria: c, subcategoria: "" }));
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
          categoriasAtuacao: Array.isArray(data.categoriasAtuacao) ? data.categoriasAtuacao : [],
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

  /** Helpers */
  function setField<K extends keyof PerfilForm>(key: K, value: PerfilForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Set de categorias já selecionadas
  const selectedCategoriasSet = useMemo(
    () => new Set(form.categoriasAtuacaoPairs.map((p) => p.categoria)),
    [form.categoriasAtuacaoPairs]
  );
  const selectedCategorias = useMemo(() => Array.from(selectedCategoriasSet), [selectedCategoriasSet]);

  // Dropdown controlado: quando atingir 5 ou estiver travado, listar só as categorias já escolhidas
  const categoriasDropdown = useMemo(() => {
    if (categoriasLocked) return selectedCategorias;
    if (selectedCategoriasSet.size >= MAX_CATEGORIAS) return selectedCategorias;
    return CATEGORIAS;
  }, [categoriasLocked, selectedCategorias, selectedCategoriasSet.size]);

  const subcatsDaSelecionada = selCategoria ? (TAXONOMIA[selCategoria] || []) : [];

  function addParCategoria() {
    if (!selCategoria) { setMsg("Selecione uma categoria."); return; }
    if (!selSubcategoria) { setMsg("Selecione uma subcategoria."); return; }

    const isCategoriaNova = !selectedCategoriasSet.has(selCategoria);

    // Regra 1: se travado, não pode criar categoria nova (apenas subcategorias das existentes)
    if (categoriasLocked && isCategoriaNova) {
      setMsg("Categorias travadas: adicione subcategorias apenas das categorias já escolhidas.");
      return;
    }

    // Regra 2: se não travado, ao atingir 5 categorias, só pode subcategorias dentro dessas 5
    if (!categoriasLocked && isCategoriaNova && selectedCategoriasSet.size >= MAX_CATEGORIAS) {
      setMsg(`Você já tem ${MAX_CATEGORIAS}/${MAX_CATEGORIAS} categorias. Selecione uma dessas para adicionar subcategorias.`);
      return;
    }

    const novoPar: CategoriaPair = { categoria: selCategoria, subcategoria: selSubcategoria };
    setForm((f) => ({ ...f, categoriasAtuacaoPairs: [...f.categoriasAtuacaoPairs, novoPar] }));
    setSelCategoria("");
    setSelSubcategoria("");
    setMsg("");
  }

  function removeParCategoria(par: CategoriaPair) {
    setForm((f) => {
      const futuros = f.categoriasAtuacaoPairs.filter(
        (p) => !(p.categoria === par.categoria && p.subcategoria === par.subcategoria)
      );
      if (categoriasLocked) {
        const aindaTemDaCategoria = futuros.some((p) => p.categoria === par.categoria);
        if (!aindaTemDaCategoria) {
          setMsg("Categorias travadas: não é possível remover a última subcategoria de uma categoria.");
          return f;
        }
      }
      return { ...f, categoriasAtuacaoPairs: futuros };
    });
  }

  async function pedirAlteracaoViaWhatsApp() {
    if (!userId) return;
    try {
      await addDoc(collection(db, "supportRequests"), {
        userId,
        tipo: "categoriasAtuacao",
        mensagem: "Solicito alteração nas minhas CATEGORIAS de atuação (não subcategorias).",
        createdAt: serverTimestamp(),
        status: "open",
        canal: "whatsapp",
      });
    } catch (e) {
      console.warn("Falha ao registrar ticket:", e);
    }

    const texto = `
Olá, equipe de suporte! Quero alterar minhas CATEGORIAS de atuação.

• UID: ${userId}
• Nome: ${form.nome || "-"}
• E-mail: ${form.email || "-"}
• Pares atuais: ${form.categoriasAtuacaoPairs?.map(p=>`${p.categoria} › ${p.subcategoria||"-"}`).join(" | ") || "-"}

Mensagem: Solicito liberação para alterar o conjunto de CATEGORIAS.
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

  async function salvar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!userId) return;

    setSaving(true);
    setMsg("");

    try {
      if (!form.categoriasAtuacaoPairs.length) {
        setMsg("Adicione pelo menos 1 par (Categoria + Subcategoria).");
        setSaving(false); return;
      }
      const algumSemSub = form.categoriasAtuacaoPairs.some((p) => !p.subcategoria?.trim());
      if (algumSemSub) {
        setMsg("Todos os pares precisam de subcategoria selecionada.");
        setSaving(false); return;
      }

      const categoriasDistintas = Array.from(new Set(form.categoriasAtuacaoPairs.map(p => p.categoria)));
      if (categoriasDistintas.length > MAX_CATEGORIAS) {
        setMsg(`Você pode escolher no máximo ${MAX_CATEGORIAS} categorias distintas.`);
        setSaving(false); return;
      }

      if (categoriasLocked) {
        const mesmas =
          categoriasDistintas.length === categoriasOriginaisSet.size &&
          categoriasDistintas.every((c) => categoriasOriginaisSet.has(c));
        if (!mesmas) {
          setMsg("Categorias travadas: não é possível alterar o conjunto de CATEGORIAS.");
          setSaving(false); return;
        }
      }

      const shouldLockNow = !categoriasLocked && categoriasDistintas.length === MAX_CATEGORIAS;
      const legadoCategorias = categoriasDistintas;

      await updateDoc(doc(db, "usuarios", userId), {
        nome: form.nome,
        telefone: form.telefone || "",
        cidade: form.estado === "BRASIL" ? "" : (form.cidade || ""),
        estado: form.estado || "",
        cpf_cnpj: form.cpf_cnpj || "",
        bio: form.bio || "",
        avatar: form.avatar || "",
        prestaServicos: form.prestaServicos,
        vendeProdutos: form.vendeProdutos,
        categoriasAtuacaoPairs: form.categoriasAtuacaoPairs,
        categoriasAtuacao: legadoCategorias,
        ...(shouldLockNow ? { categoriasLocked: true, categoriasLockedAt: serverTimestamp() } : {}),
        atendeBrasil: form.atendeBrasil,
        ufsAtendidas: form.atendeBrasil ? ["BRASIL"] : form.ufsAtendidas,
        agenda: form.agenda,
        portfolioImagens: form.portfolioImagens,
        portfolioVideos: form.portfolioVideos,
        leadPreferencias: {
          categorias: form.leadPreferencias.categorias,
          ufs: form.leadPreferencias.ufs,
          ticketMin: form.leadPreferencias.ticketMin ?? null,
          ticketMax: form.leadPreferencias.ticketMax ?? null,
        },
        mpConnected: !!form.mpConnected,
        mpStatus: form.mpStatus || "desconectado",
      });

      if (shouldLockNow) {
        setCategoriasLocked(true);
        setPairsOriginais(form.categoriasAtuacaoPairs);
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

  const subcatsCountByCategoria = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of form.categoriasAtuacaoPairs) {
      m.set(p.categoria, (m.get(p.categoria) || 0) + 1);
    }
    return m;
  }, [form.categoriasAtuacaoPairs]);

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

      <h1 style={{ fontSize: "2.2rem", fontWeight: 900, color: "#023047", letterSpacing: "-1px", marginBottom: 10 }}>
        Meu Perfil
      </h1>

      {/* contador de categorias */}
      <div style={{ marginBottom: 20, fontWeight: 800, color: selectedCategoriasSet.size >= MAX_CATEGORIAS ? "#16a34a" : "#023047" }}>
        Categorias selecionadas: {selectedCategoriasSet.size}/{MAX_CATEGORIAS}
      </div>

      {categoriasLocked && (
        <div className="lock-banner">
          <Lock size={16} />
          Suas <b>CATEGORIAS</b> estão travadas. Você ainda pode gerenciar <b>subcategorias</b> dentro delas.
          <button type="button" className="btn-sec" onClick={pedirAlteracaoViaWhatsApp}>
            <HelpCircle size={14} /> Pedir alteração das CATEGORIAS ao suporte
          </button>
        </div>
      )}

      <form onSubmit={salvar} className="grid gap-16">
        {/* Identidade */}
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
                  <input
                    className="input"
                    value={form.cidade || ""}
                    onChange={(e) => setField("cidade", e.target.value)}
                    placeholder={form.estado && form.estado !== "BRASIL" ? "Digite sua cidade" : "—"}
                    disabled={!form.estado || form.estado === "BRASIL"}
                  />
                </div>
              </div>

              <label className="label">CPF ou CNPJ</label>
              <input className="input" value={form.cpf_cnpj || ""} onChange={(e) => setField("cpf_cnpj", e.target.value)} placeholder="Somente números" />

              <label className="label">Bio / Sobre você</label>
              <textarea className="input" rows={3} value={form.bio || ""} onChange={(e) => setField("bio", e.target.value)} placeholder="Conte um pouco sobre você, sua empresa ou serviços" />
            </div>
          </div>
        </div>

        {/* Atuação */}
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
              <div className="label">
                Categorias que você atua (até {MAX_CATEGORIAS} <b>categorias</b>; <b>subcategorias</b> ilimitadas)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
                <select
                  className="input"
                  value={selCategoria}
                  onChange={(e) => {
                    setSelCategoria(e.target.value);
                    setSelSubcategoria("");
                  }}
                >
                  <option value="">Selecionar categoria...</option>
                  {categoriasDropdown.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  className="input"
                  value={selSubcategoria}
                  disabled={!selCategoria}
                  onChange={(e) => setSelSubcategoria(e.target.value)}
                >
                  <option value="">{selCategoria ? "Selecionar subcategoria..." : "Escolha uma categoria"}</option>
                  {subcatsDaSelecionada.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <div className="md:col-span-2">
                  <button type="button" className="btn-sec" onClick={addParCategoria}>
                    + Adicionar par
                  </button>
                </div>
              </div>

              {/* Agrupamento por categoria com contador de subcategorias */}
              {selectedCategorias.length > 0 && (
                <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                  {selectedCategorias.map((cat) => {
                    const paresDaCat = form.categoriasAtuacaoPairs.filter(p => p.categoria === cat);
                    return (
                      <div key={cat} style={{ border: "1px solid #e6edf6", borderRadius: 12, padding: 10, background: "#f8fbff" }}>
                        <div style={{ fontWeight: 900, color: "#023047", marginBottom: 6 }}>
                          {cat} <span style={{ color: "#2563eb", fontWeight: 800 }}>({subcatsCountByCategoria.get(cat) || 0})</span>
                        </div>
                        <div className="chips">
                          {paresDaCat.map((p, idx) => (
                            <span key={`${p.categoria}__${p.subcategoria}__${idx}`} className="chip">
                              <Tag size={14} /> {p.subcategoria}
                              <button type="button" onClick={() => removeParCategoria(p)}>×</button>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {categoriasLocked ? (
                <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", color: "#9a3412" }}>
                  <span style={{ fontWeight: 800 }}>
                    <Lock size={12} style={{ display: "inline", marginRight: 6 }} />
                    Conjunto de CATEGORIAS travado (subcategorias liberadas)
                  </span>
                  <button type="button" className="btn-sec" onClick={pedirAlteracaoViaWhatsApp}>
                    <HelpCircle size={14} /> Pedir alteração das CATEGORIAS
                  </button>
                </div>
              ) : selectedCategoriasSet.size >= MAX_CATEGORIAS ? (
                <div style={{ marginTop: 8, fontSize: 12, color: "#334155" }}>
                  Você atingiu <b>{MAX_CATEGORIAS}/{MAX_CATEGORIAS}</b> categorias. A partir de agora, selecione apenas <b>subcategorias</b> dessas categorias.
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 12, color: "#334155" }}>
                  Ao salvar com <b>{MAX_CATEGORIAS} categorias</b>, o conjunto de categorias ficará travado (subcategorias continuam livres).
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cobertura */}
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

        {/* Portfólio */}
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
                      const v = (e.target as HTMLInputElement).value.trim();
                      if (v) {
                        setForm((f) => ({ ...f, portfolioVideos: [...f.portfolioVideos, v] }));
                        (e.target as HTMLInputElement).value = "";
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-sec"
                  onClick={() => {
                    const el = document.querySelector<HTMLInputElement>('input[placeholder="https://..."]');
                    if (el?.value.trim()) {
                      setForm((f) => ({ ...f, portfolioVideos: [...f.portfolioVideos, el.value.trim()] }));
                      el.value = "";
                    }
                  }}
                >+ Adicionar</button>
              </div>
              {form.portfolioVideos.length > 0 && (
                <ul style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {form.portfolioVideos.map((v) => (
                    <li key={v} className="video-row">
                      <LinkIcon size={16} /> <a href={v} target="_blank" className="a">{v}</a>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            portfolioVideos: f.portfolioVideos.filter((x) => x !== v),
                          }))
                        }
                        title="Remover"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
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
