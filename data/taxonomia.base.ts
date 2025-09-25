import type { Taxonomia } from "@/types/taxonomia";

export const CATEGORIAS_BASE: Taxonomia = [
  { nome: "Equipamentos de Perfuração e Demolição", subcategorias: [
    { nome: "Perfuratrizes – Rotativas" },{ nome: "Perfuratrizes – Pneumáticas" },{ nome: "Perfuratrizes – Hidráulicas" },
    { nome: "Martelos Demolidores – Hidráulicos" },{ nome: "Martelos Demolidores – Pneumáticos" },
    { nome: "Brocas para rocha" },{ nome: "Coroas diamantadas" },{ nome: "Varetas de extensão" },
    { nome: "Explosivos – Dinamite" },{ nome: "Explosivos – ANFO" },{ nome: "Detonadores" },{ nome: "Cordel detonante" }
  ]},
  { nome: "Equipamentos de Carregamento e Transporte", subcategorias: [
    { nome: "Escavadeiras hidráulicas" },{ nome: "Pás carregadeiras" },{ nome: "Caminhões basculantes" },{ nome: "Caminhões pipa" },
    { nome: "Correias transportadoras" },{ nome: "Alimentadores vibratórios" },{ nome: "Esteiras rolantes" }
  ]},
  { nome: "Britagem e Classificação", subcategorias: [
    { nome: "Britadores – Mandíbulas" },{ nome: "Britadores – Cônicos" },{ nome: "Britadores – Impacto" },{ nome: "Britadores – Rolos" },
    { nome: "Rebritadores" },{ nome: "Peneiras vibratórias" },{ nome: "Trommels" },{ nome: "Hidrociclones" },{ nome: "Classificadores" },
    { nome: "Moinhos de bolas" },{ nome: "Moinhos de barras" },{ nome: "Moinhos verticais" },
    { nome: "Lavadores de areia" },{ nome: "Silos e chutes" },{ nome: "Carcaças e bases metálicas" }
  ]},
  { nome: "Beneficiamento e Processamento Mineral", subcategorias: [
    { nome: "Separadores Magnéticos" },{ nome: "Flotação – Células" },{ nome: "Flotação – Espumantes e coletores" },
    { nome: "Filtros prensa" },{ nome: "Espessadores" },{ nome: "Secadores rotativos" }
  ]},
  { nome: "Peças e Componentes Industriais", subcategorias: [
    { nome: "Rolamentos" },{ nome: "Engrenagens" },{ nome: "Polias" },{ nome: "Eixos" },{ nome: "Mancais" },{ nome: "Buchas" },
    { nome: "Correntes" },{ nome: "Correias transportadoras" },{ nome: "Esticadores de correia" },{ nome: "Parafusos e porcas" },
    { nome: "Molas industriais" }
  ]},
  { nome: "Desgaste e Revestimento", subcategorias: [
    { nome: "Mandíbulas" },{ nome: "Martelos" },{ nome: "Revestimentos de britadores" },{ nome: "Chapas de desgaste" },
    { nome: "Barras de impacto" },{ nome: "Grelhas" },{ nome: "Telas metálicas" },{ nome: "Telas em borracha" }
  ]},
  { nome: "Automação, Elétrica e Controle", subcategorias: [
    { nome: "Motores elétricos" },{ nome: "Inversores de frequência" },{ nome: "Painéis elétricos" },{ nome: "Controladores ASRi" },
    { nome: "Soft starters" },{ nome: "Sensores e detectores" },{ nome: "Detectores de metais" },{ nome: "CLPs e módulos" }
  ]},
  { nome: "Lubrificação e Produtos Químicos", subcategorias: [
    { nome: "Óleos lubrificantes" },{ nome: "Graxas industriais" },{ nome: "Selantes industriais" },
    { nome: "Desengripantes" },{ nome: "Produtos químicos para peneiramento" }
  ]},
  { nome: "Equipamentos Auxiliares e Ferramentas", subcategorias: [
    { nome: "Compressores de Ar – Estacionários" },{ nome: "Compressores de Ar – Móveis" },{ nome: "Geradores de Energia" },
    { nome: "Bombas de água" },{ nome: "Bombas de lama" },{ nome: "Ferramentas manuais" },{ nome: "Ferramentas elétricas" },
    { nome: "Mangueiras e Conexões Hidráulicas" },{ nome: "Iluminação Industrial" },{ nome: "Abraçadeiras e Fixadores" },
    { nome: "Soldas e Eletrodos" },{ nome: "Equipamentos de Limpeza Industrial" }
  ]},
  { nome: "EPIs (Equipamentos de Proteção Individual)", subcategorias: [
    { nome: "Capacetes" },{ nome: "Protetores auriculares" },{ nome: "Máscaras contra poeira" },{ nome: "Respiradores" },
    { nome: "Luvas" },{ nome: "Botas de segurança" },{ nome: "Óculos de proteção" },{ nome: "Colete refletivo" }
  ]},
  { nome: "Instrumentos de Medição e Controle", subcategorias: [
    { nome: "Monitoramento de Estabilidade" },{ nome: "Inclinômetros" },{ nome: "Extensômetros" },{ nome: "Análise de Material" },
    { nome: "Teor de umidade" },{ nome: "Granulometria" },{ nome: "Sensores de nível e vazão" },{ nome: "Sistemas de controle remoto" }
  ]},
  { nome: "Manutenção e Serviços Industriais", subcategorias: [
    { nome: "Filtros de ar e combustível" },{ nome: "Óleos hidráulicos e graxas" },{ nome: "Rolamentos e correias" },
    { nome: "Martelos e mandíbulas para britadores" },{ nome: "Pastilhas de desgaste" },
    { nome: "Serviços de manutenção industrial" },{ nome: "Usinagem e caldeiraria" }
  ]},
  { nome: "Veículos e Pneus", subcategorias: [
    { nome: "Pneus industriais" },{ nome: "Rodas e aros" },{ nome: "Recapagens e reformas de pneus" },
    { nome: "Serviços de montagem e balanceamento" }
  ]},
  { nome: "Outros", subcategorias: [
    { nome: "Outros equipamentos" },{ nome: "Produtos diversos" },{ nome: "Serviços diversos" }
  ]}
];
