"use client";
import { useEffect } from "react";
import { initMercadoPago } from "@mercadopago/sdk-react";

export default function MercadoPagoProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MP_PUBLIC_KEY) {
      initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY, { locale: "pt-BR" });
    }
  }, []);
  return <>{children}</>;
}
