"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/firebaseConfig";
import {
  doc,
  onSnapshot,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ArrowLeft,
  MapPin,
  BadgeDollarSign,
  CheckCircle2,
  Copy,
  PhoneCall,
  Tag,
  Calendar,
  BadgeCheck,
} from "lucide-react";

/* ======================= Types ======================= */
type Pricing = { amount?: number; currency?: string; exclusive?: boolean; cap?: number };
type AssignmentStatus = "sent" | "viewed" | "unlocked" | "won" | "lost" | "refunded";
type Assignment = {
  id: string;
  demandId: string;
  supplierId: string;
  status: AssignmentStatus;
  pricing?: Pricing;
  paymentRef?: string;
  unlockedAt?: any;
  createdAt?: any;
  updatedAt?: any;
};

type DemandFire = {
  // nomes conforme create-demandas
  titulo?: string;
  descricao?: string;
  categoria?: string;
  tipo?: string;
  estado?: string; // UF
  cidade?: string;
  prazo?: string;
  orcamento?: string;
  imagens?: string[];
  whatsapp?: string;
  email?: string;
  nomeContato?: string;

  // auxiliares
  userId?: string;
  liberadoPara?: string[];
  priceCents?: number;
  createdAt?: any;
  visivel?: boolean;
};

const DEFAULT_PRICE_CENTS = 1990;

/* ======================= Utils ======================= */
function currencyCents(cents?: number) {
  const n = Number(cents ?? 0);
  if (!n) return "R$ 0,00";
  return `R$ ${(n / 100).toFixed(2).replace(".", ",")}`;
}

