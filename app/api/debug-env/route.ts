// app/api/debug-env/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    mp: process.env.MP_ACCESS_TOKEN ? "ok" : "ausente",
  });
}
