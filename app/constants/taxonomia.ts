// src/constants/taxonomia.ts
export type Taxonomia = { nome: string; subcategorias: string[] };

export const CATEGORIAS_COMPLETAS: Taxonomia[] = [
  { nome: "Equipamentos de Perfuração e Demolição",
    subcategorias: [
      "Perfuratrizes – Rotativas","Perfuratrizes – Pneumáticas","Perfuratrizes – Hidráulicas",
      "Martelos Demolidores – Hidráulicos","Martelos Demolidores – Pneumáticos",
      "Brocas para rocha","Coroas diamantadas","Varetas de extensão",
      "Explosivos – Dinamite","Explosivos – ANFO","Detonadores","Cordel detonante"
    ]
  },
  { nome: "Equipamentos de Carregamento e Transporte",
    subcategorias: [
      "Escavadeiras hidráulicas","Pás carregadeiras","Caminhões basculantes","Caminhões pipa",
      "Correias transportadoras","Alimentadores vibratórios","Esteiras rolantes"
    ]
  },
  { nome: "Britagem e Classificação",
    subcategorias: [
      "Britadores – Mandíbulas","Britadores – Cônicos","Britadores – Impacto","Britadores – Rolos",
      "Rebritadores","Peneiras vibratórias","Trommels","Hidrociclones","Classificadores",
      "Moinhos de bolas","Moinhos de barras","Moinhos verticais",
      "Lavadores de areia","Silos e chutes","Carcaças e bases metálicas"
    ]
  },
  { nome: "Beneficiamento e Processamento Mineral",
    subcategorias: [
      "Separadores Magnéticos","Flotação – Células","Flotação – Espumantes e coletores",
      "Filtros prensa","Espessadores","Secadores rotativos"
    ]
  },
  { nome: "Peças e Componentes Industriais",
    subcategorias: [
      "Rolamentos","Engrenagens","Polias","Eixos","Mancais","Buchas",
      "Correntes","Correias transportadoras","Esticadores de correia","Parafusos e porcas",
      "Molas industriais"
    ]
  },
  { nome: "Desgaste e Revestimento",
    subcategorias: [
      "Mandíbulas","Martelos","Revestimentos de britadores","Chapas de desgaste",
      "Barras de impacto","Grelhas","Telas metálicas","Telas em borracha"
    ]
  },
  { nome: "Automação, Elétrica e Controle",
    subcategorias: [
      "Motores elétricos","Inversores de frequência","Painéis elétricos","Controladores ASRi",
      "Soft starters","Sensores e detectores","Detectores de metais","CLPs e módulos"
    ]
  },
  { nome: "Lubrificação e Produtos Químicos",
    subcategorias: [
      "Óleos lubrificantes","Graxas industriais","Selantes industriais",
      "Desengripantes","Produtos químicos para peneiramento"
    ]
  },
  { nome: "Equipamentos Auxiliares e Ferramentas",
    subcategorias: [
      "Compressores de Ar – Estacionários","Compressores de Ar – Móveis","Geradores de Energia",
      "Bombas de água","Bombas de lama","Ferramentas manuais","Ferramentas elétricas",
      "Mangueiras e Conexões Hidráulicas","Iluminação Industrial","Abraçadeiras e Fixadores",
      "Soldas e Eletrodos","Equipamentos de Limpeza Industrial"
    ]
  },
  { nome: "EPIs (Equipamentos de Proteção Individual)",
    subcategorias: [
      "Capacetes","Protetores auriculares","Máscaras contra poeira","Respiradores",
      "Luvas","Botas de segurança","Óculos de proteção","Colete refletivo"
    ]
  },
  { nome: "Instrumentos de Medição e Controle",
    subcategorias: [
      "Monitoramento de Estabilidade","Inclinômetros","Extensômetros","Análise de Material",
      "Teor de umidade","Granulometria","Sensores de nível e vazão","Sistemas de controle remoto"
    ]
  },
  { nome: "Manutenção e Serviços Industriais",
    subcategorias: [
      "Filtros de ar e combustível","Óleos hidráulicos e graxas","Rolamentos e correias",
      "Martelos e mandíbulas para britadores","Pastilhas de desgaste",
      "Serviços de manutenção industrial","Usinagem e caldeiraria"
    ]
  },
  { nome: "Veículos e Pneus",
    subcategorias: [
      "Pneus industriais","Rodas e aros","Recapagens e reformas de pneus",
      "Serviços de montagem e balanceamento"
    ]
  },
  { nome: "Outros",
    subcategorias: ["Outros equipamentos","Produtos diversos","Serviços diversos"]
  }
];

export const CATEGORIAS = CATEGORIAS_COMPLETAS.map(c => c.nome);
export const SUBCATS_BY_CAT: Record<string, string[]> =
  Object.fromEntries(CATEGORIAS_COMPLETAS.map(c => [c.nome, c.subcategorias]));
