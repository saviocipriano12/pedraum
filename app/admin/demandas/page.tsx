"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Pencil, Trash2, PlusCircle, Search, Info, ArrowLeftRight } from "lucide-react";
import { withRoleProtection } from "@/utils/withRoleProtection";

type Demanda = {
  id: string;
  titulo: string;
  categoria: string;
  criador: string;
  status: string;
  emailCriador?: string;
  createdAt?: any;
};

const statusLabel: any = {
  aberta: { label: "Aberta", color: "#059669", bg: "#e7faec" },
  fechada: { label: "Fechada", color: "#d90429", bg: "#ffeaea" },
  andamento: { label: "Em andamento", color: "#FB8500", bg: "#fff9ec" }
};

function ListaDemandasAdmin() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [modal, setModal] = useState<Demanda | null>(null);

  // Debounce da busca
  const [buscaDebounced, setBuscaDebounced] = useState(busca);
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 350);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    async function fetchDemandas() {
      setLoading(true);
      const snap = await getDocs(collection(db, "demandas"));
      const lista = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Demanda[];
      setDemandas(lista);
      setLoading(false);
    }
    fetchDemandas();
  }, []);

  async function handleDelete(id: string) {
    if (window.confirm("Tem certeza que deseja excluir esta demanda?")) {
      await deleteDoc(doc(db, "demandas", id));
      setDemandas(ds => ds.filter(d => d.id !== id));
    }
  }

  // Trocar status diretamente do card
  async function trocarStatus(demanda: Demanda) {
    const proximo =
      demanda.status === "aberta"
        ? "andamento"
        : demanda.status === "andamento"
        ? "fechada"
        : "aberta";
    await updateDoc(doc(db, "demandas", demanda.id), { status: proximo });
    setDemandas(ds =>
      ds.map(d => d.id === demanda.id ? { ...d, status: proximo } : d)
    );
  }

  // Filtros e busca
  const demandasFiltradas = demandas.filter(d =>
    (!buscaDebounced ||
      d.titulo?.toLowerCase().includes(buscaDebounced.toLowerCase()) ||
      d.categoria?.toLowerCase().includes(buscaDebounced.toLowerCase()) ||
      d.criador?.toLowerCase().includes(buscaDebounced.toLowerCase())
    ) &&
    (!filtroStatus || d.status === filtroStatus)
  );

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", padding: "34px 0" }}>
      <div style={{
        maxWidth: 1380, margin: "0 auto",
        padding: "0 2vw"
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 16
        }}>
          <h2 style={{
            fontWeight: 900, fontSize: "2.1rem", color: "#134074", letterSpacing: "-1px", margin: 0
          }}>
            <span style={{ verticalAlign: "middle", marginRight: 10, color: "#FB8500", fontSize: 34 }}>🗂️</span>
            Demandas Publicadas
          </h2>
          <Link href="/create-demanda" style={{
            background: "#FB8500", color: "#fff", fontWeight: 900, fontSize: "1.1rem",
            padding: "12px 30px", borderRadius: 16, textDecoration: "none", boxShadow: "0 2px 12px #FB850030"
          }}>
            <PlusCircle size={22} style={{ marginRight: 7, verticalAlign: "middle" }} />
            Nova Demanda
          </Link>
        </div>

        {/* Filtros */}
        <div style={{
          display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", alignItems: "center"
        }}>
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", top: 9, left: 10, color: "#a0a0a0" }} />
            <input
              style={{
                padding: "9px 9px 9px 33px", borderRadius: 11, border: "1px solid #e0e7ef",
                minWidth: 220, fontSize: 15, fontWeight: 600, color: "#023047"
              }}
              placeholder="Buscar título, categoria ou criador..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            style={{
              borderRadius: 10, border: "1px solid #e0e7ef", fontWeight: 700, color: "#2563eb", padding: "9px 14px"
            }}
          >
            <option value="">Todos Status</option>
            <option value="aberta">Aberta</option>
            <option value="fechada">Fechada</option>
            <option value="andamento">Em andamento</option>
          </select>
        </div>

        {/* Lista de Demandas */}
        {loading ? (
          <div style={{
            color: "#219EBC", fontWeight: 700, padding: 44, textAlign: "center"
          }}>Carregando demandas...</div>
        ) : demandasFiltradas.length === 0 ? (
          <div style={{
            color: "#adb0b6", fontWeight: 600, padding: 44, textAlign: "center"
          }}>Nenhuma demanda encontrada.</div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 27
          }}>
            {demandasFiltradas.map(d => (
              <div key={d.id} style={{
                background: "#fff", borderRadius: 16, boxShadow: "0 2px 20px #0001",
                padding: "26px 22px 18px 22px", display: "flex", flexDirection: "column", gap: 10,
                minHeight: 144, position: "relative"
              }}>
                <div style={{ fontWeight: 800, fontSize: "1.19rem", color: "#023047", marginBottom: 2 }}>
                  {d.titulo}
                  <button
                    style={{
                      float: "right", background: "none", border: "none", cursor: "pointer", marginLeft: 9
                    }}
                    onClick={() => setModal(d)}
                    title="Ver detalhes"
                  >
                    <Info size={18} color="#2563eb" />
                  </button>
                </div>
                <div style={{ color: "#FB8500", fontWeight: 800, fontSize: 16 }}>{d.categoria}</div>
                <div style={{ color: "#2563eb", fontWeight: 700, fontSize: 15 }}>
                  {d.criador}
                  {d.emailCriador && (
                    <span style={{ color: "#aaa", marginLeft: 4, fontWeight: 400 }}>({d.emailCriador})</span>
                  )}
                </div>
                <div style={{
                  color: statusLabel[d.status]?.color ?? "#aaa",
                  fontWeight: 800,
                  fontSize: ".98rem",
                  borderRadius: 8,
                  background: statusLabel[d.status]?.bg ?? "#fafafa",
                  padding: "3.5px 15px",
                  marginBottom: 2,
                  width: "fit-content"
                }}>
                  {statusLabel[d.status]?.label ?? d.status}
                </div>
                <div style={{ color: "#adb0b6", fontWeight: 500, fontSize: 13 }}>
                  {d.createdAt?.seconds &&
                    "Criado: " + new Date(d.createdAt.seconds * 1000).toLocaleDateString("pt-BR")}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center" }}>
                  <Link
                    href={`/admin/demandas/${d.id}/edit`}
                    style={{
                      background: "#e8f8fe", color: "#2563eb", border: "1px solid #e0ecff",
                      fontWeight: 700, fontSize: ".98rem", padding: "7px 17px", borderRadius: 9,
                      textDecoration: "none", display: "flex", alignItems: "center", gap: 4
                    }}
                  >
                    <Pencil size={16} /> Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(d.id)}
                    style={{
                      background: "#fff0f0", color: "#d90429", border: "1px solid #ffe5e5",
                      fontWeight: 700, fontSize: ".98rem", padding: "7px 13px", borderRadius: 9,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                    }}
                  >
                    <Trash2 size={16} /> Excluir
                  </button>
                  <button
                    onClick={() => trocarStatus(d)}
                    style={{
                      background: "#fff7ea", color: "#FB8500", border: "1px solid #ffeccc",
                      fontWeight: 700, fontSize: ".97rem", padding: "7px 13px", borderRadius: 9,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                    }}
                    title="Trocar status"
                  >
                    <ArrowLeftRight size={16} /> Mudar Status
                  </button>
                  <span style={{ color: "#bdbdbd", fontSize: 12, marginLeft: "auto", fontWeight: 400 }}>{d.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {modal && (
        <div style={{
          position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh",
          background: "#0006", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center"
        }}
          onClick={() => setModal(null)}
        >
          <div style={{
            background: "#fff", borderRadius: 14, maxWidth: 420, width: "98vw",
            boxShadow: "0 4px 32px #0003", padding: "38px 32px", position: "relative"
          }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setModal(null)}
              style={{
                position: "absolute", top: 17, right: 22, background: "none",
                border: "none", color: "#aaa", fontSize: 26, fontWeight: 700, cursor: "pointer"
              }}>×</button>
            <h2 style={{ fontWeight: 900, fontSize: "1.22rem", color: "#023047" }}>{modal.titulo}</h2>
            <div style={{ margin: "18px 0 8px 0", color: "#2563eb", fontWeight: 700 }}>{modal.categoria}</div>
            <div style={{ color: "#aaa", fontWeight: 700, marginBottom: 11 }}>{modal.id}</div>
            <div><b>Status:</b> <span style={{
              color: statusLabel[modal.status]?.color ?? "#aaa",
              fontWeight: 700, background: statusLabel[modal.status]?.bg ?? "#fafafa", borderRadius: 8, padding: "3.5px 13px"
            }}>{statusLabel[modal.status]?.label ?? modal.status}</span></div>
            <div style={{ margin: "14px 0 10px 0" }}>
              <b>Criador:</b> {modal.criador}
              {modal.emailCriador && (
                <span style={{ color: "#219ebc", fontWeight: 500, marginLeft: 5 }}>{modal.emailCriador}</span>
              )}
            </div>
            <div style={{ color: "#adb0b6", fontSize: 13 }}>
              {modal.createdAt?.seconds &&
                "Criado em: " + new Date(modal.createdAt.seconds * 1000).toLocaleString("pt-BR")}
            </div>
            {/* Adicione mais campos conforme necessário */}
          </div>
        </div>
      )}
    </main>
  );
}

export default withRoleProtection(ListaDemandasAdmin, { allowed: ["admin"] });
