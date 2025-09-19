"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";
import { db, auth } from "@/firebaseConfig";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  Tag,
  Calendar,
  MapPin,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ======================= Tipos ======================= */
type ServiceDoc = {
  id: string;
  userId?: string;          // compat, alguns cadastros usam vendedorId
  vendedorId?: string;
  prestadorNome?: string;
  prestadorWhatsapp?: string;

  titulo?: string;
  descricao?: string;

  categoria?: string;
  estado?: string;
  abrangencia?: string;
  disponibilidade?: string;

  preco?: number | string | null;

  imagens?: string[];
  createdAt?: any;
  expiraEm?: any;
  tipo?: string;
};

/* ======================= Utils ======================= */
function getDateFromTs(ts?: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}
function isNovo(createdAt?: any) {
  const d = getDateFromTs(createdAt);
  if (!d) return false;
  const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}
function isExpired(createdAt?: any, expiraEm?: any) {
  const now = Date.now();
  const expDate = getDateFromTs(expiraEm);
  if (expiraEm && expDate) return now > expDate.getTime();
  const created = getDateFromTs(createdAt);
  if (!created) return false;
  const plus45 = new Date(created);
  plus45.setDate(plus45.getDate() + 45);
  return now > plus45.getTime();
}
function currency(preco: any) {
  if (preco === "Sob consulta" || preco === "" || preco == null) return "";
  const n = Number(preco);
  if (isNaN(n) || n <= 0) return "";
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}
function resumo(str: string = "", len = 160) {
  if (!str) return "";
  return str.length <= len ? str : str.slice(0, len - 3) + "...";
}

/* ======================= Modal de contato ======================= */
function ModalContato({
  open,
  onClose,
  usuario,
  service,
}: {
  open: boolean;
  onClose: () => void;
  usuario: any;
  service: ServiceDoc;
}) {
  const [form, setForm] = useState({
    nome: usuario?.nome || "",
    telefone: usuario?.telefone || "",
    email: usuario?.email || "",
    cidade: usuario?.cidade || "",
    cnpj: usuario?.cnpj || "",
    mensagem: "",
  });

  useEffect(() => {
    if (open && usuario) {
      setForm((f) => ({
        ...f,
        nome: usuario?.nome || "",
        telefone: usuario?.telefone || "",
        email: usuario?.email || "",
        cidade: usuario?.cidade || "",
        cnpj: usuario?.cnpj || "",
      }));
    }
  }, [open, usuario]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            background: "#1119",
            zIndex: 1002,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3 }}
            style={{
              background: "#fff",
              borderRadius: 18,
              boxShadow: "0 10px 36px #0003",
              padding: 38,
              maxWidth: 440,
              width: "98vw",
              position: "relative",
            }}
          >
            <button
              onClick={onClose}
              style={{
                position: "absolute",
                top: 16,
                right: 20,
                fontSize: 22,
                background: "none",
                border: "none",
                color: "#219EBC",
                cursor: "pointer",
                fontWeight: 900,
              }}
              aria-label="Fechar"
            >
              ×
            </button>

            <h2 style={{ fontSize: "1.42rem", fontWeight: 900, color: "#023047", marginBottom: 16 }}>
              Fale com o prestador
            </h2>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const user = auth.currentUser;
                if (!user) {
                  alert("Faça login para entrar em contato.");
                  return;
                }
                await addDoc(collection(db, "leads"), {
                  createdAt: serverTimestamp(),
                  tipo: "servico",
                  serviceId: service.id,
                  serviceTitle: service.titulo || "",
                  vendedorId: service.vendedorId || service.userId || "",
                  prestadorNome: service.prestadorNome || "",
                  nome: form.nome,
                  telefone: form.telefone,
                  email: form.email,
                  cidade: form.cidade,
                  cnpj: form.cnpj,
                  mensagem: form.mensagem,
                  status: "novo",
                  statusPagamento: "pendente",
                  valorLead: 12,
                  metodoPagamento: "mercado_pago",
                  paymentLink: "",
                  pagoEm: "",
                  liberadoEm: "",
                  idTransacao: "",
                  isTest: false,
                  imagens: Array.isArray(service.imagens) ? service.imagens : [],
                });
                alert("Mensagem enviada com sucesso!");
                onClose();
              }}
              style={{ display: "flex", flexDirection: "column", gap: 13 }}
            >
              <input name="nome" placeholder="Nome completo" value={form.nome} onChange={handleChange} required className="input-modal" />
              <input name="telefone" placeholder="Telefone / WhatsApp" value={form.telefone} onChange={handleChange} required className="input-modal" />
              <input name="email" type="email" placeholder="E-mail" value={form.email} onChange={handleChange} required className="input-modal" />
              <input name="cidade" placeholder="Cidade" value={form.cidade} onChange={handleChange} className="input-modal" />
              <input name="cnpj" placeholder="CNPJ (opcional)" value={form.cnpj} onChange={handleChange} className="input-modal" />
              <textarea name="mensagem" placeholder="Mensagem/interesse (opcional)" value={form.mensagem} onChange={handleChange} className="input-modal" rows={3} />
              <button type="submit" className="btn-modal-laranja">Enviar mensagem</button>
              <span style={{ fontSize: "0.8rem", marginTop: 6, color: "#777", textAlign: "center" }}>
                A Pedraum Brasil não participa das negociações nem garante pagamentos, entregas ou resultados.
              </span>
            </form>

            <style jsx>{`
              .input-modal {
                border: 1.5px solid #d4e3ed;
                border-radius: 8px;
                padding: 11px 14px;
                font-size: 1rem;
                margin-bottom: 2px;
                outline: none;
                transition: border 0.15s;
              }
              .input-modal:focus { border: 1.5px solid #219EBC; }
              .btn-modal-laranja {
                margin-top: 11px;
                background: #fb8500;
                color: #fff;
                font-weight: 800;
                font-size: 1.09rem;
                border: none;
                border-radius: 8px;
                padding: 12px 0;
                cursor: pointer;
                transition: background 0.14s;
              }
              .btn-modal-laranja:hover { background: #e17000; }
            `}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ======================= Página ======================= */
