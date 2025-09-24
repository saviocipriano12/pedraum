// lib/mercadopago.ts
import { MercadoPagoConfig, Preference } from "mercadopago";

if (!process.env.MP_ACCESS_TOKEN) {
  throw new Error("Defina MP_ACCESS_TOKEN no .env.local");
}

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 5000 },
});

export const mp = {
  preference: new Preference(mpClient),
};
