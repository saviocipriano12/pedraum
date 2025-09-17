"use client";

import { useState } from "react";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { db } from "@/firebaseConfig";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

type Props = {
  /** default = "create": só retorna URL; "edit": também salva no Firestore */
  mode?: "create" | "edit";
  collection?: string;  // obrigatório se mode="edit"
  docId?: string;       // obrigatório se mode="edit"
  onUploaded?: (url: string) => void; // <-- use este nome MESMO
};

export default function PDFUploader({
  mode = "create",
  collection,
  docId,
  onUploaded,
}: Props) {
  const [url, setUrl] = useState<string | null>(null);

  async function salvarNoFirestore(u: string) {
    if (mode !== "edit" || !collection || !docId) return;
    await updateDoc(doc(db, collection, docId), {
      pdfUrl: u,
      atualizadoEm: serverTimestamp(),
    });
  }

  return (
    <div className="space-y-2">
      {/* Algumas versões do UploadThing exigem 2 genéricos: <Router, "endpoint"> */}
      <UploadButton<OurFileRouter, "produtoPdf">
        endpoint="produtoPdf"
        onClientUploadComplete={async (res) => {
          // res: Array<{ url: string; ... }>
          const uploadedUrl = res?.[0]?.url;
          if (!uploadedUrl) return;

          setUrl(uploadedUrl);

          // dispara callback do pai (se houver)
          onUploaded?.(uploadedUrl);

          // salva no Firestore quando estiver em modo "edit"
          await salvarNoFirestore(uploadedUrl);
        }}
        onUploadError={(error) => {
          console.error("Erro no upload:", error);
          // aqui você pode exibir um toast se quiser
        }}
      />
      {url && (
        <p className="text-sm text-gray-500 break-all">
          PDF enviado: {url}
        </p>
      )}
    </div>
  );
}
