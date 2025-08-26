"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { db, auth } from "@/firebaseConfig";
import { doc, getDoc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import ImageUploader from "@/components/ImageUploader";
import {
  ChevronLeft, Save, Mail, Key, CheckCircle, Shield, DollarSign, MapPin, Tag
} from "lucide-react";

/* ========= Constantes ========= */
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
  "Outros",
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
  id: string;
    // ===== Patrocinador =====
  isPatrocinador?: boolean;
  patrocinadorDesde?: any; // Timestamp | string | null
  patrocinadorAte?: any;   // Timestamp | string | null
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
  categoriasAtuacao: string[];
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

  // -------- Extras do Admin --------
  status?: "ativo" | "suspenso" | "banido";
  verificado?: boolean;
  role?: "user" | "seller" | "admin";
  financeiro?: {
    plano?: string;
    situacao?: "pago" | "pendente";
    valor?: number | null;
    proxRenovacao?: any; // Timestamp | string
  };
  limites?: {
    leadsDia?: number | null;
    prioridade?: number | null; // 0-3
    bloquearUFs?: string[];
    bloquearCategorias?: string[];
  };
  observacoesInternas?: string;

  // força troca no próximo login
  requirePasswordChange?: boolean;
};

export default function AdminEditarUsuarioPage() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState<PerfilForm | null>(null);

  // auxiliares UI
  const [catInput, setCatInput] = useState("");
  const [leadCatInput, setLeadCatInput] = useState("");
  const [leadUfInput, setLeadUfInput] = useState("");
  const [novoVideo, setNovoVideo] = useState("");

  // modal senha
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdVisible, setPwdVisible] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  // avatar como lista pro ImageUploader
  const avatarLista = useMemo(() => (form?.avatar ? [form.avatar] : []), [form?.avatar]);

  useEffect(() => {
    (async () => {
      try {
        const ref = doc(db, "usuarios", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setMsg("Usuário não encontrado.");
          setLoading(false);
          return;
        }
        const data = snap.data() || {};
        const baseAgenda = Object.fromEntries(
          diasSemana.map(d => [d.key, { ativo: d.key !== "dom", das: "08:00", ate: "18:00" }])
        ) as Record<string, AgendaDia>;

        setForm({
          id,
          nome: data.nome || "",
                    // ===== patrocinador =====
          isPatrocinador: !!data.isPatrocinador,
          patrocinadorDesde: data.patrocinadorDesde || null,
          patrocinadorAte: data.patrocinadorAte || null,
          email: data.email || "",
          telefone: data.telefone || data.whatsapp || "",
          cidade: data.cidade || "",
          estado: data.estado || "",
          cpf_cnpj: data.cpf_cnpj || data.cpfCnpj || "",
          bio: data.bio || "",
          avatar: data.avatar || "",
          tipo: data.tipo || "Usuário",
          prestaServicos: !!data.prestaServicos,
          vendeProdutos: !!data.vendeProdutos,
          categoriasAtuacao: data.categoriasAtuacao || [],
          atendeBrasil: !!data.atendeBrasil,
          ufsAtendidas: data.ufsAtendidas || [],
          agenda: data.agenda || baseAgenda,
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
          // extras admin
          status: (data.status as any) || "ativo",
          verificado: !!data.verificado,
          role: (data.role as any) || "user",
          financeiro: {
            plano: data.financeiro?.plano || "",
            situacao: data.financeiro?.situacao || "pendente",
            valor: data.financeiro?.valor ?? null,
            proxRenovacao: data.financeiro?.proxRenovacao || "",
          },
          limites: {
            leadsDia: data.limites?.leadsDia ?? 10,
            prioridade: data.limites?.prioridade ?? 0,
            bloquearUFs: data.limites?.bloquearUFs || [],
            bloquearCategorias: data.limites?.bloquearCategorias || [],
          },
          observacoesInternas: data.observacoesInternas || "",
          requirePasswordChange: !!data.requirePasswordChange,
        });
      } catch {
        setMsg("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function setField<K extends keyof PerfilForm>(key: K, value: PerfilForm[K]) {
    if (!form) return;
    setForm({ ...form, [key]: value });
  }

  async function salvar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form) return;
    setSaving(true);
    setMsg("");

    try {
      await updateDoc(doc(db, "usuarios", form.id), {
        nome: form.nome,
        email: form.email,
        telefone: form.telefone || "",
        cidade: form.estado === "BRASIL" ? "" : (form.cidade || ""),
        estado: form.estado || "",
        cpf_cnpj: form.cpf_cnpj || "",
        bio: form.bio || "",
        avatar: form.avatar || "",
        tipo: form.tipo || "Usuário",
        prestaServicos: form.prestaServicos,
        vendeProdutos: form.vendeProdutos,
        categoriasAtuacao: form.categoriasAtuacao || [],
        atendeBrasil: form.atendeBrasil,
        ufsAtendidas: form.atendeBrasil ? ["BRASIL"] : (form.ufsAtendidas || []),
        agenda: form.agenda || {},
                // patrocinador (mantém como está; alternância é feita pelo botão dedicado)
        isPatrocinador: !!form.isPatrocinador,
        patrocinadorDesde: form.patrocinadorDesde || null,
        patrocinadorAte: form.patrocinadorAte || null,
        portfolioImagens: form.portfolioImagens || [],
        portfolioVideos: form.portfolioVideos || [],
        leadPreferencias: {
          categorias: form.leadPreferencias?.categorias || [],
          ufs: form.leadPreferencias?.ufs || [],
          ticketMin: form.leadPreferencias?.ticketMin ?? null,
          ticketMax: form.leadPreferencias?.ticketMax ?? null,
        },
        mpConnected: !!form.mpConnected,
        mpStatus: form.mpStatus || "desconectado",

        // extras admin
        status: form.status || "ativo",
        verificado: !!form.verificado,
        role: form.role || "user",
        financeiro: {
          plano: form.financeiro?.plano || "",
          situacao: form.financeiro?.situacao || "pendente",
          valor: form.financeiro?.valor ?? null,
          proxRenovacao: form.financeiro?.proxRenovacao || "",
        },
        limites: {
          leadsDia: form.limites?.leadsDia ?? 10,
          prioridade: form.limites?.prioridade ?? 0,
          bloquearUFs: form.limites?.bloquearUFs || [],
          bloquearCategorias: form.limites?.bloquearCategorias || [],
        },
        observacoesInternas: form.observacoesInternas || "",
        requirePasswordChange: !!form.requirePasswordChange,
        atualizadoEm: serverTimestamp(),
      });

      setMsg("Alterações salvas com sucesso.");
    } catch (err) {
      console.error(err);
      setMsg("Erro ao salvar alterações.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 4000);
    }
  }

  // ====== Ações de senha/sessão ======
  async function enviarResetSenha() {
    if (!form?.email) { setMsg("Usuário sem e-mail."); return; }
    try {
      await sendPasswordResetEmail(auth, form.email);
      setMsg("E-mail de redefinição enviado.");
    } catch {
      setMsg("Falha ao enviar e-mail de redefinição.");
    } finally {
      setTimeout(()=>setMsg(""), 4000);
    }
  }

  async function salvarNovaSenha() {
    if (!form) return;
    if (pwd1.length < 6) { setMsg("A senha deve ter ao menos 6 caracteres."); return; }
    if (pwd1 !== pwd2) { setMsg("As senhas não coincidem."); return; }
    setPwdSaving(true);
    try {
      const res = await fetch("/api/admin-reset-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: form.id, senha: pwd1 }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Senha redefinida com sucesso.");
      setShowPwdModal(false);
      setPwd1(""); setPwd2("");
    } catch {
      setMsg("Erro ao redefinir senha.");
    } finally {
      setPwdSaving(false);
      setTimeout(()=>setMsg(""), 4000);
    }
  }

  async function revogarSessoes() {
    if (!form) return;
    try {
      const res = await fetch("/api/admin-revoke-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: form.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Sessões encerradas. O usuário precisará logar novamente.");
    } catch {
      setMsg("Falha ao encerrar sessões.");
    } finally {
      setTimeout(()=>setMsg(""), 4000);
    }
  }

  if (loading) {
    return (
      <section style={{ maxWidth: 980, margin: "0 auto", padding: "50px 2vw 70px 2vw" }}>
        <div style={{ textAlign: "center", color: "#219EBC", fontWeight: 800 }}>
          Carregando usuário...
        </div>
      </section>
    );
  }

  if (!form) {
    return (
      <section style={{ maxWidth: 980, margin: "0 auto", padding: "40px 2vw 70px 2vw" }}>
        {msg || "Usuário não encontrado."}
      </section>
    );
  }

  const cidadesDesabilitadas = !form.estado || form.estado === "BRASIL";
  const senhaForca = pwd1.length >= 12 ? "Alta" : pwd1.length >= 8 ? "Média" : "Baixa";
  async function togglePatrocinador(ativar: boolean) {
    if (!form) return;
    const ok = window.confirm(`${ativar ? "Ativar" : "Desativar"} patrocínio para ${form.email || form.nome || form.id}?`);
    if (!ok) return;

    try {
      setSaving(true);
      const patch: any = { isPatrocinador: ativar };

      if (ativar) {
        patch.patrocinadorDesde = form.patrocinadorDesde || serverTimestamp();
        patch.patrocinadorAte = null;
      } else {
        patch.patrocinadorAte = serverTimestamp();
      }

      // atualiza o usuário
      await updateDoc(doc(db, "usuarios", form.id), patch);

      // registra histórico simples
      await addDoc(collection(db, "patrocinadores"), {
        userId: form.id,
        status: ativar ? "ativo" : "cancelado",
        plano: "mensal",
        dataInicio: ativar ? serverTimestamp() : (form.patrocinadorDesde || serverTimestamp()),
        dataFim: ativar ? null : serverTimestamp(),
        renovacao: true,
        gateway: "manual-admin",
        gatewayRef: "",
        updatedAt: serverTimestamp(),
      });
// 3) **NOTIFICAÇÃO IN‑APP** para o usuário
    await addDoc(collection(db, "notificacoes"), {
      userId: form.id,
      tipo: "patrocinio",
      titulo: ativar ? "Patrocínio ativado! 🎉" : "Patrocínio desativado",
      mensagem: ativar
        ? "Você agora é patrocinador e tem acesso aos contatos completos das demandas."
        : "Seu status de patrocinador foi removido. Você não verá mais os contatos completos.",
      lido: false,
      createdAt: serverTimestamp(),
      readAt: null,
    });
      setForm(f => f ? { ...f, ...patch } : f);
      setMsg(ativar ? "Patrocínio ativado." : "Patrocínio desativado.");
    } catch (e) {
      console.error(e);
      setMsg("Falha ao alternar patrocínio.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 4000);
    }
  }

  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "40px 2vw 70px 2vw" }}>
      <Link href="/admin/usuarios" className="hover:opacity-80" style={{ color: "#2563eb", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20, textDecoration: "none" }}>
        <ChevronLeft size={18} /> Voltar
      </Link>

      <h1 style={{ fontSize: "2.2rem", fontWeight: 900, color: "#023047", letterSpacing: "-1px", marginBottom: 20 }}>
        Editar Usuário (Admin)
      </h1>

      <form onSubmit={salvar} className="grid gap-16">
        {/* Identidade */}
        <div className="card">
          <div className="card-title">Identidade e Contato</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <div className="label">Foto do Perfil</div>
              <ImageUploader imagens={avatarLista} setImagens={(imgs: string[]) => setField("avatar", imgs[0] || "")} max={1} />
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>Use imagem quadrada para melhor resultado.</div>
            </div>

            <div className="grid gap-4">
              <label className="label">Nome</label>
              <input className="input" value={form.nome} onChange={(e) => setField("nome", e.target.value)} required />

              <label className="label">E-mail</label>
              <input className="input" value={form.email} onChange={(e)=>setField("email", e.target.value)} />

              <label className="label">WhatsApp</label>
              <input className="input" value={form.telefone || ""} onChange={(e) => setField("telefone", e.target.value)} placeholder="(xx) xxxxx-xxxx" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Estado (UF)</label>
                  <select
                    className="input"
                    value={form.estado || ""}
                    onChange={(e) => setForm(f => ({ ...f!, estado: e.target.value, cidade: "" }))}
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
                    onChange={(e)=>setField("cidade", e.target.value)}
                    placeholder={cidadesDesabilitadas ? "—" : "Digite a cidade"}
                    disabled={cidadesDesabilitadas}
                  />
                </div>
              </div>

              <label className="label">CPF ou CNPJ</label>
              <input className="input" value={form.cpf_cnpj || ""} onChange={(e) => setField("cpf_cnpj", e.target.value)} />

              <label className="label">Bio / Sobre</label>
              <textarea className="input" rows={3} value={form.bio || ""} onChange={(e) => setField("bio", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Atuação */}
        <div className="card">
          <div className="card-title">Atuação</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="grid gap-2">
              <label className="checkbox">
                <input type="checkbox" checked={form.prestaServicos} onChange={(e) => setField("prestaServicos", e.target.checked)} />
                <span>Presta serviços</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={form.vendeProdutos} onChange={(e) => setField("vendeProdutos", e.target.checked)} />
                <span>Vende produtos</span>
              </label>
            </div>

            <div>
              <div className="label">Categorias (até 5)</div>
              <div className="flex gap-2 items-center">
                <select className="input" value={catInput} onChange={(e) => setCatInput(e.target.value)}>
                  <option value="">Selecionar categoria...</option>
                  {categoriasBase.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button
                  type="button" className="btn-sec"
                  onClick={() => {
                    if (!catInput) return;
                    if (form.categoriasAtuacao.includes(catInput)) return;
                    if (form.categoriasAtuacao.length >= 5) { setMsg("Até 5 categorias de atuação."); return; }
                    setField("categoriasAtuacao", [...form.categoriasAtuacao, catInput]);
                    setCatInput("");
                  }}
                >+ Adicionar</button>
              </div>
              {form.categoriasAtuacao.length > 0 && (
                <div className="chips">
                  {form.categoriasAtuacao.map((c) => (
                    <span key={c} className="chip">
                      <Tag size={14} /> {c}
                      <button type="button" onClick={() => setField("categoriasAtuacao", form.categoriasAtuacao.filter(x => x !== c))}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cobertura */}
        <div className="card">
          <div className="card-title">Cobertura / UFs Atendidas</div>
          <label className="checkbox" style={{ marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={form.atendeBrasil}
              onChange={() => {
                const atendeBrasil = !form.atendeBrasil;
                setForm({ ...form, atendeBrasil, ufsAtendidas: atendeBrasil ? ["BRASIL"] : [] });
              }}
            />
            <span>Atende o Brasil inteiro</span>
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
                      onClick={() => {
                        const has = form.ufsAtendidas.includes(uf);
                        setField("ufsAtendidas", has ? form.ufsAtendidas.filter(u => u !== uf) : [...form.ufsAtendidas, uf]);
                      }}
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

        {/* Agenda */}
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
                        ...f!, agenda: { ...f!.agenda, [d.key]: { ...dia, ativo: e.target.checked } }
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
                        ...f!, agenda: { ...f!.agenda, [d.key]: { ...dia, das: e.target.value } }
                      }))}
                    />
                    <span>às</span>
                    <input
                      type="time"
                      className="input"
                      value={dia.ate}
                      disabled={!dia.ativo}
                      onChange={(e) => setForm(f => ({
                        ...f!, agenda: { ...f!.agenda, [d.key]: { ...dia, ate: e.target.value } }
                      }))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
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
              <div className="label">Vídeos (URLs)</div>
              <div className="flex gap-2">
                <input className="input" placeholder="https://..." value={novoVideo} onChange={(e) => setNovoVideo(e.target.value)} />
                <button
                  type="button"
                  className="btn-sec"
                  onClick={() => {
                    if (!novoVideo.trim()) return;
                    setField("portfolioVideos", [...form.portfolioVideos, novoVideo.trim()]);
                    setNovoVideo("");
                  }}
                >+ Adicionar</button>
              </div>
              {form.portfolioVideos.length > 0 && (
                <ul style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {form.portfolioVideos.map((v) => (
                    <li key={v} className="video-row">
                      <a href={v} target="_blank" className="a">{v}</a>
                      <button type="button" onClick={() => setField("portfolioVideos", form.portfolioVideos.filter(x => x !== v))} title="Remover">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Preferências de Lead */}
        <div className="card">
          <div className="card-title">Preferências de Lead</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <div className="label">Categorias preferidas</div>
              <div className="flex gap-2 items-center">
                <select className="input" value={leadCatInput} onChange={(e) => setLeadCatInput(e.target.value)}>
                  <option value="">Selecionar...</option>
                  {categoriasBase.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button
                  type="button"
                  className="btn-sec"
                  onClick={()=>{
                    if (!leadCatInput) return;
                    if (!form.leadPreferencias.categorias.includes(leadCatInput)) {
                      setField("leadPreferencias", {
                        ...form.leadPreferencias,
                        categorias: [...form.leadPreferencias.categorias, leadCatInput]
                      });
                    }
                    setLeadCatInput("");
                  }}
                >+ Adicionar</button>
              </div>
              {form.leadPreferencias.categorias.length > 0 && (
                <div className="chips">
                  {form.leadPreferencias.categorias.map((c) => (
                    <span key={c} className="chip">
                      <Tag size={14} /> {c}
                      <button
                        type="button"
                        onClick={() => setField("leadPreferencias", {
                          ...form.leadPreferencias,
                          categorias: form.leadPreferencias.categorias.filter(x => x !== c)
                        })}
                      >×</button>
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
                <button
                  type="button"
                  className="btn-sec"
                  onClick={()=>{
                    if (!leadUfInput) return;
                    if (!form.leadPreferencias.ufs.includes(leadUfInput)) {
                      setField("leadPreferencias", {
                        ...form.leadPreferencias,
                        ufs: [...form.leadPreferencias.ufs, leadUfInput]
                      });
                    }
                    setLeadUfInput("");
                  }}
                >+ Adicionar</button>
              </div>
              {form.leadPreferencias.ufs.length > 0 && (
                <div className="chips">
                  {form.leadPreferencias.ufs.map((u) => (
                    <span key={u} className="chip">
                      <MapPin size={14} /> {u}
                      <button
                        type="button"
                        onClick={() => setField("leadPreferencias", {
                          ...form.leadPreferencias,
                          ufs: form.leadPreferencias.ufs.filter(x => x !== u)
                        })}
                      >×</button>
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
                    onChange={(e) => setField("leadPreferencias", { ...form.leadPreferencias, ticketMin: e.target.value ? Number(e.target.value) : null })}
                    min={0}
                  />
                </div>
                <div>
                  <div className="label">Ticket máximo (R$)</div>
                  <input
                    type="number"
                    className="input"
                    value={form.leadPreferencias.ticketMax ?? ""}
                    onChange={(e) => setField("leadPreferencias", { ...form.leadPreferencias, ticketMax: e.target.value ? Number(e.target.value) : null })}
                    min={0}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======= BLOCO EXCLUSIVO DO ADMIN ======= */}
        <div className="card">
          <div className="card-title">Controles do Admin</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="grid gap-4">
              <label className="label">Status da conta</label>
              <select className="input" value={form.status || "ativo"} onChange={(e)=>setField("status", e.target.value as any)}>
                <option value="ativo">Ativo</option>
                <option value="suspenso">Suspenso</option>
                <option value="banido">Banido</option>
              </select>

              <label className="label">Verificação</label>
              <button
                type="button"
                className="btn-sec"
                onClick={() => setField("verificado", !form.verificado)}
                style={{ background: form.verificado ? "#ecfeff" : "#f7f9fc", color: form.verificado ? "#0ea5e9" : "#2563eb" }}
              >
                <CheckCircle size={16} /> {form.verificado ? "Usuário verificado" : "Marcar como verificado"}
              </button>

              <label className="label">Role</label>
              <select className="input" value={form.role || "user"} onChange={(e)=>setField("role", e.target.value as any)}>
                <option value="user">User</option>
                <option value="seller">Seller</option>
                <option value="admin">Admin</option>
              </select>

              <label className="label">Observações internas</label>
              <textarea className="input" rows={3} value={form.observacoesInternas || ""} onChange={(e)=>setField("observacoesInternas", e.target.value)} />
            </div>

            <div className="grid gap-4">
              <label className="label">Financeiro</label>
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="Plano" value={form.financeiro?.plano || ""} onChange={(e)=>setField("financeiro", { ...(form.financeiro||{}), plano: e.target.value })} />
                <select
                  className="input"
                  value={form.financeiro?.situacao || "pendente"}
                  onChange={(e)=>setField("financeiro", { ...(form.financeiro||{}), situacao: e.target.value as "pago"|"pendente" })}
                >
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  className="input"
                  placeholder="Valor (R$)"
                  value={form.financeiro?.valor ?? ""}
                  onChange={(e)=>setField("financeiro", { ...(form.financeiro||{}), valor: e.target.value ? Number(e.target.value) : null })}
                  min={0}
                />
                <input
                  className="input"
                  placeholder="Próx. renovação (YYYY-MM-DD)"
                  value={form.financeiro?.proxRenovacao?.toDate ? form.financeiro.proxRenovacao.toDate().toISOString().slice(0,10) : (form.financeiro?.proxRenovacao || "")}
                  onChange={(e)=>setField("financeiro", { ...(form.financeiro||{}), proxRenovacao: e.target.value })}
                />
              </div>

              <label className="label">Limites de lead</label>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="number"
                  className="input"
                  placeholder="Leads/dia"
                  value={form.limites?.leadsDia ?? ""}
                  onChange={(e)=>setField("limites", { ...(form.limites||{}), leadsDia: e.target.value ? Number(e.target.value) : null })}
                />
                <input
                  type="number"
                  className="input"
                  placeholder="Prioridade (0-3)"
                  value={form.limites?.prioridade ?? ""}
                  onChange={(e)=>setField("limites", { ...(form.limites||{}), prioridade: e.target.value ? Number(e.target.value) : null })}
                />
                <input
                  className="input"
                  placeholder="Bloquear UFs (ex: SP,RJ)"
                  value={(form.limites?.bloquearUFs || []).join(",")}
                  onChange={(e)=>setField("limites", { ...(form.limites||{}), bloquearUFs: e.target.value.split(",").map(s=>s.trim().toUpperCase()).filter(Boolean) })}
                />
              </div>
              <input
                className="input"
                placeholder="Bloquear categorias (separe por vírgula)"
                value={(form.limites?.bloquearCategorias || []).join(", ")}
                onChange={(e)=>setField("limites", { ...(form.limites||{}), bloquearCategorias: e.target.value.split(",").map(s=>s.trim()).filter(Boolean) })}
              />

              <label className="label">Ações rápidas</label>
              <div className="flex gap-2 flex-wrap">
                <button type="button" className="btn-sec" onClick={()=>setShowPwdModal(true)}><Key size={16}/> Redefinir senha (definir nova)</button>
                <button type="button" className="btn-sec" onClick={enviarResetSenha}><Mail size={16}/> Enviar link de redefinição</button>
                <button type="button" className="btn-sec" onClick={revogarSessoes}><Shield size={16}/> Encerrar sessões</button>
              </div>
              {/* ===== Patrocinador ===== */}
              <div className="grid gap-2" style={{ marginTop: 6 }}>
                <label className="label">Patrocinador</label>

                <div className="flex items-center gap-8 flex-wrap">
                  <div
                    className="inline-flex items-center gap-8"
                    style={{ background: "#f7f9fc", border: "1px solid #e6edf6", borderRadius: 12, padding: "10px 12px" }}
                  >
                    <span
                      className="inline-flex items-center gap-6"
                      style={{
                        background: form.isPatrocinador ? "#e7faec" : "#ffecec",
                        color: form.isPatrocinador ? "#059669" : "#D90429",
                        border: `1px solid ${form.isPatrocinador ? "#baf3cd" : "#ffd5d5"}`,
                        padding: "6px 12px",
                        borderRadius: 10,
                        fontWeight: 800
                      }}
                    >
                      {form.isPatrocinador ? "ATIVO" : "INATIVO"}
                    </span>

                    <button
                      type="button"
                      onClick={() => togglePatrocinador(!form.isPatrocinador)}
                      className="btn-sec"
                      style={{
                        background: form.isPatrocinador ? "#fff0f0" : "#ecfdf5",
                        color: form.isPatrocinador ? "#D90429" : "#059669",
                        borderColor: form.isPatrocinador ? "#ffdada" : "#baf3cd"
                      }}
                      title={form.isPatrocinador ? "Desativar patrocínio" : "Ativar patrocínio"}
                    >
                      {form.isPatrocinador ? "Desativar patrocínio" : "Ativar patrocínio"}
                    </button>
                  </div>

                  <div className="text-sm" style={{ color: "#6b7280" }}>
                    {form.patrocinadorDesde?.toDate
                      ? <>Desde: <b>{form.patrocinadorDesde.toDate().toLocaleDateString("pt-BR")}</b></>
                      : form.patrocinadorDesde
                        ? <>Desde: <b>{String(form.patrocinadorDesde)}</b></>
                        : <>Desde: —</>
                    }
                    {`  `}
                    {form.patrocinadorAte?.toDate
                      ? <> | Até: <b>{form.patrocinadorAte.toDate().toLocaleDateString("pt-BR")}</b></>
                      : form.patrocinadorAte
                        ? <> | Até: <b>{String(form.patrocinadorAte)}</b></>
                        : null
                    }
                  </div>
                </div>

                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  * Patrocinadores enxergam contatos completos das demandas (subcoleção <code>/privado</code>).
                </div>
              </div>

              <label className="checkbox" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={!!form.requirePasswordChange}
                  onChange={(e)=>setField("requirePasswordChange", e.target.checked)}
                />
                <span>Exigir troca de senha no próximo login</span>
              </label>
            </div>
          </div>
        </div>
        {/* ======= FIM DO BLOCO ADMIN ======= */}

        {/* Ações */}
        {msg && (
          <div
            style={{
              background: msg.toLowerCase().includes("sucesso") || msg.toLowerCase().includes("salv")
                ? "#f7fafc" : "#fff7f7",
              color: msg.toLowerCase().includes("sucesso") || msg.toLowerCase().includes("salv")
                ? "#16a34a" : "#b91c1c",
              border: `1.5px solid ${msg.toLowerCase().includes("sucesso") || msg.toLowerCase().includes("salv") ? "#c3f3d5" : "#ffdada"}`,
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
            <Save size={16}/> {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </form>

      {/* Modal de nova senha */}
      {showPwdModal && (
        <div style={{
          position:"fixed", inset:0, background:"#0006", display:"flex",
          alignItems:"center", justifyContent:"center", zIndex:50
        }}>
          <div style={{
            background:"#fff", borderRadius:16, padding:"24px", width:"min(520px,92vw)",
            boxShadow:"0 10px 30px #0003"
          }}>
            <h3 style={{fontWeight:900, color:"#023047", fontSize:20, marginBottom:12}}>
              Definir nova senha
            </h3>

            <label className="label">Nova senha</label>
            <div style={{position:"relative"}}>
              <input
                type={pwdVisible ? "text" : "password"}
                className="input"
                value={pwd1}
                minLength={6}
                onChange={(e)=>setPwd1(e.target.value)}
                placeholder="mín. 6 caracteres"
                style={{paddingRight:42}}
              />
              <button type="button" onClick={()=>setPwdVisible(v=>!v)} style={{
                position:"absolute", right:10, top:8, border:"none", background:"transparent", cursor:"pointer"
              }}>
                {pwdVisible ? "🙈" : "👁️"}
              </button>
            </div>

            <label className="label" style={{marginTop:12}}>Confirmar senha</label>
            <input
              type={pwdVisible ? "text" : "password"}
              className="input"
              value={pwd2}
              minLength={6}
              onChange={(e)=>setPwd2(e.target.value)}
            />

            <div style={{marginTop:8, fontSize:12, color:"#6b7280"}}>
              Força: {senhaForca}
            </div>

            <div style={{display:"flex", gap:10, marginTop:18}}>
              <button type="button" className="btn-sec" onClick={()=>{ setShowPwdModal(false); setPwd1(""); setPwd2(""); }}>
                Cancelar
              </button>
              <button type="button" className="btn-gradient" disabled={pwdSaving} onClick={salvarNovaSenha}>
                {pwdSaving ? "Salvando..." : "Salvar nova senha"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS utilitário */}
      <style jsx>{`
        .card { background: #fff; border-radius: 20px; box-shadow: 0 4px 28px #0001; padding: 24px 22px; }
        .card-title { font-weight: 900; color: #023047; font-size: 1.2rem; margin-bottom: 14px; }
        .label { font-weight: 800; color: #023047; margin-bottom: 6px; display: block; }
        .input { width: 100%; border: 1.6px solid #e5e7eb; border-radius: 10px; background: #f8fafc; padding: 11px 12px; font-size: 16px; color: #222; outline: none; }
        .checkbox { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; color: #023047; }
        .chips { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; }
        .chip { display: inline-flex; align-items: center; gap: 6px; background: #f3f7ff; color: #2563eb; border: 1px solid #e0ecff; padding: 6px 10px; border-radius: 10px; font-weight: 800; font-size: 0.95rem; }
        .chip button { background: none; border: none; color: #999; font-weight: 900; cursor: pointer; }
        .pill { border: 1px solid #e6e9ef; border-radius: 999px; padding: 6px 10px; font-weight: 800; font-size: 0.95rem; }
        .agenda-row { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px; border: 1px dashed #e8eaf0; border-radius: 12px; padding: 12px; background: #f9fafb; }
        .btn-sec { background: #f7f9fc; color: #2563eb; border: 1px solid #e0ecff; font-weight: 800; border-radius: 10px; padding: 10px 14px; }
        .btn-gradient { background: linear-gradient(90deg,#fb8500,#fb8500); color: #fff; font-weight: 900; border: none; border-radius: 14px; padding: 14px 26px; font-size: 1.08rem; box-shadow: 0 4px 18px #fb850033; }
        .video-row { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px; background: #f7fafc; border: 1px solid #e6edf6; border-radius: 10px; padding: 8px 10px; }
        .video-row .a { color: #2563eb; text-decoration: none; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .video-row button { background: none; border: none; color: #999; font-weight: 900; cursor: pointer; }
        @media (max-width: 650px) { .card { padding: 18px 14px; border-radius: 14px; } }
      `}</style>
    </section>
  );
}
