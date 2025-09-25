"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

/** ===================== Tipos ===================== */
export type Subcat = { nome: string; slug: string };
export type Cat = { nome: string; slug: string; subcategorias: Subcat[] };

/** slug simples e estável */
function slugify(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

/** Converte quaisquer formatos vindos do Firestore p/ o formato Cat/Subcat */
function normalizeCats(input: any[]): Cat[] {
  return (input || [])
    .map((c) => {
      const nome = (c?.nome ?? c?.name ?? "").toString().trim();
      const subRaw =
        Array.isArray(c?.subcategorias) ? c.subcategorias :
        Array.isArray(c?.subs) ? c.subs :
        Array.isArray(c?.itens) ? c.itens :
        [];

      const subcategorias: Subcat[] = subRaw
        .filter(Boolean)
        .map((s: any) => {
          const n = (s?.nome ?? s?.name ?? s ?? "").toString().trim();
          return { nome: n, slug: slugify(n) };
        });

      return {
        nome,
        slug: slugify(nome),
        subcategorias,
      } as Cat;
    })
    .filter((c) => c.nome && c.subcategorias?.length >= 0);
}

/** ===================== TAXONOMIA LOCAL (fallback) ===================== */
/** 
 * Esta é a lista “nova + complementos” para funcionar offline ou caso
 * a coleção do Firestore ainda não exista. Ajuste/expanda à vontade.
 */
export const TAXONOMIA_LOCAL: Cat[] = normalizeCats([
  {
    nome: "Britagem e Peneiramento",
    subcategorias: [
      "Britadores: Mandíbulas, Cônicos, Impacto, Giratório, Portátil/Móvel",
      "Trituradores Secundários e Terciários",
      "Peneiras: Vibratórias, Rotativas, De Tambor, Móveis, Fixas, Peneiras Finas",
      "Alimentadores e Classificadores: Vibratórios, Hidráulicos, Magnéticos",
      "Transportadores Internos: Esteiras Transportadoras, Correias Transportadoras, Elevadores de Caçamba",
      "Trituradores e Moinhos: Moinhos de Bolas, Moinhos SAG, Trituradores de Rocha Fina",
      // complementos/legado
      "Revestimento de Britadores",
    ],
  },
  {
    nome: "Perfuração e Detonação",
    subcategorias: [
      "Perfuratrizes",
      "Rompedores/Martelos",
      "Bits/Brocas",
      "Carretas de Perfuração",
      "Compressores",
      "Ferramentas de Demolição",
    ],
  },
  {
    nome: "Carregamento e Transporte",
    subcategorias: [
      "Pás-Carregadeiras",
      "Escavadeiras",
      "Retroescavadeiras",
      "Caminhões Fora-de-Estrada",
      "Tratores de Esteiras",
      "Motoniveladoras",
    ],
  },
  {
    nome: "Beneficiamento e Processamento Mineral",
    subcategorias: [
      "Moinhos (Bolas/Rolos)",
      "Ciclones",
      "Classificadores Espirais",
      "Espessadores",
      "Flotação",
      "Bombas de Polpa",
    ],
  },
  {
    nome: "Peças e Componentes Industriais",
    subcategorias: [
      "Motores",
      "Transmissões/Redutores",
      "Sistemas Hidráulicos",
      "Sistemas Elétricos",
      "Filtros e Filtração",
      "Mangueiras/Conexões",
    ],
  },
  {
    nome: "Desgaste e Revestimento",
    subcategorias: [
      "Revestimento de Britadores",
      "Chapas AR",
      "Dentes/Lâminas",
      "Placas Cerâmicas",
      "Revestimentos de Borracha",
    ],
  },
  {
    nome: "Automação, Elétrica e Controle",
    subcategorias: [
      "CLPs/Controladores",
      "Sensores/Instrumentação",
      "Inversores/Soft-Starters",
      "Painéis/Quadros",
      "SCADA/Supervisório",
    ],
  },
  {
    nome: "Lubrificação e Produtos Químicos",
    subcategorias: [
      "Óleos e Graxas",
      "Sistemas Centralizados",
      "Aditivos",
      "Reagentes de Flotação",
      "Desincrustantes/Limpeza",
    ],
  },
  {
    nome: "Equipamentos Auxiliares e Ferramentas",
    subcategorias: [
      "Geradores",
      "Soldagem/Corte",
      "Bombas",
      "Ferramentas de Torque",
      "Compressores Auxiliares",
    ],
  },
  {
    nome: "EPIs (Equipamentos de Proteção Individual)",
    subcategorias: [
      "Capacetes",
      "Luvas",
      "Óculos/Face Shield",
      "Respiradores",
      "Protetores Auriculares",
      "Botas",
    ],
  },
  {
    nome: "Instrumentos de Medição e Controle",
    subcategorias: [
      "Vibração/Análise",
      "Alinhamento a Laser",
      "Balanças/Pesagem",
      "Medidores de Espessura",
      "Termografia",
    ],
  },
  {
    nome: "Manutenção e Serviços Industriais",
    subcategorias: [
      "Mecânica Pesada",
      "Caldeiraria/Solda",
      "Usinagem",
      "Alinhamento/Balanceamento",
      "Inspeções/NR",
      "Elétrica/Automação",
    ],
  },
  {
    nome: "Veículos e Pneus",
    subcategorias: [
      "Pickups/Utilitários",
      "Caminhões 3/4",
      "Empilhadeiras",
      "Pneus OTR",
      "Recapagem/Serviços",
    ],
  },
  {
    nome: "Outros",
    subcategorias: ["Diversos"],
  },
]);

/** ===================== Hook ===================== */
/**
 * Lê da coleção `taxonomia` no Firestore (campos esperados: nome, subcategorias)
 * e cai para o TAXONOMIA_LOCAL caso não exista/erro.
 */
export function useTaxonomia() {
  const [categorias, setCategorias] = useState<Cat[]>(TAXONOMIA_LOCAL);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "taxonomia"));
        if (!alive) return;

        if (!snap.empty) {
          const server = snap.docs.map((d) => d.data());
          const norm = normalizeCats(server);
          if (norm.length > 0) {
            setCategorias(norm);
          } else {
            setCategorias(TAXONOMIA_LOCAL);
          }
        } else {
          setCategorias(TAXONOMIA_LOCAL);
        }
      } catch {
        setCategorias(TAXONOMIA_LOCAL);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { categorias, loading };
}
