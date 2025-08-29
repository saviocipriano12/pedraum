"use client";

import { ClipboardList, Users, Handshake } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      icon: <ClipboardList className="h-6 w-6" />,
      title: "1. Publique sua demanda",
      text: "Descreva o que precisa (produto, peça ou serviço) e onde precisa.",
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "2. Receba propostas",
      text: "Receba contatos e orçamentos de fornecedores qualificados, rapidamente.",
    },
    {
      icon: <Handshake className="h-6 w-6" />,
      title: "3. Feche negócio com segurança",
      text: "Compare opções, avalie reputação e conclua a compra sem intermediários.",
    },
  ];

  return (
    <section className="container mx-auto px-4">
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#023047]">
          Como o Pedraum funciona?
        </h2>
        <p className="mt-2 text-slate-600">
          Compra facilitada para mineração e britagem: você precisa, nós encontramos.
        </p>
      </div>

      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        {steps.map((s, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white shadow-sm p-5 border border-slate-100 hover:shadow-md transition"
          >
            <div className="h-10 w-10 rounded-full bg-[#FFE5CC] text-[#FB8500] flex items-center justify-center">
              {s.icon}
            </div>
            <h3 className="mt-4 font-semibold text-[#023047]">{s.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
