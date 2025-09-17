"use client";

import { useMemo, useState } from "react";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/uploadthing.config";

type EndpointName = Extract<keyof OurFileRouter, string>;

interface Props {
  initialUrl?: string | null;        // modo edição
  onUploaded: (url: string | null) => void;
  endpoint?: EndpointName;           // default: "pdfUploader"
  className?: string;
  disableUpload?: boolean;
}

export default function PDFUploader({
  initialUrl = null,
  onUploaded,
  endpoint = "pdfUploader",
  className,
  disableUpload = false,
}: Props) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(initialUrl);
  const hasFile = useMemo(() => !!currentUrl, [currentUrl]);

  function handleRemove() {
    setCurrentUrl(null);
    onUploaded(null);
  }

  return (
    <div className={className ?? "space-y-2"}>
      {!disableUpload && !hasFile && (
        <UploadButton<OurFileRouter, EndpointName>
          endpoint={endpoint}
          onBeforeUploadBegin={(files) => {
            const pdfs = files.filter((f) => {
              const ct = (f.type ?? "").toLowerCase();
              const byCT = ct.includes("pdf");
              const byExt = (f.name ?? "").toLowerCase().endsWith(".pdf");
              return byCT || byExt;
            });
            if (pdfs.length === 0) alert("Envie um arquivo PDF válido.");
            return pdfs.slice(0, 1);
          }}
          onClientUploadComplete={(res) => {
            if (res?.length) {
              const url = res[0]?.url;
              if (url) {
                setCurrentUrl(url);
                onUploaded(url);
              }
            }
          }}
          onUploadError={(error) => {
            const msg = error?.message?.includes("No file route found")
              ? "Rota de upload de PDF não encontrada no backend. Verifique 'pdfUploader'."
              : error.message || "Falha no upload do PDF.";
            alert(msg);
          }}
          appearance={{
            button:
              "ut-ready:bg-orange-600 ut-ready:hover:bg-orange-700 ut-uploading:bg-gray-400 px-4 py-2 rounded-md font-semibold text-white",
            container: "flex flex-col items-start",
          }}
        />
      )}

      {hasFile ? (
        <div className="rounded-md border p-2 text-sm text-slate-700 flex items-center justify-between">
          <div className="truncate">
            <span className="font-semibold">PDF anexado:</span>{" "}
            <a href={currentUrl!} target="_blank" rel="noreferrer" className="underline hover:no-underline">
              abrir
            </a>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="ml-3 bg-white hover:bg-slate-50 border rounded-md px-2 py-1 text-xs font-semibold text-red-600 border-red-200"
          >
            Remover
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Envie um arquivo em PDF (máx. 1).</p>
      )}
    </div>
  );
}
