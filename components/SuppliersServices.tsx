"use client";

import Image from "next/image";
import Link from "next/link";

const cards = [
  {
    title: "Fornecedores de produtos",
    text: "Peças, britadores, correias, rolamentos, peneiras e muito mais.",
    img: "/banners/produtos.jpg",
    href: "/fornecedores?tipo=produtos",
  },
  {
    title: "Prestadores de serviço",
    text: "Manutenção, montagem, transporte, usinagem, assistência técnica.",
    img: "/banners/servicos.jpg",
    href: "/fornecedores?tipo=servicos",
  },
  {
    title: "Oportunidades reais de negócio",
    text: "Demandas ativas publicadas por mineradoras e construtoras.",
    img: "/banners/oportunidades.jpg",
    href: "/demandas",
  },
];

export default function SuppliersServices() {
  return (
    <section className="container mx-auto px-4">
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#023047]">
          O que você encontra no Pedraum
        </h2>
        <p className="mt-2 text-slate-600">
          Uma plataforma de conexão direta entre mineradoras, fornecedores e prestadores de serviço.
        </p>
      </div>

      <div className="mt-8 grid md:grid-cols-3 gap-5">
        {cards.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="group rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm hover:shadow-md transition"
          >
            <div className="relative h-44 w-full bg-slate-100">
              {/* fallback se a imagem não existir */}
              <Image
                src={c.img}
                alt={c.title}
                fill
                className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="p-5">
              <h3 className="font-semibold text-[#023047]">{c.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{c.text}</p>
              <div className="mt-3 text-[#FB8500] font-semibold">Ver mais →</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
