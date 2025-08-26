"use client";
import { useState } from "react";

type Props = {
  title: string;
  price: number;
  quantity?: number;
  userId: string;
  kind: "lead" | "plano" | "produto";
  resourceId: string;
  payerEmail?: string;
  className?: string;
  label?: string;
};

export default function CheckoutProButton({
  title,
  price,
  quantity = 1,
  userId,
  kind,
  resourceId,
  payerEmail,
  className = "",
  label = "Pagar com Mercado Pago",
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    try {
      setLoading(true);
      const res = await fetch("/api/mp/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          unit_price: price,
          quantity,
          userId,
          kind,
          resourceId,
          payerEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao criar preferência");
      window.location.href = data.init_point || data.sandbox_init_point;
    } catch (e) {
      console.error(e);
      alert("Falha ao iniciar pagamento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className={`px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 ${className}`}
    >
      {loading ? "Carregando..." : label}
    </button>
  );
}
