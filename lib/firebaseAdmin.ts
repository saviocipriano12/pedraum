import "server-only";
import admin from "firebase-admin";

function getCreds() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (json) {
    try {
      const c = JSON.parse(json);
      return {
        projectId: String(c.project_id),
        clientEmail: String(c.client_email),
        privateKey: String(c.private_key || "").replace(/\\n/g, "\n"),
      };
    } catch (e) {
      console.error("FIREBASE_SERVICE_ACCOUNT_KEY inválida:", e);
    }
  }

  const proj = process.env.FIREBASE_PROJECT_ID;
  const email = process.env.FIREBASE_CLIENT_EMAIL;
  const key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (proj && email && key) {
    return { projectId: String(proj), clientEmail: String(email), privateKey: String(key) };
  }
  return null;
}

if (!admin.apps.length) {
  const creds = getCreds();
  if (!creds) {
    // Evita quebrar o build com erro genérico e dá dica clara:
    throw new Error(
      "Firebase Admin: credenciais ausentes. Defina FIREBASE_SERVICE_ACCOUNT_KEY (JSON) " +
      "ou FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY."
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: creds.projectId,
      clientEmail: creds.clientEmail,
      privateKey: creds.privateKey,
    }),
  });
}

export const dbAdmin = admin.firestore();
export const auth = admin.auth();
