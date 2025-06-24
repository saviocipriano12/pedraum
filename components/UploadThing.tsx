"use client";
import { UploadButton as UTUploadButton } from "@uploadthing/react";
import type { FileRouter } from "uploadthing/server";
export function UploadButton(props: any) {
  return (
    <UTUploadButton
      endpoint="imageUploader"
      {...props}
      appearance={{
        button: {
          background: "#f8fafc",
          color: "#023047",
          border: "1.5px solid #e5e7eb",
          borderRadius: 12,
          padding: 11,
          cursor: "pointer",
          fontWeight: 500,
          gap: 6,
          fontSize: "1rem",
        },
        container: {},
      }}
      content={{
        button: <>Enviar imagem</>,
      }}
    />
  );
}
