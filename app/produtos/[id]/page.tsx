"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/firebaseConfig";
import Link from "next/link";
import { Tag, Calendar, MapPin, BadgeCheck, Heart, MessageCircle, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { onAuthStateChanged } from "firebase/auth";

// Modal de contato
function ModalContato({ open, onClose, onSubmit, usuario, produto }) {
  const [form, setForm] = useState({
    nome: usuario?.nome || "",
    telefone: usuario?.telefone || "",
    email: usuario?.email || "",
    cidade: usuario?.cidade || "",
    cpf: usuario?.cpf || "",
    mensagem: ""
  });

  useEffect(() => {
    if (open && usuario) {
      setForm(f => ({
        ...f,
        nome: usuario.nome || "",
        telefone: usuario.telefone || "",
        email: usuario.email || "",
        cidade: usuario.cidade || "",
        cpf: usuario.cpf || ""
      }));
    }
  }, [open, usuario]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-bg"
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
            className="modal-contato"
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
              position: "relative"
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
                fontWeight: 900
              }}
              aria-label="Fechar"
            >
              ×
            </button>
            <h2 style={{ fontSize: "1.42rem", fontWeight: 900, color: "#023047", marginBottom: 16 }}>
              Fale com o anunciante
            </h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <input name="nome" placeholder="Nome completo" value={form.nome} onChange={handleChange} required className="input-modal" />
              <input name="telefone" placeholder="Telefone / WhatsApp" value={form.telefone} onChange={handleChange} required className="input-modal" />
              <input name="email" type="email" placeholder="E-mail" value={form.email} onChange={handleChange} required className="input-modal" />
              <input name="cidade" placeholder="Cidade" value={form.cidade} onChange={handleChange} className="input-modal" />
              <input name="cpf" placeholder="CPF ou CNPJ" value={form.cpf} onChange={handleChange} className="input-modal" />
              <textarea name="mensagem" placeholder="Mensagem (opcional)" value={form.mensagem} onChange={handleChange} className="input-modal" rows={3} />
              <button type="submit" className="btn-modal-laranja">Enviar mensagem</button>
                Ao continuar, você concorda que a Pedraum Brasil não participa das negociações nem garante pagamentos, entregas ou resultados.
            </form>
          </motion.div>
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
              background: #FB8500;
              color: #fff;
              font-weight: 800;
              font-size: 1.09rem;
              border: none;
              border-radius: 8px;
              padding: 12px 0;
              cursor: pointer;
              transition: background .14s;
            }
            .btn-modal-laranja:hover {
              background: #e17000;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ProdutoDetalhePage() {
  const { id } = useParams();
  const [produto, setProduto] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Usuário logado real
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
  const [carregandoUsuario, setCarregandoUsuario] = useState(true);

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

  useEffect(() => {
    async function fetchProduto() {
      if (!id) return;
      const docRef = doc(db, "produtos", String(id));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setProduto({ id: docSnap.id, ...docSnap.data() });
    }
    fetchProduto();
  }, [id]);

  if (!produto) return <div style={{ textAlign: "center", padding: 80 }}>Carregando...</div>;

  const imagens = produto.imagens || [];
  const imgPrincipal = imagens[0] || "/images/no-image.png";

  return (
    <section className="produto-detalhe">
      {/* Topo */}
      <div className="produto-header">
        <div>
          <Link href="/vitrine" className="produto-voltar">
            &lt; Voltar para a Vitrine
          </Link>
        </div>
      </div>

      {/* Layout principal */}
      <div className="produto-grid">
        {/* Imagem principal e galeria */}
        <div className="produto-imagens">
          <img src={imgPrincipal} alt={produto.nome} className="produto-img-principal" />
          <div className="produto-miniaturas">
            {imagens.map((img, idx) => (
              <img key={idx} src={img} alt={"img" + idx} className="produto-miniatura" />
            ))}
          </div>
        </div>

        {/* Bloco informações principais */}
        <div className="produto-info">
          {/* Preço + botão laranja */}
          <div className="produto-preco-box">
            <div className="produto-preco">R$ {Number(produto.preco).toLocaleString("pt-BR")}</div>
            <button
              className="produto-btn-laranja"
              onClick={() => setModalOpen(true)}
              style={{
                width: "100%",
                background: "#FB8500",
                color: "#fff",
                fontWeight: 800,
                fontSize: "1.25rem",
                border: "none",
                borderRadius: 10,
                padding: "14px 0",
                marginTop: 14,
                cursor: "pointer",
                transition: "background .14s"
              }}
              disabled={carregandoUsuario}
            >
              Entrar em Contato
            </button>
          </div>

          {/* Detalhes com ícones */}
          <div className="produto-detalhes-lista">
            <span><Tag size={19} /> {produto.categoria || "Peças"}</span>
            <span><Calendar size={19} /> {produto.ano || "2023"}</span>
            <span><BadgeCheck size={19} /> {produto.conservacao || "Novo"}</span>
            <span><MapPin size={19} /> {produto.cidade || "Betim"},{produto.estado || "MG"}</span>
          </div>

          {/* Botões azuis */}
          <div className="produto-btns-lista">
            <a
              href={`https://wa.me/5531990903613?text=Olá! Tenho interesse no produto: ${encodeURIComponent(produto?.nome || "")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: "100%",
                background: "#219EBC",
                color: "#fff",
                fontWeight: 700,
                fontSize: "1.13rem",
                border: "none",
                borderRadius: 10,
                padding: "14px 0",
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                textDecoration: "none",
                transition: "background .13s",
              }}
              onMouseOver={e => (e.currentTarget.style.background = "#176684")}
              onMouseOut={e => (e.currentTarget.style.background = "#219EBC")}
            >
              <svg width="21" height="21" fill="currentColor" style={{ marginBottom: 2 }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.151-.172.2-.296.3-.494.099-.198.05-.372-.025-.52-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.511l-.57-.01c-.198 0-.52.074-.792.372-.273.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.1 3.201 5.077 4.363.71.306 1.263.489 1.695.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.273-.198-.57-.347zm-5.421 5.396h-.002A9.87 9.87 0 0 1 3.1 17.151c-2.567-2.562-3.448-6.264-2.253-9.555C2.013 3.594 6.084.418 10.442.413h.008c2.669 0 5.188 1.04 7.072 2.925a9.876 9.876 0 0 1 2.926 7.067c-.003 4.357-3.18 8.428-7.447 9.778zm7.668-17.034C15.846.956 13.247 0 10.45 0h-.009C4.659.01.013 4.66 0 10.45c.01 2.363.617 4.664 1.785 6.664L.058 20.944a1.127 1.127 0 0 0 1.392 1.392l3.83-1.725c1.964 1.056 4.215 1.619 6.636 1.621h.004c5.792 0 10.439-4.647 10.45-10.438-.004-2.797-.961-5.396-2.828-7.374z"/>
              </svg>
              WhatsApp
            </a>
            <button className="produto-btn-azul"><Heart size={20} /> Adicionar aos Favoritos</button>
          </div>
        </div>
      </div>

      {/* Descrição completa */}
      <div className="produto-desc">
        <div className="produto-desc-title">Descrição Completa</div>
        <div className="produto-desc-grid">
          <div>
            <div className="produto-desc-item-title">Destaques</div>
            <div className="produto-desc-item-text">{produto.destaques || "Material de construção e durabilidade."}</div>
            <div className="produto-desc-item-title" style={{ marginTop: 32 }}>Sobre o Produto</div>
            <div className="produto-desc-item-text">{produto.sobre || "Com alta resistência e garantia de durabilidade."}</div>
            <div className="produto-desc-item-title" style={{ marginTop: 32 }}>Condições</div>
            <div className="produto-desc-item-text">{produto.condicoes1 || "Este produto está pronto para uso imediato."}</div>
          </div>
          <div>
            <div className="produto-desc-item-title">Condições</div>
            <div className="produto-desc-item-text">{produto.condicoes2 || "Componente revisado e aprovado."}</div>
          </div>
        </div>
      </div>

      {/* CSS */}
      <style jsx>{`
        .produto-detalhe {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 0 60px 0;
          background: #f8fbfd;
        }
        .produto-header {
          margin-bottom: 20px;
        }
        .produto-voltar {
          color: #219EBC;
          font-size: 1rem;
          text-decoration: underline;
          margin-bottom: 24px;
          display: inline-block;
        }
        .produto-grid {
          display: flex;
          gap: 36px;
        }
        .produto-imagens {
          flex: 1.1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .produto-img-principal {
          width: 370px;
          height: 370px;
          border-radius: 22px;
          object-fit: cover;
          box-shadow: 0 4px 32px #0001;
          background: #fff;
        }
        .produto-miniaturas {
          display: flex;
          gap: 16px;
          margin-top: 20px;
        }
        .produto-miniatura {
          width: 76px;
          height: 76px;
          border-radius: 14px;
          object-fit: cover;
          border: 2px solid #fff;
          box-shadow: 0 1px 8px #0002;
          background: #fff;
        }
        .produto-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 22px;
          min-width: 340px;
        }
        .produto-preco-box {
          background: #FF8C20;
          border-radius: 18px;
          color: #fff;
          padding: 32px 26px 18px 26px;
          margin-bottom: 12px;
          box-shadow: 0 4px 22px #fb850022;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .produto-preco {
          font-size: 2.3rem;
          font-weight: 900;
          letter-spacing: 1px;
          margin-bottom: 16px;
        }
        .produto-btn-laranja {
          background: #fff;
          color: #fb8500;
          border: none;
          border-radius: 9px;
          padding: 14px 32px;
          font-size: 1.18rem;
          font-weight: 700;
          margin-top: 4px;
          cursor: pointer;
          box-shadow: 0 2px 8px #fff4;
          transition: background .13s, color .13s;
        }
        .produto-btn-laranja:hover {
          background: #ffb96b;
          color: #fff;
        }
        .produto-detalhes-lista {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px 22px;
          font-size: 1.1rem;
          color: #222;
        }
        .produto-detalhes-lista span {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .produto-btns-lista {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-top: 16px;
        }
        .produto-btn-azul {
          display: flex;
          align-items: center;
          gap: 11px;
          background: #229ebc;
          color: #fff;
          font-weight: 700;
          font-size: 1.16rem;
          border-radius: 12px;
          padding: 14px 0;
          justify-content: center;
          text-decoration: none;
          border: none;
          cursor: pointer;
          box-shadow: 0 2px 10px #219ebc22;
          transition: background .13s;
        }
        .produto-btn-azul:hover {
          background: #176684;
        }
        .produto-desc {
          background: #fff;
          border-radius: 22px;
          box-shadow: 0 2px 18px #0001;
          margin-top: 48px;
          padding: 38px 38px 34px 38px;
        }
        .produto-desc-title {
          font-size: 1.6rem;
          font-weight: 900;
          color: #023047;
          margin-bottom: 28px;
        }
        .produto-desc-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 0 60px;
        }
        .produto-desc-item-title {
          font-size: 1.18rem;
          color: #023047;
          font-weight: 700;
          margin-bottom: 7px;
        }
        .produto-desc-item-text {
          font-size: 1.12rem;
          color: #222;
        }
        @media (max-width: 900px) {
          .produto-grid {
            flex-direction: column;
            gap: 28px;
          }
          .produto-info, .produto-imagens { min-width: 0; }
        }
        @media (max-width: 700px) {
          .produto-detalhe { padding: 16px 2vw 60px 2vw; }
          .produto-img-principal { width: 98vw; height: auto; max-width: 98vw; }
          .produto-desc { padding: 18px 6px 20px 6px; }
          .produto-desc-title { font-size: 1.19rem; }
          .produto-desc-grid { grid-template-columns: 1fr; gap: 24px 0; }
        }
      `}</style>

      {/* Modal de contato */}
      {!carregandoUsuario && (
        usuarioLogado ? (
          <ModalContato
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onSubmit={async (dados) => {
              // Salvando no Firestore coleção mensagensContato:
              await addDoc(collection(db, "mensagensContato"), {
                ...dados,
                produtoId: produto.id,
                produtoNome: produto.nome,
                criadoEm: serverTimestamp(),
              });
              alert("Mensagem enviada com sucesso!");
              setModalOpen(false);
            }}
            usuario={usuarioLogado}
            produto={produto}
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
                    position: "relative"
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
                      fontWeight: 900
                    }}
                    aria-label="Fechar"
                  >
                    ×
                  </button>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#023047", marginBottom: 18 }}>
                    Faça login para entrar em contato com o anunciante
                  </h2>
                  <Link
                    href="/auth/login"
                    className="btn-modal-laranja"
                    style={{ display: "block", marginTop: 10, textAlign: "center" }}
                  >
                    Fazer Login
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        )
      )}

    </section>
  );
}
