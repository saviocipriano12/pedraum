// SERVER component (sem "use client")
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function getOne(v: SP[keyof SP]) {
  return Array.isArray(v) ? v[0] : (v ?? "");
}

export default function SuccessPage({ searchParams }: { searchParams: SP }) {
  const paymentId = getOne(searchParams.payment_id);
  const status = getOne(searchParams.status);
  const preferenceId = getOne(searchParams.preference_id);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl w-full rounded-2xl border p-6 bg-white">
        <h1 className="text-2xl font-black text-emerald-700">Pagamento aprovado 🎉</h1>
        <p className="mt-2 text-slate-600">Obrigado! Validamos seu retorno do Mercado Pago.</p>
        <ul className="mt-4 text-sm text-slate-700 space-y-1">
          <li><b>Status:</b> {status || "—"}</li>
          <li><b>Payment ID:</b> {paymentId || "—"}</li>
          <li><b>Preference ID:</b> {preferenceId || "—"}</li>
        </ul>
      </div>
    </main>
  );
}
