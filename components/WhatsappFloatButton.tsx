// components/WhatsappFloatButton.tsx
"use client";

import { FaWhatsapp } from "react-icons/fa";

const whatsappNumber = "5531990903613"; // Seu número com DDI e DDD

export default function WhatsappFloatButton() {
  const message = encodeURIComponent("Olá! Quero falar com a equipe Pedraum.");
  const whatsappLink = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${message}`;

  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: "fixed",
        right: 22,
        bottom: 22,
        zIndex: 9999,
        background: "#25D366",
        color: "#fff",
        borderRadius: "50%",
        width: 62,
        height: 62,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 24px #0003",
        fontSize: 38,
        transition: "transform 0.14s",
        cursor: "pointer",
      }}
      className="hover:scale-110 active:scale-95"
      aria-label="Fale conosco no WhatsApp"
    >
      <FaWhatsapp />
    </a>
  );
}
