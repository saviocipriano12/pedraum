"use client";

import { useEffect, useState } from "react";
// Firestore fica opcional — só usamos se você quiser no futuro
import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

/** ===================== Config ===================== */
// true = usa somente a lista local (recomendado agora)
// false = tenta buscar no Firestore (e cai pro local se falhar)
const USE_ONLY_LOCAL = true;

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

/** ===================== TAXONOMIA LOCAL (COMPLETA) ===================== */
/** 
 * Lista completa embutida (17 categorias + subcategorias atômicas).
 * Se quiser voltar a usar Firestore no futuro, basta ajustar a flag USE_ONLY_LOCAL.
 */
export const TAXONOMIA_LOCAL: Cat[] = normalizeCats([
  {
    nome: "Britagem e Peneiramento",
    subcategorias: [
      "Britadores - Mandíbulas",
      "Britadores - Cônicos",
      "Britadores - Impacto",
      "Britadores - Giratório",
      "Britadores - Portátil/Móvel",
      "Trituradores Secundários e Terciários",
      "Peneiras - Vibratórias",
      "Peneiras - Rotativas",
      "Peneiras - De Tambor",
      "Peneiras - Móveis",
      "Peneiras - Fixas",
      "Peneiras - Finas",
      "Alimentadores - Vibratórios",
      "Alimentadores - Hidráulicos",
      "Alimentadores - Magnéticos",
      "Transportadores - Esteiras",
      "Transportadores - Correias",
      "Transportadores - Elevadores de Caçamba",
      "Moinhos - Bolas",
      "Moinhos - SAG",
      "Trituradores - Rocha Fina",
      "Telas",
      "Telas de Borracha",
    ],
  },
  {
    nome: "Perfuração e Detonação",
    subcategorias: [
      "Perfuratrizes - Hidráulica",
      "Perfuratrizes - Elétrica",
      "Perfuratrizes - Superfície",
      "Perfuratrizes - Subterrânea",
      "Brocas e Hastes",
      "Explosivos - Civis",
      "Explosivos - Industriais",
      "Detonadores - Elétricos",
      "Detonadores - Não Elétricos",
      "Cordéis Detonantes",
      "Sistemas de Controle de Detonação",
      "Drop ball",
      "Esferas",
    ],
  },
  {
    nome: "Transporte Interno e Logística",
    subcategorias: [
      "Caminhões Basculantes e Fora de Estrada",
      "Carretas e Reboques",
      "Caminhões Tanque",
      "Veículos Utilitários e Tratores Industriais",
      "Guinchos e Guindastes Móveis",
      "Esteiras Transportadoras",
      "Correias Transportadoras",
      "Trenes Internos de Minério",
    ],
  },
  {
    nome: "Linha Amarela e Maquinário Pesado",
    subcategorias: [
      "Escavadeiras e Miniescavadeiras",
      "Pás Carregadeiras",
      "Retroescavadeiras",
      "Motoniveladoras",
      "Rolo Compactador",
      "Carregadeiras de Esteira",
      "Empilhadeiras Industriais",
      "Plataformas de Manutenção e Acesso",
    ],
  },
  {
    nome: "Motores, Compressores e Sistemas Hidráulicos",
    subcategorias: [
      "Motores Elétricos e Diesel",
      "Compressores Industriais e Portáteis",
      "Bombas Hidráulicas e Peças",
      "Turbinas e Ventiladores Industriais",
      "Geradores Elétricos",
      "Sistemas de Ar Comprimido",
      "Sistemas Hidráulicos Completos",
    ],
  },
  {
    nome: "Peças, Componentes e Consumíveis",
    subcategorias: [
      "Correias, Polias, Engrenagens, Rolamentos, Fixadores",
      "Filtros de Óleo, Ar e Combustível",
      "Cilindros e Mangueiras Hidráulicas",
      "Ferramentas Especializadas",
      "Lubrificantes, Graxas e Aditivos",
      "Componentes de Britadores, Peneiras e Perfuratrizes",
      "Cabos Elétricos e Conectores Industriais",
      "Kits de Reparo Hidráulico",
    ],
  },
  {
    nome: "Aluguel e Locação de Equipamentos",
    subcategorias: [
      "Britadores Móveis",
      "Peneiras Móveis",
      "Perfuratrizes",
      "Linha Amarela",
      "Caminhões e Guindastes",
      "Geradores e Compressores Portáteis",
      "Plataformas de Carregamento e Manutenção",
    ],
  },
  {
    nome: "Materiais e Insumos",
    subcategorias: [
      "Minérios e Agregados",
      "Produtos Químicos para Beneficiamento",
      "Lubrificantes e Óleos Industriais",
      "Explosivos",
      "Combustíveis",
      "Água Industrial",
      "Areia, Cascalho, Brita",
      "Reagentes Químicos",
      "Graxas e Aditivos",
    ],
  },
  {
    nome: "Serviços e Manutenção",
    subcategorias: [
      "Manutenção de Britadores e Peneiras",
      "Revisão de Perfuratrizes",
      "Troca de Correias Transportadoras",
      "Manutenção de Linha Amarela",
      "Revisão Elétrica e Hidráulica",
      "Transporte de Equipamentos",
      "Consultoria de Processos",
      "Planejamento de Pedreiras",
      "Treinamento de Operadores",
      "Instalação de Equipamentos",
      "Inspeção de Segurança Industrial",
    ],
  },
  {
    nome: "Segurança e Sinalização",
    subcategorias: [
      "EPI - Capacetes",
      "EPI - Luvas",
      "EPI - Botas",
      "EPI - Óculos",
      "EPI - Respiradores",
      "EPI - Protetores Auriculares",
      "Sinalização - Placas",
      "Sinalização - Barreiras Físicas",
      "Sinalização - Alarmes Sonoros e Visuais",
      "Sistemas de Combate a Incêndio - Extintores",
      "Sistemas de Combate a Incêndio - Hidrantes",
      "Sistemas de Combate a Incêndio - Mangueiras",
      "Monitoramento de Gases e Riscos",
      "Barreiras de Contenção de Áreas de Risco",
    ],
  },
  {
    nome: "Infraestrutura e Armazenamento",
    subcategorias: [
      "Silos de Minério",
      "Depósitos de Agregados",
      "Armazéns e Galpões Industriais",
      "Tanques de Combustíveis e Químicos",
      "Pátios de Estocagem",
      "Estruturas Metálicas e Civis",
      "Plataformas de Carregamento",
      "Sistemas de Drenagem e Contenção de Resíduos",
      "Estradas Internas e Ramais Ferroviários",
    ],
  },
  {
    nome: "Laboratório e Controle de Qualidade",
    subcategorias: [
      "Análise de Minérios",
      "Ensaios Físicos e Químicos",
      "Granulometria",
      "Testes de Abrasividade e Dureza",
      "Análise de Umidade",
      "Pesagem e Amostragem",
      "Equipamentos de Calibração",
      "Testes de Densidade e Composição Química",
    ],
  },
  {
    nome: "Energia e Utilidades",
    subcategorias: [
      "Geradores e Transformadores",
      "Painéis Elétricos e Sistemas de Distribuição",
      "Sistemas de Água Industrial",
      "Ar Comprimido e Compressores",
      "Sistemas de Drenagem e Esgoto Industrial",
      "Iluminação Industrial",
      "Sistemas de Ventilação e Exaustão",
    ],
  },
  {
    nome: "Automação, Monitoramento e TI",
    subcategorias: [
      "Sistemas SCADA",
      "Sensores de Nível, Fluxo e Pressão",
      "Câmeras de Monitoramento",
      "Rádios e Comunicação Industrial",
      "Softwares de Planejamento de Produção",
      "IoT e Telemetria para Máquinas",
      "Drones para Inspeção",
    ],
  },
  {
    nome: "Meio Ambiente e Sustentabilidade",
    subcategorias: [
      "Estações de Tratamento de Água e Efluentes",
      "Contenção de Rejeitos e Barragens",
      "Monitoramento de Poeira e Ruído",
      "Reaproveitamento de Materiais",
      "Gestão Ambiental e Licenciamento",
      "Sistemas de Reciclagem de Água e Lama",
    ],
  },
  {
    nome: "Transporte Externo",
    subcategorias: [
      "Caminhões e Carretas de Transporte de Minério",
      "Vagões Ferroviários",
      "Equipamentos de Carga e Descarga",
      "Transporte Especializado de Explosivos e Químicos",
    ],
  },
  {
    nome: "Equipamentos Auxiliares",
    subcategorias: [
      "Gruas e Guindastes Fixos",
      "Plataformas de Acesso e Manutenção",
      "Balanças Industriais",
      "Equipamentos de Pesagem de Caminhões",
      "Equipamentos de Limpeza Industrial",
      "Kits de Ferramentas Manuais",
    ],
  },

  {
    nome: "Outros",
    subcategorias: [
      "Diversos"
    ]
  }
]);

/** ===================== Hook ===================== */
export function useTaxonomia() {
  // inicia já com o local completo
  const [categorias, setCategorias] = useState<Cat[]>(TAXONOMIA_LOCAL);
  const [loading, setLoading] = useState<boolean>(!USE_ONLY_LOCAL);

  useEffect(() => {
    if (USE_ONLY_LOCAL) {
      setLoading(false);
      return;
    }

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

    return () => { alive = false; };
  }, []);

  return { categorias, loading };
}
