"use client";

import { Suspense, useEffect, useState } from "react";
import AuthGateRedirect from "@/components/AuthGateRedirect";
import { useRouter } from "next/navigation";
import { db, auth } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import ImageUploader from "@/components/ImageUploader";
import {
  Loader2, Save, Tag, DollarSign, Layers, Calendar, MapPin, BookOpen, Package, List
} from "lucide-react";



// Categorias com subcategorias
const categorias = [
  {
    nome: "Equipamentos de Perfuração e Demolição",
    subcategorias: [
      "Perfuratrizes – Rotativas","Perfuratrizes – Pneumáticas","Perfuratrizes – Hidráulicas",
      "Martelos Demolidores – Hidráulicos","Martelos Demolidores – Pneumáticos",
      "Brocas para rocha","Coroas diamantadas","Varetas de extensão",
      "Explosivos – Dinamite","Explosivos – ANFO","Detonadores","Cordel detonante"
    ]
  },
  {
    nome: "Equipamentos de Carregamento e Transporte",
    subcategorias: [
      "Escavadeiras hidráulicas","Pás carregadeiras","Caminhões basculantes","Caminhões pipa",
      "Correias transportadoras","Alimentadores vibratórios","Esteiras rolantes"
    ]
  },
  {
    nome: "Britagem e Classificação",
    subcategorias: [
      "Britadores – Mandíbulas","Britadores – Cônicos","Britadores – Impacto","Britadores – Rolos",
      "Rebritadores","Peneiras vibratórias","Trommels","Hidrociclones","Classificadores",
      "Moinhos de bolas","Moinhos de barras","Moinhos verticais",
      "Lavadores de areia","Silos e chutes","Carcaças e bases metálicas"
    ]
  },
  {
    nome: "Beneficiamento e Processamento Mineral",
    subcategorias: [
      "Separadores Magnéticos","Flotação – Células","Flotação – Espumantes e coletores",
      "Filtros prensa","Espessadores","Secadores rotativos"
    ]
  },
  {
    nome: "Peças e Componentes Industriais",
    subcategorias: [
      "Rolamentos","Engrenagens","Polias","Eixos","Mancais","Buchas",
      "Correntes","Correias transportadoras","Esticadores de correia","Parafusos e porcas",
      "Molas industriais"
    ]
  },
  {
    nome: "Desgaste e Revestimento",
    subcategorias: [
      "Mandíbulas","Martelos","Revestimentos de britadores","Chapas de desgaste",
      "Barras de impacto","Grelhas","Telas metálicas","Telas em borracha"
    ]
  },
  {
    nome: "Automação, Elétrica e Controle",
    subcategorias: [
      "Motores elétricos","Inversores de frequência","Painéis elétricos","Controladores ASRi",
      "Soft starters","Sensores e detectores","Detectores de metais","CLPs e módulos"
    ]
  },
  {
    nome: "Lubrificação e Produtos Químicos",
    subcategorias: [
      "Óleos lubrificantes","Graxas industriais","Selantes industriais",
      "Desengripantes","Produtos químicos para peneiramento"
    ]
  },
  {
    nome: "Equipamentos Auxiliares e Ferramentas",
    subcategorias: [
      "Compressores de Ar – Estacionários","Compressores de Ar – Móveis","Geradores de Energia",
      "Bombas de água","Bombas de lama","Ferramentas manuais","Ferramentas elétricas",
      "Mangueiras e Conexões Hidráulicas","Iluminação Industrial","Abraçadeiras e Fixadores",
      "Soldas e Eletrodos","Equipamentos de Limpeza Industrial"
    ]
  },
  {
    nome: "EPIs (Equipamentos de Proteção Individual)",
    subcategorias: [
      "Capacetes","Protetores auriculares","Máscaras contra poeira","Respiradores",
      "Luvas","Botas de segurança","Óculos de proteção","Colete refletivo"
    ]
  },
  {
    nome: "Instrumentos de Medição e Controle",
    subcategorias: [
      "Monitoramento de Estabilidade","Inclinômetros","Extensômetros","Análise de Material",
      "Teor de umidade","Granulometria","Sensores de nível e vazão","Sistemas de controle remoto"
    ]
  },
  {
    nome: "Manutenção e Serviços Industriais",
    subcategorias: [
      "Filtros de ar e combustível","Óleos hidráulicos e graxas","Rolamentos e correias",
      "Martelos e mandíbulas para britadores","Pastilhas de desgaste",
      "Serviços de manutenção industrial","Usinagem e caldeiraria"
    ]
  },
  {
    nome: "Veículos e Pneus",
    subcategorias: [
      "Pneus industriais","Rodas e aros","Recapagens e reformas de pneus",
      "Serviços de montagem e balanceamento"
    ]
  },
  { nome: "Outros", subcategorias: ["Outros equipamentos","Produtos diversos","Serviços diversos"] }
];

