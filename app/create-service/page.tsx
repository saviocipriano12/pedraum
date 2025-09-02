import { Suspense } from "react";
import CreateServiceClient from "./CreateServiceClient";

export const dynamic = "force-dynamic"; // evita erro de export/prerender

export default function Page() {
  return (
    <Suspense fallback={<div>Carregando formulário...</div>}>
      <CreateServiceClient />
    </Suspense>
  );
}