/* ======================= Page ======================= */
export default function OportunidadeDetalhePage() {
  const { id } = useParams<{ id: string }>(); // id da demanda
  const router = useRouter();
  const searchParams = useSearchParams();

  const [uid, setUid] = useState<string | null>(null);
  const [demanda, setDemanda] = useState<(DemandFire & { id: string }) | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUid(u ? u.uid : null));
    return () => unsub();
  }, []);

  // realtime: demanda + assignment
  useEffect(() => {
    if (!uid) return;

    // ⚠️ coleção certa
    const demRef = doc(db, "demandas", String(id));
    const unsubDem = onSnapshot(demRef, (snap) => {
      if (!snap.exists()) setDemanda(null);
      else setDemanda({ id: snap.id, ...(snap.data() as DemandFire) });
    });

    const aRef = doc(db, "demandAssignments", `${id}_${uid}`);
    const unsubA = onSnapshot(aRef, async (snap) => {
      if (snap.exists()) {
        const a = { id: snap.id, ...(snap.data() as any) } as Assignment;
        setAssignment(a);
        if (a.status === "sent") {
          try {
            await updateDoc(aRef, { status: "viewed", updatedAt: serverTimestamp() });
          } catch {}
        }
      } else {
        setAssignment(null);
      }
      setLoading(false);
    });

    return () => {
      unsubDem();
      unsubA();
    };
  }, [id, uid]);

  // feedback pós-checkout
  useEffect(() => {
    const s = searchParams.get("status");
    if (s === "success") {
      setMsg("Pagamento aprovado! Liberando contato…");
      const t = setTimeout(() => setMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  // assignment virtual p/ CTA quando ainda não existe doc
  const effectiveAssignment: Assignment | null = useMemo(() => {
    if (!uid || !demanda) return assignment;
    if (assignment) return assignment;
    return {
      id: `${id}_${uid}`,
      demandId: String(id),
      supplierId: uid,
      status: "sent",
      pricing: {
        amount: demanda.priceCents ?? DEFAULT_PRICE_CENTS,
        currency: "BRL",
        exclusive: false,
        cap: 3,
      },
      createdAt: null,
      updatedAt: null,
    };
  }, [assignment, demanda, id, uid]);

  // regras de acesso
  const isOwner = !!(demanda?.userId && uid && demanda.userId === uid);
  const liberadoPorArray =
    !!(demanda?.liberadoPara && uid && Array.isArray(demanda.liberadoPara) && demanda.liberadoPara.includes(uid));
  const isUnlockedByAssignment = effectiveAssignment?.status === "unlocked";

  const [liberadoPorSubdoc, setLiberadoPorSubdoc] = useState<boolean>(false);
  useEffect(() => {
    if (!uid || !demanda?.id) {
      setLiberadoPorSubdoc(false);
      return;
    }
    const check = async () => {
      try {
        const subRef = doc(db, "demandas", demanda.id, "acessos", uid);
        const s = await getDoc(subRef);
        setLiberadoPorSubdoc(s.exists());
      } catch {
        setLiberadoPorSubdoc(false);
      }
    };
    check();
  }, [uid, demanda?.id]);

  const unlocked = isOwner || liberadoPorArray || isUnlockedByAssignment || liberadoPorSubdoc;

  // imagens
  const imagens: string[] = Array.isArray(demanda?.imagens) ? demanda!.imagens! : [];
  const imgPrincipal = imagens[0] || "/images/no-image.png";

  // meta
  const priceCents =
    effectiveAssignment?.pricing?.amount ??
    demanda?.priceCents ??
    DEFAULT_PRICE_CENTS;
  const priceFmt = currencyCents(priceCents);

  const title = demanda?.titulo || "Demanda";
  const description = demanda?.descricao || "";
  const category = demanda?.categoria || "Sem categoria";
  const tipo = demanda?.tipo || "—";
  const uf = demanda?.estado || "—";
  const city = demanda?.cidade || "—";
  const prazo = demanda?.prazo || "—";
  const orcamento = demanda?.orcamento || "—";

  const contatoNome = demanda?.nomeContato?.trim();
  const contatoEmail = demanda?.email?.trim();
  const contatoWpp = (demanda?.whatsapp && demanda.whatsapp.trim()) || undefined;
  const wppDigits = contatoWpp ? String(contatoWpp).replace(/\D/g, "") : "";

  async function ensureAssignmentDoc() {
    if (!uid) return;
    const aRef = doc(db, "demandAssignments", `${id}_${uid}`);
    const aSnap = await getDoc(aRef);
    if (!aSnap.exists()) {
      await setDoc(aRef, {
        demandId: String(id),
        supplierId: uid,
        status: "viewed",
        pricing: {
          amount: priceCents,
          currency: "BRL",
          exclusive: false,
          cap: 3,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  async function atender() {
    if (!uid) return;
    setPaying(true);
    setMsg(null);
    try {
      await ensureAssignmentDoc();
      const res = await fetch("/api/mp/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demandId: String(id), supplierId: uid }),
      });
      const data = await res.json();
      if (data?.init_point) {
        window.location.href = data.init_point;
        return;
      }
      setMsg(data?.error || "Falha ao iniciar pagamento.");
    } catch (e: any) {
      setMsg(e?.message || "Erro ao iniciar pagamento.");
    } finally {
      setPaying(false);
    }
  }

  function copy(text?: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setMsg("Copiado!");
    setTimeout(() => setMsg(null), 1500);
  }

  /* ======================= Guards ======================= */
  if (!uid) {
    return (
      <section className="op-wrap">
        <div className="op-card p">
          Faça login para ver esta oportunidade.
        </div>
        <style jsx>{baseCss}</style>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="op-wrap">
        <div className="op-card p">
          Carregando oportunidade…
        </div>
        <style jsx>{baseCss}</style>
      </section>
    );
  }

  if (!demanda) {
    return (
      <section className="op-wrap">
        <div className="op-header">
          <Link href="/dashboard/oportunidades" className="op-link-voltar">
            &lt; Voltar
          </Link>
        </div>
        <div className="op-card p">Oportunidade não encontrada.</div>
        <style jsx>{baseCss}</style>
      </section>
    );
  }

  /* ======================= UI (estilo produto) ======================= */
  return (
    <section className="op-wrap">
      {/* Topo / Breadcrumbs */}
      <div className="op-header">
        <button onClick={() => router.back()} className="op-link-voltar">
          &lt; Voltar
        </button>
        {msg && <span className="op-msg">{msg}</span>}
      </div>

      {/* Grid principal */}
      <div className="op-grid">
        {/* Imagem principal + thumbs */}
        <div className="op-media">
          <img
            src={imgPrincipal}
            alt={title}
            className="op-img"
            onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/images/no-image.png")}
          />
          {imagens.length > 1 && (
            <div className="op-thumbs">
              {imagens.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Imagem ${idx + 1}`}
                  className="op-thumb"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/images/no-image.png")}
                />
              ))}
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="op-info">
          <h1 className="op-title">{title}</h1>

          <div className="op-meta-list">
            <span><Tag size={18} /> {category} • {tipo}</span>
            <span><MapPin size={18} /> {city}, {uf}</span>
            <span><Calendar size={18} /> Prazo: {prazo}</span>
            <span><BadgeCheck size={18} /> Orçamento: {orcamento}</span>
          </div>

          {/* Preço/CTA box */}
          <div className="op-cta">
            <div className="op-price">{priceFmt}</div>
            {!unlocked ? (
              <>
                <button
                  onClick={atender}
                  disabled={paying}
                  className="op-btn-laranja"
                  aria-disabled={paying}
                  style={{
                    background: paying ? "#d1d5db" : "#FB8500",
                    cursor: paying ? "not-allowed" : "pointer",
                  }}
                >
                  {paying ? "Abrindo pagamento…" : "Atender (desbloquear contato)"}
                </button>
                <div className="op-cta-note">
                  Após o pagamento aprovado, o contato é liberado automaticamente nesta página.
                </div>
              </>
            ) : (
              <div className="op-contact">
                <div className="op-contact-title">
                  <CheckCircle2 size={18} /> Contato liberado
                </div>

                <div className="op-contact-grid">
                  <div>
                    <div className="op-contact-label">Nome</div>
                    <div className="op-contact-value">{contatoNome || "—"}</div>
                  </div>
                  <div>
                    <div className="op-contact-label">E-mail</div>
                    <div className="op-contact-value">{contatoEmail || "—"}</div>
                  </div>
                  <div>
                    <div className="op-contact-label">WhatsApp / Telefone</div>
                    <div className="op-contact-wpp">
                      <span className="op-contact-value">{contatoWpp || "—"}</span>
                      {contatoWpp && (
                        <button
                          onClick={() => copy(String(contatoWpp))}
                          className="op-copy"
                          title="Copiar"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {wppDigits && (
                  <a
                    target="_blank"
                    href={`https://wa.me/${wppDigits}?text=${encodeURIComponent(
                      `Olá! Vi sua demanda "${title}" no Pedraum e posso te atender.`
                    )}`}
                    className="op-btn-azul"
                  >
                    <PhoneCall size={16} /> Abrir WhatsApp
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Descrição */}
          {description && (
            <div className="op-resumo">
              <div className="op-resumo-title">Descrição</div>
              <div className="op-resumo-text">{description}</div>
            </div>
          )}
        </div>
      </div>

      {/* CSS */}
      <style jsx>{baseCss}</style>
    </section>
  );
}

/* ======================= CSS (igual vibe da página de produto) ======================= */
const baseCss = `
.op-wrap{
  max-width:1200px;margin:0 auto;padding:38px 0 60px 0;background:#f8fbfd;
}
.op-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.op-link-voltar{color:#219ebc;font-size:1rem;text-decoration:underline;background:none;border:none;cursor:pointer}
.op-msg{font-size:.9rem;font-weight:800;color:#0c4a6e;background:#e3f2ff;border:1.5px solid #cfe8ff;border-radius:999px;padding:6px 12px}
.op-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:32px;margin-top:10px}
.op-media{display:flex;flex-direction:column;align-items:center}
.op-img{width:100%;max-width:560px;aspect-ratio:4/3;border-radius:22px;object-fit:cover;box-shadow:0 4px 32px #0001;background:#fff}
.op-thumbs{display:flex;gap:12px;margin-top:14px;flex-wrap:wrap;justify-content:center}
.op-thumb{width:76px;height:76px;border-radius:12px;object-fit:cover;border:2px solid #fff;box-shadow:0 1px 8px #0002;background:#fff}
.op-info{display:flex;flex-direction:column;gap:18px;min-width:320px}
.op-title{font-size:2rem;font-weight:900;color:#023047;letter-spacing:-.5px;margin:0}
.op-meta-list{display:grid;grid-template-columns:1fr 1fr;gap:12px 18px;font-size:1.02rem;color:#222}
.op-meta-list span{display:flex;align-items:center;gap:8px;color:#334155;font-weight:700}

.op-cta{background:#fff;border-radius:16px;border:1.5px solid #eef2f6;padding:18px;box-shadow:0 2px 16px #0000000d;display:flex;flex-direction:column;gap:10px}
.op-price{font-size:2.1rem;font-weight:900;color:#fb8500;letter-spacing:.5px}
.op-btn-laranja{width:100%;border:none;border-radius:10px;padding:14px 0;font-weight:800;font-size:1.12rem;box-shadow:0 2px 10px #fb850022;transition:background .14s, transform .12s}
.op-btn-laranja:not([aria-disabled="true"]):hover{background:#e17000 !important;transform:translateY(-1px)}
.op-cta-note{font-size:.86rem;color:#9a6c00}

.op-contact{border:1.5px solid #d1fae5;background:#ecfdf5;border-radius:14px;padding:14px}
.op-contact-title{display:flex;align-items:center;gap:8px;color:#065f46;font-weight:800;margin-bottom:6px}
.op-contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.op-contact-label{font-size:.75rem;color:#6b7280;font-weight:800}
.op-contact-value{font-weight:700;color:#111827}
.op-contact-wpp{display:flex;align-items:center;gap:8px}
.op-copy{display:inline-flex;align-items:center;gap:4px;font-size:.78rem;color:#334155;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:4px 8px}

.op-btn-azul{margin-top:10px;width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:none;border-radius:10px;padding:13px 0;font-weight:800;font-size:1.05rem;background:#219ebc;color:#fff;text-decoration:none;box-shadow:0 2px 10px #219ebc22;transition:background .14s, transform .12s}
.op-btn-azul:hover{background:#176684;transform:translateY(-1px)}

.op-resumo{background:#fff;border:1.5px solid #eef2f6;border-radius:16px;padding:16px 18px;box-shadow:0 1px 10px #0000000a}
.op-resumo-title{font-size:1.06rem;color:#023047;font-weight:800;margin-bottom:6px}
.op-resumo-text{font-size:1.04rem;color:#1f2937}

.op-card.p{background:#fff;border-radius:16px;border:1.5px solid #eef2f6;padding:18px;box-shadow:0 2px 16px #0000000d}

@media (max-width: 900px){
  .op-grid{grid-template-columns:1fr;gap:22px}
  .op-wrap{padding:16px 2vw 48px 2vw}
  .op-img{max-width:100%;aspect-ratio:4/3}
  .op-meta-list{grid-template-columns:1fr}
}
`;
