"use client";

import { useState } from "react";
// Ajuste o import conforme sua versão do UploadThing no frontend:
import { UploadButton } from "@uploadthing/react"; // ou "@/utils/uploadthing" se você criou um wrapper

type Props = {
  produtoId: string;
  onUploaded?: (url: string) => void; // callback para você salvar no Firestore via client, se preferir
};

export default function ProductPdfUploader({ produtoId, onUploaded }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <UploadButton
        endpoint="productPdf"
        onClientUploadComplete={(res) => {
          const uploadedUrl = res?.[0]?.url;
          if (uploadedUrl) {
            setUrl(uploadedUrl);
            onUploaded?.(uploadedUrl);
          }
        }}
        onUploadError={(error: Error) => alert(`Erro no upload: ${error.message}`)}
        content={{
          button({ ready }) {
            return ready ? "Enviar PDF (até 8MB)" : "Carregando…";
          },
          allowedContent() {
            return "Somente .pdf";
          },
        }}
        appearance={{
          button: "px-4 py-2 rounded-md border",
          container: "flex flex-col gap-2",
        }}
        // Se sua rota .onUploadComplete espera metadata, envie assim:
        // metadata={{ produtoId }}
      />
      {url ? <p className="text-xs break-all">PDF enviado: {url}</p> : null}
    </div>
  );
}
