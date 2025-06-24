"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/firebaseConfig";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Pencil, Trash2, Plus } from "lucide-react";

export default function AdminServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchServices() {
      setLoading(true);
      const snap = await getDocs(collection(db, "services"));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServices(data);
      setLoading(false);
    }
    fetchServices();
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm("Tem certeza que deseja excluir este serviço?")) return;
    await deleteDoc(doc(db, "services", id));
    setServices(services => services.filter(s => s.id !== id));
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f9fafb",
      padding: "40px 0 0 0",
    }}>
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "0 2vw",
      }}>
        {/* Título + Botão */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 40,
          gap: 18,
          flexWrap: "wrap"
        }}>
          <h1 style={{
            fontSize: "2.1rem",
            fontWeight: 800,
            color: "#134074",
            margin: 0,
            letterSpacing: "-1.2px"
          }}>
            Serviços Cadastrados
          </h1>
          <Link href="/create-service" legacyBehavior>
            <a style={{
              background: "#FB8500",
              color: "#fff",
              fontWeight: 700,
              borderRadius: "15px",
              padding: "12px 24px",
              boxShadow: "0 4px 14px #0001",
              fontSize: "1.01rem",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 10,
              transition: "background .13s"
            }}
            onMouseOver={e => (e.currentTarget.style.background = "#e17000")}
            onMouseOut={e => (e.currentTarget.style.background = "#FB8500")}
            >
              <Plus size={20} /> Novo Serviço
            </a>
          </Link>
        </div>

        {/* Lista de Serviços */}
        {loading ? (
          <div style={{
            color: "#219EBC", fontWeight: 700, padding: 44, textAlign: "center"
          }}>Carregando...</div>
        ) : services.length === 0 ? (
          <div style={{
            color: "#adb0b6", fontWeight: 600, padding: 44, textAlign: "center"
          }}>Nenhum serviço encontrado.</div>
        ) : (
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 34,
            alignItems: "stretch",
            justifyContent: "flex-start"
          }}>
            {services.map(s => (
              <div key={s.id} style={{
                background: "#fff",
                borderRadius: 18,
                boxShadow: "0 2px 18px #0001",
                minWidth: 280,
                maxWidth: 370,
                flex: "1 1 320px",
                padding: "22px 24px 18px 24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                marginBottom: 10,
                position: "relative",
              }}>
                {/* Nome */}
                <div style={{
                  fontWeight: 700,
                  fontSize: "1.16rem",
                  color: "#023047",
                  marginBottom: 9,
                  minHeight: 30,
                  letterSpacing: "-.5px",
                  textTransform: "capitalize"
                }}>{s.nome || s.title || "Serviço"}</div>
                {/* Descrição */}
                <div style={{
                  fontWeight: 400,
                  fontSize: "1.04rem",
                  color: "#536176",
                  marginBottom: 19,
                  minHeight: 48,
                  wordBreak: "break-word"
                }}>{s.descricao || s.description || "-"}</div>
                {/* Botões */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10
                }}>
                  <Link href={`/admin/services/${s.id}/edit`} legacyBehavior>
                    <a style={{
                      background: "#e8f8fe",
                      color: "#2563eb",
                      border: "1px solid #e0ecff",
                      fontWeight: 600,
                      fontSize: ".99rem",
                      padding: "7px 18px",
                      borderRadius: 9,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      textDecoration: "none",
                      transition: "background .12s",
                    }}>
                      <Pencil size={16} /> Editar
                    </a>
                  </Link>
                  <button
                    onClick={() => handleDelete(s.id)}
                    style={{
                      background: "#fff0f0",
                      color: "#d90429",
                      border: "1px solid #ffe5e5",
                      fontWeight: 700,
                      fontSize: ".99rem",
                      padding: "7px 16px",
                      borderRadius: 9,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    <Trash2 size={16} /> Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 650px) {
          h1 { font-size: 1.2rem !important; }
          .main { padding: 16px 0 !important; }
        }
      `}</style>
    </main>
  );
}
