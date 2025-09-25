// lib/mercadopago.ts
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

const accessToken = process.env.MP_ACCESS_TOKEN;
if (!accessToken) {
  throw new Error("Defina MP_ACCESS_TOKEN no ambiente (Vercel / .env.local).");
}

// Cliente do SDK (1x só)
export const mpClient = new MercadoPagoConfig({
  accessToken,
  options: { timeout: 8000 },
});

// Instâncias prontas
export const mpPreference = new Preference(mpClient);
export const mpPayment = new Payment(mpClient);

// (Opcional) agrupado, se quiser usar como objeto
export const mp = {
  preference: mpPreference,
  payment: mpPayment,
};
