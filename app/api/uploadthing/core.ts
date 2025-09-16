import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

/** Endpoints que o client vai chamar via endpoint="..." */
export const ourFileRouter = {
  // Imagens: até 5
  machineImageUploader: f({ image: { maxFileCount: 5, maxFileSize: "8MB" } })
    .onUploadComplete(async ({ file }) => {
      console.log("Imagem enviada:", file.ufsUrl ?? file.url);
    }),

  // PDF: 1 arquivo
  productPdf: f({ pdf: { maxFileCount: 1, maxFileSize: "8MB" } })
    .onUploadComplete(async ({ file }) => {
      console.log("PDF enviado:", file.ufsUrl ?? file.url);
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
