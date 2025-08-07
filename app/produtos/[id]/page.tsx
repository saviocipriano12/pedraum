"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
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
import { db, auth } from "@/firebaseConfig";
import Link from "next/link";
import { Tag, Calendar, MapPin, BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { onAuthStateChanged } from "firebase/auth";

type ProdutoDoc = {
  id: string;
  userId?: string;
  categoria?: string;
  createdAt?: any;
  expiraEm?: any;
  imagens?: string[];
  nome?: string;
  descricao?: string;
  preco?: number | string | null;
  ano?: number | string;
  condicao?: string;
  cidade?: string;
  estado?: string;
  tipo?: string;
  destaques?: string;
  sobre?: string;
  condicoes?: string;
};

// ======================= Utils =======================
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
  const n = Number(preco);
  if (!preco || isNaN(n) || n <= 0) return "";
  return `R$ ${n.toLocaleString("pt-BR")}`;
}
function resumo(str: string = "", len = 120) {
  if (!str) return "";
  return str.length <= len ? str : str.slice(0, len - 3) + "...";
}

// ======================= Modal de contato =======================
function ModalContato({
  open,
  onClose,
  usuario,
  produto,
  vendedorEmail,
}: {
  open: boolean;
  onClose: () => void;
  usuario: any;
  produto: any;
  vendedorEmail: string;
}) {
  const [form, setForm] = useState({
    nome: usuario?.nome || "",
    telefone: usuario?.telefone || "",
    email: usuario?.email || "",
    cidade: usuario?.cidade || "",
    cpf: usuario?.cpf || "",
    mensagem: "",
  });

  useEffect(() => {
    if (open && usuario) {
      setForm((f) => ({
        ...f,
        nome: usuario.nome || "",
        telefone: usuario.telefone || "",
        email: usuario.email || "",
        cidade: usuario.cidade || "",
        cpf: usuario.cpf || "",
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
            transition={{ type: "spring", duration: 0.32 }}
            style={{
              background: "#fff",
              borderRadius: 18,
              boxShadow: "0 10px 36px #0003",
              padding: 38,
              maxWidth: 420,
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
              Fale com o anunciante
            </h2>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const user = auth.currentUser;
                if (!user) {
                  alert("Faça login para entrar em contato.");
                  return;
                }

                // Salva lead com vendedor original automaticamente em vendedoresLiberados
                await addDoc(collection(db, "leads"), {
                  nome: form.nome,
                  telefone: form.telefone,
                  email: form.email,
                  cidade: form.cidade,
                  cpf: form.cpf,
                  mensagem: form.mensagem,
                  createdAt: serverTimestamp(),
                  produtoId: produto.id,
                  produtoNome: produto.nome,
                  tipoProduto: produto.categoria || produto.tipo || "",
                  userId: user.uid,
                  vendedorId: produto.userId,
                  vendedoresLiberados: vendedorEmail
                    ? [{ email: vendedorEmail, status: "ofertado" }]
                    : [],
                  status: "novo",
                  statusPagamento: "pendente",
                  valorLead: 19.9,
                  metodoPagamento: "mercado_pago",
                  paymentLink: "",
                  pagoEm: "",
                  liberadoEm: "",
                  idTransacao: "",
                  isTest: false,
                  imagens: produto.imagens || [],
                });

                alert("Mensagem enviada com sucesso!");
                onClose();
              }}
              style={{ display: "flex", flexDirection: "column", gap: 13 }}
            >
              <input
                name="nome"
                placeholder="Nome completo"
                value={form.nome}
                onChange={handleChange}
                required
                className="input-modal"
              />
              <input
                name="telefone"
                placeholder="Telefone / WhatsApp"
                value={form.telefone}
                onChange={handleChange}
                required
                className="input-modal"
              />
              <input
                name="email"
                type="email"
                placeholder="E-mail"
                value={form.email}
                onChange={handleChange}
                required
                className="input-modal"
              />
              <input
                name="cidade"
                placeholder="Cidade"
                value={form.cidade}
                onChange={handleChange}
                className="input-modal"
              />
              <input
                name="cpf"
                placeholder="CPF ou CNPJ"
                value={form.cpf}
                onChange={handleChange}
                className="input-modal"
              />
              <textarea
                name="mensagem"
                placeholder="Mensagem/interesse (opcional)"
                value={form.mensagem}
                onChange={handleChange}
                className="input-modal"
                rows={3}
              />
              <button type="submit" className="btn-modal-laranja">
                Enviar mensagem
              </button>
              <span style={{ fontSize: "0.8rem", marginTop: 6, color: "#777", textAlign: "center" }}>
                Ao continuar, você concorda que a Pedraum Brasil não participa das negociações nem garante
                pagamentos, entregas ou resultados.
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
              .input-modal:focus {
                border: 1.5px solid #219EBC;
              }
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
              .btn-modal-laranja:hover {
                background: #e17000;
              }
            `}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ======================= Página =======================
export default function ProdutoDetalhePage() {
  const { id } = useParams();
  const [produto, setProduto] = useState<any>(null);
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
  const [carregandoUsuario, setCarregandoUsuario] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [vendedorEmail, setVendedorEmail] = useState<string>("");

  // galeria
  const [imgIndex, setImgIndex] = useState(0);

  // relacionados
  const [relacionados, setRelacionados] = useState<any[]>([]);
  const carrosselRef = useRef<HTMLDivElement>(null);

  // auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUsuarioLogado({
            nome: docSnap.data().nome || user.displayName || "",
            telefone: docSnap.data().telefone || "",
            email: user.email || "",
            cidade: docSnap.data().cidade || "",
            cpf: docSnap.data().cpf || "",
          });
        } else {
          setUsuarioLogado({
            nome: user.displayName || "",
            telefone: "",
            email: user.email || "",
            cidade: "",
            cpf: "",
          });
        }
      } else {
        setUsuarioLogado(null);
      }
      setCarregandoUsuario(false);
    });
    return () => unsubscribe();
  }, []);

  // produto
useEffect(() => {
  async function fetchProduto() {
    if (!id) return;

    const ref = doc(db, "produtos", String(id));
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = { id: snap.id, ...(snap.data() as any) } as ProdutoDoc;
    setProduto(data);

    // pega email do vendedor original a partir do userId
    if (data.userId) {
      const vendRef = doc(db, "usuarios", data.userId as string);
      const vendSnap = await getDoc(vendRef);
      if (vendSnap.exists()) {
        const email = (vendSnap.data() as any)?.email || "";
        setVendedorEmail(email);
      }
    }
  }

  fetchProduto();
}, [id]);


  // relacionados (mesma categoria)
  useEffect(() => {
    async function fetchRelacionados() {
      if (!produto?.categoria) {
        setRelacionados([]);
        return;
      }
      const qy = query(
        collection(db, "produtos"),
        where("categoria", "==", produto.categoria),
        limit(20)
      );
      const snap = await getDocs(qy);
      const lista: any[] = [];
      snap.forEach((d) => {
        if (d.id !== produto.id) {
          lista.push({ id: d.id, ...d.data() });
        }
      });
      // remover expirados e ordenar por mais novo
      const ativos = lista
        .filter((x) => !isExpired(x.createdAt, x.expiraEm))
        .sort((a, b) => {
          const da = getDateFromTs(a.createdAt)?.getTime() || 0;
          const dbt = getDateFromTs(b.createdAt)?.getTime() || 0;
          return dbt - da;
        });
      setRelacionados(ativos.slice(0, 12));
    }
    fetchRelacionados();
  }, [produto?.id, produto?.categoria]);

  if (!produto) {
    return <div style={{ textAlign: "center", padding: 80 }}>Carregando...</div>;
  }

  const imagens: string[] = Array.isArray(produto.imagens) ? produto.imagens : [];
  const imgPrincipal = imagens[imgIndex] || "/images/no-image.png";
  const expirado = isExpired(produto.createdAt, produto.expiraEm);
  const precoFmt = currency(produto.preco);
  const podeMostrarPreco = Boolean(precoFmt);

  return (
    <section className="produto-detalhe">
      {/* Topo / Breadcrumbs */}
      <div className="produto-header">
        <Link href="/vitrine" className="produto-voltar">
          &lt; Voltar para a Vitrine
        </Link>
        <div className="produto-badges">
          {isNovo(produto.createdAt) && !expirado && <span className="badge badge-novo">NOVO</span>}
          {expirado && <span className="badge badge-expirado">EXPIRADO</span>}
        </div>
      </div>

      {/* Grid principal */}
      <div className="produto-grid">
        {/* Galeria */}
        <div className="produto-imagens">
          <img
            src={imgPrincipal}
            alt={produto.nome || "Produto"}
            className="produto-img-principal"
            onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/images/no-image.png")}
          />
          {imagens.length > 1 && (
            <div className="produto-miniaturas">
              {imagens.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Imagem ${idx + 1}`}
                  className={`produto-miniatura ${idx === imgIndex ? "miniatura-ativa" : ""}`}
                  onClick={() => setImgIndex(idx)}
                  onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/images/no-image.png")}
                />
              ))}
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="produto-info">
          <h1 className="produto-titulo">{produto.nome || "Produto"}</h1>

          <div className="produto-detalhes-lista">
            {produto.categoria && (
              <span>
                <Tag size={18} /> {produto.categoria}
              </span>
            )}
            {produto.ano && (
              <span>
                <Calendar size={18} /> {produto.ano}
              </span>
            )}
            {produto.condicao && (
              <span>
                <BadgeCheck size={18} /> {produto.condicao}
              </span>
            )}
            {(produto.cidade || produto.estado) && (
              <span>
                <MapPin size={18} /> {produto.cidade || "—"}, {produto.estado || "—"}
              </span>
            )}
          </div>

          {/* Preço + CTA */}
          <div className="produto-preco-box">
            {podeMostrarPreco && <div className="produto-preco">{precoFmt}</div>}

            <button
              className="produto-btn-laranja"
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

            {/* WhatsApp secundário (se quiser manter) */}
            {!expirado && (
              <a
                href={
                  vendedorEmail
                    ? `https://wa.me/?text=${encodeURIComponent(
                        `Olá! Tenho interesse no produto "${produto?.nome || ""}".`
                      )}`
                    : `#`
                }
                target={vendedorEmail ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="produto-btn-azul"
                aria-disabled={!vendedorEmail}
                style={{
                  opacity: vendedorEmail ? 1 : 0.6,
                  pointerEvents: vendedorEmail ? "auto" : "none",
                }}
              >
                WhatsApp
              </a>
            )}
          </div>

          {/* Descrição curta */}
          {produto.descricao && (
            <div className="produto-resumo">
              <div className="produto-desc-item-title">Resumo</div>
              <div className="produto-desc-item-text">{produto.descricao}</div>
            </div>
          )}
        </div>
      </div>

      {/* Descrição completa */}
      <div className="produto-desc">
        <div className="produto-desc-title">Descrição Completa</div>
        <div className="produto-desc-grid">
          <div>
            <div className="produto-desc-item-title">Destaques</div>
            <div className="produto-desc-item-text">
              {produto.destaques || resumo(produto.descricao, 260) || "—"}
            </div>

            <div className="produto-desc-item-title" style={{ marginTop: 26 }}>
              Sobre o Produto
            </div>
            <div className="produto-desc-item-text">{produto.sobre || "—"}</div>
          </div>

          <div>
            <div className="produto-desc-item-title">Condições</div>
            <div className="produto-desc-item-text">{produto.condicoes || produto.condicao || "—"}</div>
          </div>
        </div>
      </div>

      {/* Relacionados - Você também pode gostar */}
      {relacionados.length > 0 && (
        <div className="relacionados-wrap">
          <div className="relacionados-header">
            <h3>Você também pode gostar</h3>
            <div className="relacionados-nav">
              <button
                aria-label="Voltar"
                onClick={() => carrosselRef.current?.scrollBy({ left: -320, behavior: "smooth" })}
              >
                <ChevronLeft />
              </button>
              <button
                aria-label="Avançar"
                onClick={() => carrosselRef.current?.scrollBy({ left: 320, behavior: "smooth" })}
              >
                <ChevronRight />
              </button>
            </div>
          </div>
          <div className="relacionados" ref={carrosselRef}>
            {relacionados.map((r) => {
              const precoR = currency(r.preco);
              const showPreco = Boolean(precoR);
              return (
                <Link key={r.id} href={`/produtos/${r.id}`} className="relacionado-card">
                  <div className="relacionado-img">
                    <img
                      src={r.imagens?.[0] || "/images/no-image.png"}
                      alt={r.nome || "Produto"}
                      onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/images/no-image.png")}
                    />
                  </div>
                  <div className="relacionado-body">
                    <div className="relacionado-titulo">{r.nome || "Produto"}</div>
                    {r.categoria && <div className="relacionado-cat">{r.categoria}</div>}
                    {showPreco && <div className="relacionado-preco">{precoR}</div>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Modais */}
      {!carregandoUsuario && usuarioLogado ? (
        <ModalContato
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          usuario={usuarioLogado}
          produto={produto}
          vendedorEmail={vendedorEmail}
        />
      ) : (
        <AnimatePresence>
          {modalOpen && (
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
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", duration: 0.32 }}
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  boxShadow: "0 10px 36px #0003",
                  padding: 38,
                  maxWidth: 420,
                  width: "98vw",
                  position: "relative",
                }}
              >
                <button
                  onClick={() => setModalOpen(false)}
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
                <h2 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#023047", marginBottom: 18 }}>
                  Faça login para entrar em contato com o anunciante
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
        .produto-detalhe {
          max-width: 1200px;
          margin: 0 auto;
          padding: 38px 0 60px 0;
          background: #f8fbfd;
        }
        .produto-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .produto-voltar {
          color: #219ebc;
          font-size: 1rem;
          text-decoration: underline;
        }
        .produto-badges .badge {
          display: inline-block;
          font-size: 0.82rem;
          font-weight: 900;
          padding: 5px 12px;
          border-radius: 999px;
          margin-left: 8px;
        }
        .badge-novo {
          background: #10b981;
          color: #fff;
        }
        .badge-expirado {
          background: #9ca3af;
          color: #fff;
        }

        .produto-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 32px;
          margin-top: 10px;
        }
        .produto-imagens {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .produto-img-principal {
          width: 100%;
          max-width: 560px;
          aspect-ratio: 1/1;
          border-radius: 22px;
          object-fit: cover;
          box-shadow: 0 4px 32px #0001;
          background: #fff;
        }
        .produto-miniaturas {
          display: flex;
          gap: 12px;
          margin-top: 14px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .produto-miniatura {
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
        .produto-miniatura:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px #0002;
        }
        .miniatura-ativa {
          outline: 2px solid #219ebc;
          outline-offset: 2px;
        }

        .produto-info {
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-width: 320px;
        }
        .produto-titulo {
          font-size: 2rem;
          font-weight: 900;
          color: #023047;
          letter-spacing: -0.5px;
          margin: 0;
        }
        .produto-detalhes-lista {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 18px;
          font-size: 1.02rem;
          color: #222;
        }
        .produto-detalhes-lista span {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #334155;
          font-weight: 700;
        }

        .produto-preco-box {
          background: #fff;
          border-radius: 16px;
          border: 1.5px solid #eef2f6;
          padding: 18px;
          box-shadow: 0 2px 16px #0000000d;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .produto-preco {
          font-size: 2.1rem;
          font-weight: 900;
          color: #fb8500;
          letter-spacing: 0.5px;
        }
        .produto-btn-laranja {
          width: 100%;
          border: none;
          border-radius: 10px;
          padding: 14px 0;
          font-weight: 800;
          font-size: 1.12rem;
          box-shadow: 0 2px 10px #fb850022;
          transition: background 0.14s, transform 0.12s;
        }
        .produto-btn-laranja:not([aria-disabled="true"]):hover {
          background: #e17000 !important;
          transform: translateY(-1px);
        }
        .produto-btn-azul {
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
        .produto-btn-azul:hover {
          background: #176684;
          transform: translateY(-1px);
        }

        .produto-resumo {
          background: #fff;
          border: 1.5px solid #eef2f6;
          border-radius: 16px;
          padding: 16px 18px;
          box-shadow: 0 1px 10px #0000000a;
        }

        .produto-desc {
          background: #fff;
          border-radius: 22px;
          box-shadow: 0 2px 18px #0001;
          margin-top: 34px;
          padding: 28px 28px 28px 28px;
        }
        .produto-desc-title {
          font-size: 1.45rem;
          font-weight: 900;
          color: #023047;
          margin-bottom: 18px;
        }
        .produto-desc-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 0 50px;
        }
        .produto-desc-item-title {
          font-size: 1.06rem;
          color: #023047;
          font-weight: 800;
          margin-bottom: 6px;
        }
        .produto-desc-item-text {
          font-size: 1.04rem;
          color: #1f2937;
        }

        .relacionados-wrap {
          margin-top: 40px;
        }
        .relacionados-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .relacionados-header h3 {
          font-size: 1.3rem;
          color: #023047;
          font-weight: 900;
          margin: 0;
        }
        .relacionados-nav button {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          background: #fff;
          cursor: pointer;
          margin-left: 8px;
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
        .relacionado-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px #00000014;
        }
        .relacionado-img {
          width: 100%;
          height: 140px;
          background: #f3f6fa;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .relacionado-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .relacionado-body {
          padding: 12px 12px 14px 12px;
        }
        .relacionado-titulo {
          font-weight: 800;
          font-size: 1rem;
          color: #023047;
          margin-bottom: 4px;
        }
        .relacionado-cat {
          font-size: 0.86rem;
          color: #219ebc;
          font-weight: 700;
        }
        .relacionado-preco {
          margin-top: 6px;
          color: #fb8500;
          font-weight: 900;
        }

        @media (max-width: 900px) {
          .produto-grid {
            grid-template-columns: 1fr;
            gap: 22px;
          }
          .produto-desc-grid {
            grid-template-columns: 1fr;
            gap: 18px 0;
          }
          .produto-detalhe {
            padding: 16px 2vw 48px 2vw;
          }
          .produto-img-principal {
            max-width: 100%;
            aspect-ratio: 4/3;
          }
        }
      `}</style>
    </section>
  );
}
