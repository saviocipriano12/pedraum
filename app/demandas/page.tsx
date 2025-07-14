"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import Link from "next/link";
import { ClipboardList, MapPin, Calendar, Plus, Eye, Users } from 'lucide-react';

export default function VitrineDemandas() {
  const [demandas, setDemandas] = useState<any[]>([]);
  const [categoria, setCategoria] = useState("");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [busca, setBusca] = useState("");

  // Carregar demandas do Firestore
  useEffect(() => {
    async function fetch() {
      const snap = await getDocs(collection(db, "demandas"));
      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setDemandas(list);
    }
    fetch();
  }, []);

  // Filtros locais
  const demandasFiltradas = demandas.filter((d) =>
    (!categoria || (d.categoria || "").toLowerCase().includes(categoria.toLowerCase())) &&
    (!estado || (d.estado || "").toLowerCase().includes(estado.toLowerCase())) &&
    (!cidade || (d.cidade || "").toLowerCase().includes(cidade.toLowerCase())) &&
    (!busca ||
      (d.titulo || "").toLowerCase().includes(busca.toLowerCase()) ||
      (d.descricao || "").toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <section style={{ maxWidth: 1380, margin: "0 auto", padding: "44px 4vw" }}>
      <h1 style={{
        fontSize: "2.2rem",
        fontWeight: 900,
        color: "#023047",
        letterSpacing: "-1px",
        marginBottom: 28
      }}>
        Vitrine de Demandas
      </h1>
      {/* Botão de Postar Demanda */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <Link href="/create-demanda"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "13px 30px",
            borderRadius: 16,
            background: "#FB8500",
            color: "#fff",
            fontWeight: 800,
            fontSize: "1.13rem",
            boxShadow: "0 4px 18px #0001",
            textDecoration: "none",
            letterSpacing: ".01em",
            border: "none",
            outline: "none",
            transition: "background .14s, transform .13s",
          }}
          onMouseOver={e => (e.currentTarget.style.background = "#e17000")}
          onMouseOut={e => (e.currentTarget.style.background = "#FB8500")}
        >
          <Plus size={22} /> Postar Demanda
        </Link>
      </div>
      {/* Filtros */}
      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap",
        background: "#fff", padding: 18, borderRadius: 14,
        boxShadow: "0 2px 12px #0001", marginBottom: 40
      }}>
        <input className="filtro" placeholder="Categoria" onChange={(e) => setCategoria(e.target.value)} />
        <input className="filtro" placeholder="Estado" onChange={(e) => setEstado(e.target.value)} />
        <input className="filtro" placeholder="Cidade" onChange={(e) => setCidade(e.target.value)} />
        <input className="filtro" placeholder="Buscar por palavra-chave" onChange={(e) => setBusca(e.target.value)} />
      </div>
      {/* Grid de cards de demandas */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
        gap: "38px"
      }}>
        {demandasFiltradas.map((item) => (
          <div key={item.id} style={{
            borderRadius: 22,
            boxShadow: "0 4px 32px #0001",
            background: "#fff",
            border: "1.6px solid #f2f3f7",
            padding: "0 0 18px 0",
            display: "flex",
            flexDirection: "column",
            minHeight: 280,
            position: "relative"
          }}>
            <div style={{ padding: "18px 22px 10px 22px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 8 }}>
                <div style={{ width: 53, height: 53, borderRadius: 14, background: "#FFEDD5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ClipboardList size={27} style={{ color: "#FB8500" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.17rem", color: "#023047", marginBottom: 3 }}>
                    {item.titulo}
                  </div>
                  {item.categoria && (
                    <span style={{ background: "#FFEDD5", color: "#E17000", fontWeight: 600, fontSize: 13, padding: "1.5px 9px", borderRadius: 7 }}>
                      {item.categoria}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ margin: "7px 0", color: "#444", fontWeight: 500 }}>
                {(item.descricao || "").length > 110
                  ? item.descricao.slice(0, 110) + "..."
                  : item.descricao}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 13, color: "#888", fontSize: 15, margin: "7px 0" }}>
                <MapPin size={17} /> {item.cidade || "-"}, {item.estado || "-"}
                <Calendar size={16} style={{ marginLeft: 8 }} />
                {item.createdAt && (item.createdAt.toDate
                  ? item.createdAt.toDate().toLocaleDateString("pt-BR")
                  : (item.createdAt._seconds
                    ? new Date(item.createdAt._seconds * 1000).toLocaleDateString("pt-BR")
                    : "-"))}
                <Eye size={17} style={{ marginLeft: 8 }} />
                {item.visualizacoes || 0}
                <Users size={17} style={{ marginLeft: 8 }} />
                {item.qtdInteressados || 0}
              </div>
              <Link
                href={`/demandas/${item.id}`}
                style={{
                  background: "#219EBC",
                  color: "#fff",
                  padding: "13px 0",
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: "1.12rem",
                  boxShadow: "0 2px 10px #219EBC22",
                  textDecoration: "none",
                  transition: "background .13s, transform .11s",
                  border: "none",
                  outline: "none",
                  letterSpacing: ".01em",
                  marginTop: 15,
                  display: "block",
                  textAlign: "center"
                }}
                onMouseOver={e => (e.currentTarget.style.background = "#176684")}
                onMouseOut={e => (e.currentTarget.style.background = "#219EBC")}
              >
                Atender Demanda
              </Link>
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .filtro {
          border: 1px solid #d9dce0;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          color: #444;
        }
      `}</style>
    </section>
  );
}
