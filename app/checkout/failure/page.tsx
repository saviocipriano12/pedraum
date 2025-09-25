export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: SP[keyof SP]) => Array.isArray(v) ? v[0] : (v ?? "");

export default function FailurePage({ searchParams }: { searchParams: SP }) {
  const reason = one(searchParams.reason);
  const status = one(searchParams.status);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl w-full rounded-2xl border p-6 bg-white">
        <h1 className="text-2xl font-black text-red-700">Pagamento não concluído</h1>
        <p className="mt-2 text-slate-600">Você pode tentar novamente.</p>
        <ul className="mt-4 text-sm text-slate-700 space-y-1">
          <li><b>Status:</b> {status || "—"}</li>
          <li><b>Motivo:</b> {reason || "—"}</li>
        </ul>
      </div>
    </main>
  );
}
