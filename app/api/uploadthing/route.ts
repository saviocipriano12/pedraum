import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "@/uploadthing.config";


export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
