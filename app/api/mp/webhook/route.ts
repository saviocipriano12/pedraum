import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json().catch(() => ({}));
    console.log("MP webhook:", data);
    // TODO: aqui você confirma pagamento, marca lead como comprado, etc.
    return new Response("OK", { status: 200 });
  } catch {
    return new Response("OK", { status: 200 });
  }
}

export const GET = () => new Response("OK", { status: 200 });