export default function ServiceDetailPage() {
  const { id } = useParams();
  const [service, setService] = useState<ServiceDoc | null>(null);
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
  const [carregandoUsuario, setCarregandoUsuario] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // galeria
  const [imgIndex, setImgIndex] = useState(0);

  // relacionados
  const [relacionados, setRelacionados] = useState<ServiceDoc[]>([]);
  const carrosselRef = useRef<HTMLDivElement>(null);

  // auth (prefill modal)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uref = doc(db, "usuarios", user.uid);
        const usnap = await getDoc(uref);
        if (usnap.exists()) {
          const u = usnap.data() as any;
          setUsuarioLogado({
            nome: u.nome || user.displayName || "",
            telefone: u.whatsapp || u.telefone || "",
            email: user.email || "",
            cidade: u.cidade || "",
            cnpj: u.cpfCnpj || "",
          });
        } else {
          setUsuarioLogado({
            nome: user.displayName || "",
            telefone: "",
            email: user.email || "",
            cidade: "",
            cnpj: "",
          });
        }
      } else {
        setUsuarioLogado(null);
      }
      setCarregandoUsuario(false);
    });
    return () => unsub();
  }, []);

  // carregar serviço
  useEffect(() => {
    async function fetchService() {
      if (!id) return;
      const ref = doc(db, "services", String(id));
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = { id: snap.id, ...(snap.data() as any) } as ServiceDoc;
      // normaliza vendedorId
      if (!data.vendedorId && data.userId) data.vendedorId = data.userId;
      setService(data);
    }
    fetchService();
  }, [id]);

  // relacionados
  useEffect(() => {
    async function fetchRelacionados() {
      if (!service?.categoria) {
        setRelacionados([]);
        return;
      }
      const qy = query(
        collection(db, "services"),
        where("categoria", "==", service.categoria),
        limit(20)
      );
      const snap = await getDocs(qy);
      const list: ServiceDoc[] = [];
      snap.forEach((d) => {
        if (d.id !== service.id) list.push({ id: d.id, ...(d.data() as any) });
      });
      const ativos = list
        .filter((x) => !isExpired(x.createdAt, x.expiraEm))
        .sort((a, b) => {
          const da = getDateFromTs(a.createdAt)?.getTime() || 0;
          const dbt = getDateFromTs(b.createdAt)?.getTime() || 0;
          return dbt - da;
        });
      setRelacionados(ativos.slice(0, 12));
    }
    fetchRelacionados();
  }, [service?.id, service?.categoria]);

  if (!service) {
    return <div style={{ textAlign: "center", padding: 80 }}>Carregando...</div>;
  }

  const imagens: string[] = Array.isArray(service.imagens) ? service.imagens : [];
  const imgPrincipal = imagens[imgIndex] || "/images/no-image.png";
  const expirado = isExpired(service.createdAt, service.expiraEm);
  const precoFmt = currency(service.preco);
  const podeMostrarPreco = Boolean(precoFmt);

  const whatsLink =
    service.prestadorWhatsapp
      ? `https://wa.me/${service.prestadorWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
          `Olá! Tenho interesse no serviço "${service?.titulo || ""}".`
        )}`
      : "";

  return (
    <section className="service-detalhe">
      {/* Topo */}
      <div className="service-header">
        <Link href="/services" className="service-voltar">
          &lt; Voltar para serviços
        </Link>
        <div className="service-badges">
          {isNovo(service.createdAt) && !expirado && <span className="badge badge-novo">NOVO</span>}
          {expirado && <span className="badge badge-expirado">EXPIRADO</span>}
        </div>
      </div>

      {/* Grid principal */}
      <div className="service-grid">
        {/* Galeria */}
        <div className="service-imagens">
          <img
            src={imgPrincipal}
            alt={service.titulo || "Serviço"}
            className="service-img-principal"
            onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/images/no-image.png")}
          />
          {imagens.length > 1 && (
            <div className="service-miniaturas">
              {imagens.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Imagem ${idx + 1}`}
                  className={`service-miniatura ${idx === imgIndex ? "miniatura-ativa" : ""}`}
                  onClick={() => setImgIndex(idx)}
                  onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/images/no-image.png")}
                />
              ))}
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="service-info">
          <h1 className="service-titulo">
            <Wrench size={26} style={{ marginRight: 8, color: "#FB8500" }} />
            {service.titulo || "Serviço"}
          </h1>

          <div className="service-detalhes-lista">
            {service.categoria && (
              <span><Layers size={18} /> {service.categoria}</span>
            )}
            {service.disponibilidade && (
              <span><Calendar size={18} /> {service.disponibilidade}</span>
            )}
            {service.estado && (
              <span><MapPin size={18} /> {service.estado}</span>
            )}
            {service.abrangencia && (
              <span><Tag size={18} /> {service.abrangencia}</span>
            )}
          </div>

          {/* Preço + CTA */}
          <div className="service-preco-box">
            {podeMostrarPreco && <div className="service-preco">{precoFmt}</div>}

            <button
              className="service-btn-laranja"
              onClick={() => setModalOpen(true)}
              disabled={expirado || carregandoUsuario}
              aria-disabled={expirado || carregandoUsuario}
              style={{
                background: expirado ? "#d1d5db" : "#FB8500",
                color: "#fff",
                cursor: expirado ? "not-allowed" : "pointer",
              }}
            >
              {expirado ? "Expirado" : "Entrar em Contato"}
            </button>

            {whatsLink && !expirado && (
              <a
                href={whatsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="service-btn-azul"
              >
                WhatsApp do prestador
              </a>
            )}
          </div>

          {/* Resumo */}
          {service.descricao && (
            <div className="service-resumo">
              <div className="service-desc-item-title">Resumo</div>
              <div className="service-desc-item-text">{resumo(service.descricao, 260)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Descrição completa */}
      {service.descricao && (
        <div className="service-desc">
          <div className="service-desc-title">Descrição Completa</div>
          <div className="service-desc-item-text">{service.descricao}</div>
        </div>
      )}

      {/* Relacionados */}
      {relacionados.length > 0 && (
        <div className="relacionados-wrap">
          <div className="relacionados-header">
            <h3>Serviços relacionados</h3>
            <div className="relacionados-nav">
              <button aria-label="Voltar" onClick={() => carrosselRef.current?.scrollBy({ left: -320, behavior: "smooth" })}>
                <ChevronLeft />
              </button>
              <button aria-label="Avançar" onClick={() => carrosselRef.current?.scrollBy({ left: 320, behavior: "smooth" })}>
                <ChevronRight />
              </button>
            </div>
          </div>
          <div className="relacionados" ref={carrosselRef}>
            {relacionados.map((r) => {
              const precoR = currency(r.preco);
              const showPreco = Boolean(precoR);
              const img = (Array.isArray(r.imagens) && r.imagens[0]) || "/images/no-image.png";
              return (
                <Link key={r.id} href={`/services/${r.id}`} className="relacionado-card">
                  <div className="relacionado-img">
                    <img
                      src={img}
                      alt={r.titulo || "Serviço"}
                      onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/images/no-image.png")}
                    />
                  </div>
                  <div className="relacionado-body">
                    <div className="relacionado-titulo">{r.titulo || "Serviço"}</div>
                    {r.categoria && <div className="relacionado-cat">{r.categoria}</div>}
                    {showPreco && <div className="relacionado-preco">{precoR}</div>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {!carregandoUsuario && usuarioLogado ? (
        <ModalContato open={modalOpen} onClose={() => setModalOpen(false)} usuario={usuarioLogado} service={service} />
      ) : (
        <AnimatePresence>
          {modalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, background: "#1119", zIndex: 1002, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", duration: 0.32 }}
                style={{ background: "#fff", borderRadius: 18, boxShadow: "0 10px 36px #0003", padding: 38, maxWidth: 420, width: "98vw", position: "relative" }}
              >
                <button
                  onClick={() => setModalOpen(false)}
                  style={{ position: "absolute", top: 16, right: 20, fontSize: 22, background: "none", border: "none", color: "#219EBC", cursor: "pointer", fontWeight: 900 }}
                  aria-label="Fechar"
                >
                  ×
                </button>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#023047", marginBottom: 18 }}>
                  Faça login para entrar em contato com o prestador
                </h2>
                <Link href="/auth/login" className="btn-modal-laranja" style={{ display: "block", textAlign: "center" }}>
                  Fazer Login
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* CSS */}
      <style jsx>{`
        .service-detalhe {
          max-width: 1200px;
          margin: 0 auto;
          padding: 38px 0 60px 0;
          background: #f8fbfd;
        }
        .service-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .service-voltar {
          color: #219ebc;
          font-size: 1rem;
          text-decoration: underline;
        }
        .service-badges .badge {
          display: inline-block;
          font-size: 0.82rem;
          font-weight: 900;
          padding: 5px 12px;
          border-radius: 999px;
          margin-left: 8px;
        }
        .badge-novo { background: #10b981; color: #fff; }
        .badge-expirado { background: #9ca3af; color: #fff; }

        .service-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 32px;
          margin-top: 10px;
        }
        .service-imagens {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .service-img-principal {
          width: 100%;
          max-width: 560px;
          aspect-ratio: 1/1;
          border-radius: 22px;
          object-fit: cover;
          box-shadow: 0 4px 32px #0001;
          background: #fff;
        }
        .service-miniaturas {
          display: flex;
          gap: 12px;
          margin-top: 14px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .service-miniatura {
          width: 76px;
          height: 76px;
          border-radius: 12px;
          object-fit: cover;
          border: 2px solid #fff;
          box-shadow: 0 1px 8px #0002;
          background: #fff;
          cursor: pointer;
          transition: transform 0.12s, box-shadow 0.12s;
        }
        .service-miniatura:hover { transform: translateY(-2px); box-shadow: 0 4px 12px #0002; }
        .miniatura-ativa { outline: 2px solid #219ebc; outline-offset: 2px; }

        .service-info { display: flex; flex-direction: column; gap: 18px; min-width: 320px; }
        .service-titulo { font-size: 2rem; font-weight: 900; color: #023047; letter-spacing: -0.5px; margin: 0; display:flex; align-items:center; }
        .service-detalhes-lista {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 18px;
          font-size: 1.02rem;
          color: #222;
        }
        .service-detalhes-lista span { display: flex; align-items: center; gap: 8px; color: #334155; font-weight: 700; }

        .service-preco-box {
          background: #fff;
          border-radius: 16px;
          border: 1.5px solid #eef2f6;
          padding: 18px;
          box-shadow: 0 2px 16px #0000000d;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .service-preco { font-size: 2.1rem; font-weight: 900; color: #fb8500; letter-spacing: 0.5px; }

        .service-btn-laranja {
          width: 100%;
          border: none;
          border-radius: 10px;
          padding: 14px 0;
          font-weight: 800;
          font-size: 1.12rem;
          box-shadow: 0 2px 10px #fb850022;
          transition: background 0.14s, transform 0.12s;
        }
        .service-btn-laranja:not([aria-disabled="true"]):hover { background: #e17000 !important; transform: translateY(-1px); }
        .service-btn-azul {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          border-radius: 10px;
          padding: 13px 0;
          font-weight: 800;
          font-size: 1.05rem;
          background: #219ebc;
          color: #fff;
          text-decoration: none;
          box-shadow: 0 2px 10px #219ebc22;
          transition: background 0.14s, transform 0.12s;
        }
        .service-btn-azul:hover { background: #176684; transform: translateY(-1px); }

        .service-resumo {
          background: #fff;
          border: 1.5px solid #eef2f6;
          border-radius: 16px;
          padding: 16px 18px;
          box-shadow: 0 1px 10px #0000000a;
        }

        .service-desc {
          background: #fff;
          border-radius: 22px;
          box-shadow: 0 2px 18px #0001;
          margin-top: 34px;
          padding: 28px;
        }
        .service-desc-title { font-size: 1.45rem; font-weight: 900; color: #023047; margin-bottom: 12px; }
        .service-desc-item-title { font-size: 1.06rem; color: #023047; font-weight: 800; margin-bottom: 6px; }
        .service-desc-item-text { font-size: 1.04rem; color: #1f2937; }

        .relacionados-wrap { margin-top: 40px; }
        .relacionados-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .relacionados-header h3 { font-size: 1.3rem; color: #023047; font-weight: 900; margin: 0; }
        .relacionados-nav button {
          width: 38px; height: 38px; border-radius: 10px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; margin-left: 8px;
        }
        .relacionados {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(240px, 1fr);
          gap: 14px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          padding-bottom: 4px;
        }
        .relacionado-card {
          scroll-snap-align: start;
          border: 1px solid #eef2f6;
          border-radius: 14px;
          background: #fff;
          text-decoration: none;
          color: inherit;
          overflow: hidden;
          box-shadow: 0 2px 12px #0000000a;
          transition: transform 0.12s, box-shadow 0.12s;
          display: flex;
          flex-direction: column;
        }
        .relacionado-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px #00000014; }
        .relacionado-img { width: 100%; height: 140px; background: #f3f6fa; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .relacionado-img img { width: 100%; height: 100%; object-fit: cover; }
        .relacionado-body { padding: 12px; }
        .relacionado-titulo { font-weight: 800; font-size: 1rem; color: #023047; margin-bottom: 4px; }
        .relacionado-cat { font-size: 0.86rem; color: #219ebc; font-weight: 700; }
        .relacionado-preco { margin-top: 6px; color: #fb8500; font-weight: 900; }

        @media (max-width: 900px) {
          .service-grid { grid-template-columns: 1fr; gap: 22px; }
          .service-detalhe { padding: 16px 2vw 48px 2vw; }
          .service-img-principal { max-width: 100%; aspect-ratio: 4/3; }
        }
      `}</style>
    </section>
  );
}
