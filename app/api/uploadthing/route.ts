import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "@/uploadthing.config";

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  onError(error) {
    console.error("[UploadThing] Erro no upload:", error);
  },
});
