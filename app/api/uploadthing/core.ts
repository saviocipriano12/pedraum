// app/api/uploadthing/core.ts
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  produtoPdf: f({ pdf: { maxFileSize: "16MB" } }) // aceita PDF
    .onUploadComplete(async ({ file }) => {
      // opcional: logs/validações
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
