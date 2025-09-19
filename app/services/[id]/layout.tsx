// app/services/[id]/layout.tsx
"use client";
import RequireAuth from "@/components/RequireAuth";

export default function ServiceDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth title="Serviço" description="Faça login para ver os detalhes do serviço.">
      {children}
    </RequireAuth>
  );
}
