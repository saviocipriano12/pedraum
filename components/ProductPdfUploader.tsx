// components/ProductPdfUploader.tsx
"use client";

import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

type Props = {
  onUploaded?: (url: string) => void;
};

export default function ProductPdfUploader({ onUploaded }: Props) {
  return (
    <div className="space-y-2">
      {/* v6 do UploadThing espera 2 genéricos: <Router, "endpoint"> */}
      <UploadButton<OurFileRouter, "produtoPdf">
        endpoint="produtoPdf"
        onClientUploadComplete={(res) => {
          const url = res?.[0]?.url;
          if (url) onUploaded?.(url);
        }}
        onUploadError={(error) => {
          console.error("Erro no upload:", error);
        }}
      />
    </div>
  );
}
