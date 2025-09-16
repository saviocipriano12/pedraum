import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

/** Publica GET/POST em /api/uploadthing */
export const { GET, POST } = createRouteHandler({ router: ourFileRouter });
