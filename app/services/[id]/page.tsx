"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/firebaseConfig";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, Wrench, Send } from "lucide-react";

export default function ServiceDetailPage() {
  const { id } = useParams();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    mensagem: "",
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchService();
  }, []);

  async function fetchService() {
    if (!id) return;
    setLoading(true);
    const docRef = doc(db, "services", String(id));
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setService({ id: docSnap.id, ...docSnap.data() });
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validação simples
    if (!form.nome || !form.telefone || !form.email) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    setSending(true);

    try {
      // Registra o lead no Firestore
     await addDoc(collection(db, "leads"), {
  createdAt: serverTimestamp(),
  tipo: "servico",
  serviceId: service.id,
  serviceTitle: service.titulo,
  vendedorId: service.vendedorId || "", // <-- PEGA do serviço!!
  prestadorNome: service.prestador || "",
  nome: form.nome,
  telefone: form.telefone,
  email: form.email,
  mensagem: form.mensagem,
  status: "novo",
  statusPagamento: "pendente",
  valorLead: service.valorLead ? Number(service.valorLead) : 12,
  metodoPagamento: "mercado_pago",
 paymentLink: "",
pagoEm: "",
liberadoEm: "",
idTransacao: "",
isTest: false,
});

      setSuccess("Seu interesse foi enviado ao prestador! Ele poderá liberar o contato.");
      setForm({ nome: "", telefone: "", email: "", mensagem: "" });
    } catch (err) {
      setError("Erro ao enviar interesse. Tente novamente.");
    }
    setSending(false);
  }

  return (
    <div
      style={{
        maxWidth: 940,
        margin: "0 auto",
        padding: "36px 18px 80px 18px",
        minHeight: "100vh",
      }}
    >
      {loading ? (
        <div className="flex items-center justify-center py-32 text-blue-900 font-semibold">
          <Loader2 className="animate-spin mr-2" /> Carregando serviço...
        </div>
      ) : !service ? (
        <div className="text-center text-gray-500 py-36 text-lg">Serviço não encontrado.</div>
      ) : (
        <>
          {/* Cabeçalho do serviço */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 6px 30px #0001",
              border: "1.2px solid #f2f2f2",
              padding: "34px 26px 18px 26px",
              marginBottom: 32,
              position: "relative",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 19 }}>
              <div
                style={{
                  width: 63,
                  height: 63,
                  borderRadius: 15,
                  background: "#FFEDD5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Wrench size={34} style={{ color: "#FB8500" }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.62rem", color: "#023047" }}>
                  {service.titulo}
                </div>
                {service.categoria && (
                  <div
                    style={{
                      background: "#FFEDD5",
                      color: "#E17000",
                      fontWeight: 600,
                      fontSize: 14,
                      padding: "2.5px 12px",
                      borderRadius: 7,
                      marginTop: 3,
                      display: "inline-block",
                    }}
                  >
                    {service.categoria}
                  </div>
                )}
                <div style={{ color: "#888", fontSize: 14, marginTop: 6 }}>
                  {service.estado && <>Estado: <b>{service.estado}</b></>}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 20, fontSize: 18, color: "#3f4252", fontWeight: 500 }}>
              {service.descricao}
            </div>
            <div
              style={{
                marginTop: 22,
                fontSize: 17,
                fontWeight: 600,
                color: "#219EBC",
              }}
            >
              {service.prestador && <>Prestador: <span style={{ color: "#FB8500" }}>{service.prestador}</span></>}
              {service.preco && (
                <span style={{ marginLeft: 24 }}>
                  Valor: <span style={{ color: "#023047" }}>R$ {service.preco}</span>
                </span>
              )}
            </div>
          </div>

          {/* Formulário de interesse */}
          <div
            style={{
              background: "#fff",
              borderRadius: 15,
              boxShadow: "0 6px 30px #0001",
              border: "1.2px solid #f2f2f2",
              padding: "30px 24px 28px 24px",
              maxWidth: 520,
              margin: "0 auto",
            }}
          >
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 800,
                color: "#023047",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              Demonstre interesse neste serviço
            </h2>
            {error && (
              <div style={{
                background: "#fee2e2",
                color: "#b91c1c",
                padding: "8px 12px",
                borderRadius: 7,
                marginBottom: 10,
                textAlign: "center",
                fontWeight: 600,
                fontSize: 15,
              }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{
                background: "#dcfce7",
                color: "#166534",
                padding: "9px 13px",
                borderRadius: 7,
                marginBottom: 10,
                textAlign: "center",
                fontWeight: 600,
                fontSize: 15,
              }}>
                {success}
              </div>
            )}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
              <label style={{ fontWeight: 600, color: "#023047" }}>
                Nome*:
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  style={inputStyle}
                  placeholder="Seu nome"
                />
              </label>
              <label style={{ fontWeight: 600, color: "#023047" }}>
                Telefone*:
                <input
                  type="tel"
                  required
                  value={form.telefone}
                  onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                  style={inputStyle}
                  placeholder="(xx) xxxxx-xxxx"
                />
              </label>
              <label style={{ fontWeight: 600, color: "#023047" }}>
                E-mail*:
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={inputStyle}
                  placeholder="seu@email.com"
                />
              </label>
              <label style={{ fontWeight: 600, color: "#023047" }}>
                Mensagem:
                <textarea
                  value={form.mensagem}
                  onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
                  style={{
                    ...inputStyle,
                    minHeight: 54,
                    resize: "vertical",
                  }}
                  placeholder="Descreva sua necessidade (opcional)"
                />
              </label>
              <button
                type="submit"
                disabled={sending}
                style={{
                  marginTop: 8,
                  background: "#FB8500",
                  color: "#fff",
                  borderRadius: 11,
                  padding: "13px 0",
                  fontWeight: 800,
                  fontSize: "1.14rem",
                  border: "none",
                  outline: "none",
                  boxShadow: "0 4px 14px #FB850033",
                  cursor: "pointer",
                  transition: "background .13s, transform .12s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: sending ? .72 : 1,
                }}
              >
                {sending ? (
                  <>
                    <Loader2 className="animate-spin" size={20} /> Enviando...
                  </>
                ) : (
                  <>
                    <Send size={19} style={{ marginBottom: -2 }} /> Enviar interesse
                  </>
                )}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  borderRadius: "7px",
  border: "1.2px solid #e3e4e9",
  padding: "11px 13px",
  marginTop: "6px",
  fontSize: "1.05rem",
  fontWeight: 500,
  color: "#023047",
  background: "#f9fafb",
  boxSizing: "border-box" as "border-box",
  outline: "none",
  marginBottom: 2,
};
