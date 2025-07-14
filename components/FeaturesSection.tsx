import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { ShieldCheck, PhoneCall, DollarSign, Users, Wrench } from "lucide-react";

const features = [
  {
    icon: <ShieldCheck size={42} className="text-accent" />,
    title: "Liberdade Total",
    description: "Negocie diretamente entre usuários. Cadastre, encontre e atenda oportunidades sem intermediários.",
  },
  {
    icon: <PhoneCall size={42} className="text-accent" />,
    title: "Contato Direto",
    description: "Converse diretamente com vendedores e tire dúvidas sem intermediários.",
  },
  {
    icon: <DollarSign size={42} className="text-accent" />,
    title: "Oportunidades Reais",
    description: "Máquinas e serviços de todo o Brasil, sempre com as melhores ofertas.",
  },
  {
    icon: <Users size={42} className="text-accent" />,
    title: "Rede Colaborativa",
    description: "Compre, venda, indique, avalie e faça parte da maior comunidade de britagem.",
  },
  {
    icon: <Wrench size={42} className="text-accent" />,
    title: "Suporte Especializado",
    description: "Time de especialistas para ajudar em qualquer etapa da negociação.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="w-full py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-extrabold text-primary mb-10 text-center">
          Por que usar o <span className="text-accent">Pedraum?</span>
        </h2>
        <Swiper
          spaceBetween={24}
          slidesPerView={1.15}
          breakpoints={{
            640: { slidesPerView: 2.1 },
            1024: { slidesPerView: 3.2 },
          }}
          style={{ padding: "8px 0 30px 0" }}
        >
          {features.map((f, i) => (
            <SwiperSlide key={i}>
              <div className="flex flex-col items-center bg-[#F6F9FA] rounded-2xl shadow-lg p-8 text-center border border-[#ececec] h-full hover:scale-105 transition-transform">
                <div className="mb-4">{f.icon}</div>
                <h3 className="font-bold text-lg md:text-xl text-primary mb-2">{f.title}</h3>
                <p className="text-gray-600 text-base md:text-[1.02rem]">{f.description}</p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
