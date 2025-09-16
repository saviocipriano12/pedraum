"use client";

import { useState } from "react";
import { UploadButton } from "@/utils/uploadthing";
import { db } from "@/firebaseConfig";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

type Props = {
  /** default = "create": só retorna URL; "edit": salva no Firestore também */
  mode?: "create" | "edit";
  collection?: string;  // obrigatório se mode="edit"
  docId?: string;       // obrigatório se mode="edit"
  onUploaded?: (url: string) => void;
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
      <UploadButton
        endpoint="productPdf"
        onClientUploadComplete={async (res) => {
          const u = (res?.[0] as any)?.ufsUrl ?? (res?.[0] as any)?.url;
          if (!u) return alert("Upload finalizado, mas sem URL.");

          try {
            if (mode === "edit") await salvarNoFirestore(u);
            setUrl(u);
            onUploaded?.(u);
            alert(mode === "edit" ? "PDF enviado e salvo!" : "PDF enviado!");
          } catch (e) {
            console.error(e);
            alert("Erro ao salvar o PDF no Firestore.");
          }
        }}
        onUploadError={(err: Error) => alert(`Erro no upload: ${err.message}`)}
      />

      {url && (
        <p className="text-xs break-all">
          PDF: <span className="font-mono">{url}</span>
        </p>
      )}
    </div>
  );
}