const condicoes = ["Nova", "Seminova", "Usada"];
const estados = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export default function CreateProdutoPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[#023047]">Carregando…</div>}>
      <CreateProdutoForm />
    </Suspense>
  );
}

function CreateProdutoForm() {
  const router = useRouter();

  // imagens
  const [imagens, setImagens] = useState<string[]>([]);

  // form
  const [form, setForm] = useState({
    nome: "",
    tipo: "produto",
    categoria: "",
    subcategoria: "",
    preco: "",
    estado: "",
    cidade: "",
    ano: "",
    condicao: "",
    descricao: ""
  });

  // cidades por UF (IBGE)
  const [cidades, setCidades] = useState<string[]>([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: value,
      ...(name === "categoria" ? { subcategoria: "" } : null),
      ...(name === "estado" ? { cidade: "" } : null),
    }));
  }

  // carrega cidades ao escolher UF (IBGE)
  useEffect(() => {
    async function fetchCidades(uf: string) {
      if (!uf) {
        setCidades([]);
        return;
      }
      setCarregandoCidades(true);
      try {
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/distritos`);
        const data = (await res.json()) as Array<{ nome: string }>;
        const nomes = Array.from(new Set(data.map((d) => d.nome))).sort((a, b) =>
          a.localeCompare(b, "pt-BR")
        );
        setCidades(nomes);
      } catch {
        setCidades([]);
      } finally {
        setCarregandoCidades(false);
      }
    }
    fetchCidades(form.estado);
  }, [form.estado]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const user = auth.currentUser;
    if (!user) {
      setError("Você precisa estar logado para cadastrar um produto.");
      setLoading(false);
      return;
    }

    if (
      !form.nome ||
      !form.tipo ||
      !form.estado ||
      !form.cidade ||
      !form.descricao ||
      !form.categoria ||
      !form.subcategoria ||
      !form.ano ||
      !form.condicao
    ) {
      setError("Preencha todos os campos obrigatórios.");
      setLoading(false);
      return;
    }

    if (imagens.length === 0) {
      setError("Envie pelo menos uma imagem.");
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(now.getDate() + 45); // 45 dias

      await addDoc(collection(db, "produtos"), {
        ...form,
        preco: form.preco ? parseFloat(form.preco) : null,
        imagens,
        userId: user.uid,
        createdAt: serverTimestamp(),
        expiraEm: Timestamp.fromDate(expiresAt),
        status: "ativo",
        updatedAt: serverTimestamp(),
        visivel: true,
      });

      setSuccess("Produto cadastrado com sucesso!");
      setForm({
        nome: "",
        tipo: "produto",
        categoria: "",
        subcategoria: "",
        preco: "",
         estado: "",
        cidade: "",
       
        ano: "",
        condicao: "",
        descricao: ""
      });
      setImagens([]);
      setTimeout(() => router.push("/vitrine"), 1200);
    } catch (err) {
      setError("Erro ao cadastrar. Tente novamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const subcategoriasDisponiveis =
    categorias.find((c) => c.nome === form.categoria)?.subcategorias || [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#e0e7ef] flex flex-col items-center py-8 px-2 sm:px-4">
      <section
        style={{
          maxWidth: 760,
          width: "100%",
          background: "#fff",
          borderRadius: 22,
          boxShadow: "0 4px 32px #0001",
          padding: "48px 2vw 55px 2vw",
          marginTop: 18,
        }}
      >
        <h1
          style={{
            fontSize: "2.3rem",
            fontWeight: 900,
            color: "#023047",
            letterSpacing: "-1px",
            margin: "0 0 25px 0",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Package className="w-9 h-9 text-orange-500" />
          Cadastrar Produto
        </h1>

        {/* Gate de autenticação */}
        <AuthGateRedirect />

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Imagens */}
          <div style={{
            background: "#f3f6fa",
            borderRadius: 12,
            padding: "24px 18px",
            border: "1.6px solid #e8eaf0",
            marginBottom: 12,
          }}>
            <h3 style={{ color: "#2563eb", fontWeight: 700, marginBottom: 12, fontSize: 18 }}>
              Imagens do Produto
            </h3>
            <ImageUploader imagens={imagens} setImagens={setImagens} max={5} />
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 7 }}>
              Adicione até 5 imagens reais, mostrando ângulos diferentes e detalhes importantes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div>
              <label style={labelStyle}>
                <Tag size={15} /> Nome *
              </label>
              <input
                name="nome"
                value={form.nome}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Ex: Pá carregadeira, motor, filtro, etc."
                required
              />
            </div>
            {/* Tipo */}
            <div>
              <label style={labelStyle}>
                <Layers size={15} /> Tipo *
              </label>
              <select
                name="tipo"
                value={form.tipo}
                onChange={handleChange}
                style={inputStyle}
                required
              >
                <option value="produto">Produto</option>
                <option value="máquina">Máquina</option>
              </select>
            </div>
            {/* Categoria */}
            <div>
              <label style={labelStyle}>
                <List size={15} /> Categoria *
              </label>
              <select
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                style={inputStyle}
                required
              >
                <option value="">Selecione</option>
                {categorias.map((cat) => (
                  <option key={cat.nome} value={cat.nome}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>
            {/* Subcategoria */}
            <div>
              <label style={labelStyle}>
                <Tag size={15} /> Subcategoria *
              </label>
              <select
                name="subcategoria"
                value={form.subcategoria}
                onChange={handleChange}
                style={inputStyle}
                required
                disabled={!form.categoria}
              >
                <option value="">{form.categoria ? "Selecione" : "Selecione a categoria primeiro"}</option>
                {subcategoriasDisponiveis.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
            {/* Preço */}
            <div>
              <label style={labelStyle}>
                <DollarSign size={15} /> Preço (R$)
              </label>
              <input
                name="preco"
                value={form.preco}
                onChange={handleChange}
                type="number"
                style={inputStyle}
                placeholder="Ex: 15000"
                min={0}
                step={0.01}
              />
            </div>
            {/* Ano */}
            <div>
              <label style={labelStyle}>
                <Calendar size={15} /> Ano *
              </label>
              <input
                name="ano"
                value={form.ano}
                onChange={handleChange}
                type="number"
                style={inputStyle}
                placeholder="Ex: 2021"
                required
                min={1900}
              />
            </div>
            {/* Condição */}
            <div>
              <label style={labelStyle}>
                <Tag size={15} /> Condição *
              </label>
              <select
                name="condicao"
                value={form.condicao}
                onChange={handleChange}
                style={inputStyle}
                required
              >
                <option value="">Selecione</option>
                {condicoes.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            {/* Estado */}
            <div>
              <label style={labelStyle}>
                <MapPin size={15} /> Estado *
              </label>
              <select
                name="estado"
                value={form.estado}
                onChange={handleChange}
                style={inputStyle}
                required
              >
                <option value="">Selecione</option>
                {estados.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </div>
          </div>
            {/* Cidade (dependente da UF) */}
            <div>
              <label style={labelStyle}>
                <MapPin size={15} /> Cidade *
              </label>
              <select
                name="cidade"
                value={form.cidade}
                onChange={handleChange}
                style={inputStyle}
                required
                disabled={!form.estado || carregandoCidades}
              >
                <option value="">
                  {carregandoCidades
                    ? "Carregando..."
                    : form.estado
                    ? "Selecione a cidade"
                    : "Selecione primeiro o estado"}
                </option>
                {cidades.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            

          {/* Descrição */}
          <div>
            <label style={labelStyle}>
              <BookOpen size={15} /> Descrição *
            </label>
            <textarea
              name="descricao"
              value={form.descricao}
              onChange={handleChange}
              style={{ ...inputStyle, height: 90 }}
              placeholder="Descreva com detalhes o produto, condição, uso, etc."
              rows={4}
              required
            />
          </div>

          {error && (
            <div
              style={{
                background: "#fff7f7",
                color: "#d90429",
                border: "1.5px solid #ffe5e5",
                padding: "12px 0",
                borderRadius: 11,
                textAlign: "center",
                marginBottom: 10,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                background: "#f7fafc",
                color: "#16a34a",
                border: "1.5px solid #c3f3d5",
                padding: "12px 0",
                borderRadius: 11,
                textAlign: "center",
                marginBottom: 10,
                fontWeight: 700,
              }}
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "linear-gradient(90deg,#fb8500,#219ebc)",
              color: "#fff",
              border: "none",
              borderRadius: 13,
              padding: "16px 0",
              fontWeight: 800,
              fontSize: 22,
              boxShadow: "0 2px 20px #fb850022",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginTop: 10,
            }}
          >
            {loading ? <Loader2 className="animate-spin w-7 h-7" /> : <Save className="w-6 h-6" />}
            {loading ? "Salvando..." : "Cadastrar Produto"}
          </button>
        </form>
      </section>
    </main>
  );
}

// Estilos reutilizáveis
const labelStyle: React.CSSProperties = {
  fontWeight: 700, color: "#023047", marginBottom: 2, display: "flex", alignItems: "center", gap: 6
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 10,
  border: "1.6px solid #e5e7eb",
  fontSize: 17,
  color: "#222",
  background: "#f8fafc",
  fontWeight: 600,
  marginBottom: 8,
  outline: "none",
  marginTop: 4,
  minHeight: 46,
};
