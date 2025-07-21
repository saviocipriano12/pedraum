"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Loader, CheckCircle, Lock, ExternalLink } from "lucide-react";
import Link from "next/link";

type Lead = {
  id: string;
  tipo: "maquina" | "servico";
  machineNome?: string;
  serviceTitle?: string;
  prestadorNome?: string;
  nome: string;
  email: string;
  telefone: string;
  statusPagamento: "pendente" | "pago";
  status: string;
  createdAt: any;
  valorLead: number;
  paymentLink?: string;
};


export default function MeusLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [notLogged, setNotLogged] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState<string | null>(null); // Para loading do botão

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
        setNotLogged(false);
      } else {
        setUserId(null);
        setNotLogged(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchLeads() {
      if (!userId) return;
      setLoading(true);
      const q = query(collection(db, "leads"), where("vendedorId", "==", userId));
      const querySnapshot = await getDocs(q);
      const data: Lead[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Lead);
      });
      setLeads(data);
      setLoading(false);
    }
    if (userId) fetchLeads();
  }, [userId]);

  // Função para criar pagamento e redirecionar
  const handlePagamento = async (lead: Lead) => {
    setPayLoading(lead.id);
    try {
      const res = await fetch("/api/mercadopago/create-payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
  leadId: lead.id,
  leadTitle: lead.tipo === "servico" ? lead.serviceTitle : lead.machineNome,
  price: lead.valorLead,
}),
        });
        const data = await res.json();
        if (data.paymentLink) {
          window.location.href = data.paymentLink;
        } else {
        alert(data.error || "Erro ao gerar pagamento.");
      }
    } catch (err) {
      alert("Erro ao iniciar pagamento.");
    } finally {
      setPayLoading(null);
    }
  };

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}>
      <h1
        style={{
          fontSize: "2.2rem",
          fontWeight: 900,
          color: "#023047",
          marginBottom: 38,
          letterSpacing: "-1.1px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
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
          Contatos Interessados
        </span>
      </h1>
      {notLogged ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "64px 0"
        }}>
          <Lock style={{ marginBottom: 8, color: "#FB8500" }} size={44} />
          <p style={{ color: "#FB8500", fontWeight: 700, fontSize: 22, marginBottom: 20 }}>
            Faça login para ver seus leads.
          </p>
          <Link
            href="/auth/login"
            style={{
              padding: "14px 36px",
              borderRadius: "13px",
              background: "#FB8500",
              color: "#fff",
              fontWeight: 800,
              fontSize: 19,
              boxShadow: "0 2px 14px #0001",
              transition: "background .2s"
            }}
          >
            Fazer login
          </Link>
        </div>
      ) : loading ? (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 0"
        }}>
          <Loader className="animate-spin mr-2" size={26} color="#219EBC" />
          <span style={{ fontSize: 20, fontWeight: 700, color: "#219EBC" }}>Carregando leads...</span>
        </div>
      ) : leads.length === 0 ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "60px 0"
        }}>
          <img
            src="https://cdn-icons-png.flaticon.com/512/4076/4076549.png"
            alt="Sem leads"
            style={{ width: 78, opacity: .68, marginBottom: 18 }}
          />
          <p style={{ color: "#5B6476", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            Você ainda não captou nenhum lead.
          </p>
          <Link
            href="/demandas"
            style={{
              marginTop: 4,
              padding: "12px 32px",
              borderRadius: "11px",
              background: "#219ebc",
              color: "#fff",
              fontWeight: 800,
              fontSize: 17,
              boxShadow: "0 2px 10px #0001",
              transition: "background .2s"
            }}
          >
            Ver oportunidades
          </Link>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 32
        }}>
          {leads
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
            .map((lead) => (
              <div
                key={lead.id}
                style={{
                  borderRadius: 16,
                  boxShadow: "0 2px 20px #0001",
                  background: "#fff",
                  border: "1.6px solid #f2f3f7",
                  padding: "28px 26px 18px 26px",
                  marginBottom: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  minHeight: 180,
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: "1.14rem", fontWeight: 700, color: "#023047", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      background: "#F1F5F9",
                      borderRadius: 7,
                      color: "#FB8500",
                      fontWeight: 800,
                      padding: "3px 15px",
                      fontSize: 16,
                      marginRight: 8,
                      border: "1px solid #ffe5bb"
                    }}>
                      {lead.tipo === "servico"
  ? lead.serviceTitle || "Lead de Serviço"
  : lead.machineNome || "Lead de Máquina"}
                    </span>
                  </div>
                  <span style={{
                    fontWeight: 800,
                    fontSize: "0.99rem",
                    borderRadius: 10,
                    padding: "7px 15px",
                    background: lead.statusPagamento === "pago" ? "#E6FAF0" : "#F9E8D0",
                    color: lead.statusPagamento === "pago" ? "#18B56D" : "#FB8500",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    border: `1.5px solid ${lead.statusPagamento === "pago" ? "#18B56D33" : "#fb850033"}`
                  }}>
                    {lead.statusPagamento === "pago" ? (
                      <>
                        <CheckCircle size={18} /> Pago
                      </>
                    ) : (
                      <>
                        <Lock size={17} /> Pendente
                      </>
                    )}
                  </span>
                </div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 2
                }}>
                  <span style={{ color: "#767676", fontSize: "0.97rem" }}>
                    Recebido em: {lead.createdAt?.seconds
                      ? new Date(lead.createdAt.seconds * 1000).toLocaleString()
                      : "---"}
                  </span>
                  <span style={{
                    fontWeight: 800,
                    fontSize: "1.07rem",
                    color: "#219ebc",
                    background: "#F2F6F9",
                    borderRadius: 7,
                    padding: "3.5px 12px",
                    letterSpacing: ".01em",
                    border: "1px solid #e5ecf2"
                  }}>
                    Valor: R${lead.valorLead?.toFixed(2) || "0.00"}
                  </span>
                </div>
                <div style={{ borderTop: "1.2px solid #f3f3f5", paddingTop: 10, marginTop: 2 }}>
                  {lead.statusPagamento === "pago" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ color: "#222", fontSize: "1rem", marginBottom: 2 }}>
                        <span style={{ fontWeight: 700 }}>Nome:</span> {lead.nome}
                      </div>
                      <div style={{ color: "#222", fontSize: "1rem", marginBottom: 2 }}>
                        <span style={{ fontWeight: 700 }}>Telefone:</span> {lead.telefone}
                      </div>
                      <div style={{ color: "#222", fontSize: "1rem" }}>
                        <span style={{ fontWeight: 700 }}>E-mail:</span> {lead.email}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePagamento(lead)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 9,
                        background: "#FB8500",
                        color: "#fff",
                        borderRadius: 9,
                        fontWeight: 800,
                        fontSize: "1.03rem",
                        padding: "9px 20px",
                        boxShadow: "0 2px 8px #0001",
                        marginTop: 7,
                        border: "none",
                        cursor: payLoading === lead.id ? "wait" : "pointer",
                        opacity: payLoading === lead.id ? 0.6 : 1
                      }}
                      disabled={payLoading === lead.id}
                    >
                      {payLoading === lead.id ? "Gerando pagamento..." : (
                        <>
                          Liberar contato <ExternalLink size={19} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
