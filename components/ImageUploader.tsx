// =============================
// components/ImageUploader.tsx
// =============================

"use client";

import { useEffect, useState } from "react";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/uploadthing.config";

interface Props {
  imagens: string[];
  setImagens: (urls: string[]) => void;
  max?: number;
  circular?: boolean;
}

export default function ImageUploader({ imagens, setImagens, max = 5 }: Props) {
  const [limite, setLimite] = useState(false);

  useEffect(() => {
    setLimite(imagens.length >= max);
  }, [imagens, max]);

  return (
    <div className="space-y-2">
      {limite ? (
        <p className="text-sm text-red-500">Limite de {max} imagens atingido.</p>
      ) : (
        <UploadButton<OurFileRouter, "machineImageUploader">
          endpoint="machineImageUploader"
          onClientUploadComplete={(res) => {
            if (res) {
              const urls = res.map((file) => file.url);
              setImagens([...imagens, ...urls]);
            }
          }}
          onUploadError={(error) => {
            alert("Erro ao enviar imagem: " + error.message);
          }}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
        {imagens.map((url, i) => (
          <img
            key={i}
            src={url}
            alt={`Imagem ${i + 1}`}
            className="w-full h-28 object-cover rounded-xl border"
          />
        ))}
      </div>
    </div>
  );
}
