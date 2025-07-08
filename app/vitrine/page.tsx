"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import Link from "next/link";
import { Wrench, Zap, Hammer, Cog } from 'lucide-react';
import { Plus } from 'lucide-react';

const categoriaIcons = {
  mecanico: <Wrench size={48} className="text-blue-400" />,
  eletrico: <Zap size={48} className="text-yellow-400" />,
  construcao: <Hammer size={48} className="text-orange-400" />,
  manutencao: <Cog size={48} className="text-green-400" />,
  default: <Wrench size={48} className="text-gray-400" />,
};
const RenderCategoriaIcon = ({ categoria }) => (
  <div className="w-full h-48 flex items-center justify-center bg-gray-100 rounded">
    {categoriaIcons[categoria?.toLowerCase()] || categoriaIcons.default}
  </div>
);

export default function VitrineCompleta() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [conservacao, setConservacao] = useState("");
  const [precoMin, setPrecoMin] = useState("");
  const [precoMax, setPrecoMax] = useState("");

  const fetchData = async () => {
    const allItems: any[] = [];
    const collections = ["machines", "produtos", "services"];

    for (const col of collections) {
      const snapshot = await getDocs(collection(db, col));
      snapshot.forEach((doc) => {
        const data = doc.data();
        allItems.push({ id: doc.id, ...data, tipo: col });
      });
    }

    setProdutos(allItems);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const produtosFiltrados = produtos.filter((p) => {
    return (
      (!tipo || p.tipo === tipo) &&
      (!categoria || p.categoria?.toLowerCase().includes(categoria.toLowerCase())) &&
      (!estado || p.estado?.toLowerCase().includes(estado.toLowerCase())) &&
      (!cidade || p.cidade?.toLowerCase().includes(cidade.toLowerCase())) &&
      (!conservacao || p.conservacao?.toLowerCase() === conservacao.toLowerCase()) &&
      (!precoMin || Number(p.preco) >= Number(precoMin)) &&
      (!precoMax || Number(p.preco) <= Number(precoMax))
    );
  });

  return (
    <section style={{ maxWidth: 1380, margin: "0 auto", padding: "44px 4vw" }}>
      <h1 style={{
        fontSize: "2.2rem",
        fontWeight: 900,
        color: "#023047",
        letterSpacing: "-1px",
        marginBottom: 28
      }}>
        Vitrine de Produtos e Serviços
      </h1>
<div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
  <Link href="/create-produto"
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
    <Plus size={22} /> Adicionar Produto
  </Link>

  <Link href="/create-service"
    style={{
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "13px 30px",
      borderRadius: 16,
      background: "#219EBC",
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
    onMouseOver={e => (e.currentTarget.style.background = "#1a7a93")}
    onMouseOut={e => (e.currentTarget.style.background = "#219EBC")}
  >
    <Plus size={22} /> Adicionar Serviço
  </Link>
</div>
      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap",
        background: "#fff", padding: 18, borderRadius: 14,
        boxShadow: "0 2px 12px #0001", marginBottom: 40
      }}>
        <select className="filtro" onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos</option>
          <option value="machines">Máquinas</option>
          <option value="produtos">Produtos</option>
          <option value="services">Serviços</option>
        </select>
        <input className="filtro" placeholder="Categoria" onChange={(e) => setCategoria(e.target.value)} />
        <input className="filtro" placeholder="Estado" onChange={(e) => setEstado(e.target.value)} />
        <input className="filtro" placeholder="Cidade" onChange={(e) => setCidade(e.target.value)} />
        <select className="filtro" onChange={(e) => setConservacao(e.target.value)}>
          <option value="">Conservação</option>
          <option value="novo">Novo</option>
          <option value="usado">Usado</option>
          <option value="seminovo">Seminovo</option>
        </select>
        <input className="filtro" type="number" placeholder="Preço mín." onChange={(e) => setPrecoMin(e.target.value)} />
        <input className="filtro" type="number" placeholder="Preço máx." onChange={(e) => setPrecoMax(e.target.value)} />
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
        gap: "38px"
      }}>
        {produtosFiltrados.map((item) => (
  <div key={item.id} style={{
    borderRadius: 22,
    boxShadow: "0 4px 32px #0001",
    background: "#fff",
    border: "1.6px solid #f2f3f7",
    padding: "0 0 18px 0",
    display: "flex",
    flexDirection: "column",
    minHeight: item.tipo === 'services' ? 220 : 360,
    position: "relative"
  }}>
    {item.tipo === 'services' ? (
      <div style={{ padding: "18px", display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <div style={{ width: 53, height: 53, borderRadius: 14, background: "#FFEDD5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wrench size={27} style={{ color: "#FB8500" }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.19rem", color: "#023047", marginBottom: 3 }}>
              {item.titulo}

            </div>
            {item.categoria && (
              <span style={{ background: "#FFEDD5", color: "#E17000", fontWeight: 600, fontSize: 13, padding: "1.5px 9px", borderRadius: 7 }}>
                {item.categoria}
              </span>
            )}
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: "1rem", color: "#555" }}>
          {item.descricao}
        </div>
        <div style={{ marginTop: 8, color: "#FB8500", fontWeight: 700, fontSize: 18 }}>
          R$ {Number(item.preco).toLocaleString("pt-BR")}
        </div>
        <Link
                  href={`/${item.tipo}/${item.id}`}
                  style={{
                    background: "#219EBC",
                    color: "#fff",
                    padding: "11px 22px",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: "1.08rem",
                    boxShadow: "0 2px 10px #219EBC22",
                    textDecoration: "none",
                    transition: "background .13s, transform .11s",
                    border: "none",
                    outline: "none",
                    letterSpacing: ".01em",
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = "#176684")}
                  onMouseOut={e => (e.currentTarget.style.background = "#219EBC")}
                >
                  Ver Detalhes
                </Link>
      </div>
    ) : (
      <>
        <img
          src={item.imagens?.[0] || "/images/no-image.png"}
          alt={item.nome}
          className="w-full h-48 object-cover rounded"
          onError={(e) => (e.currentTarget.src = "/images/no-image.png")}
        />
        <div style={{ padding: "18px 22px 10px 22px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ fontSize: "1.18rem", fontWeight: 700, color: "#023047", marginBottom: 8 }}>
            {item.nome}
          </div>
          <div style={{ color: "#FB8500", fontWeight: 900, fontSize: 23 }}>
            R$ {Number(item.preco).toLocaleString("pt-BR")}
          </div>
          <div style={{ color: "#8c9199", fontSize: 15 }}>
            {item.cidade || "-"}, {item.estado || "-"}
          </div>
          <Link
                  href={`/${item.tipo}/${item.id}`}
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
                  Ver Detalhes
                </Link>
        </div>
      </>
    )}
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
