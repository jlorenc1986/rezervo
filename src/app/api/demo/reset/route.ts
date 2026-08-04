import { NextResponse } from "next/server";
import { resetDemoStore } from "@/lib/store";

export async function POST() {
  const result = await resetDemoStore();
  return NextResponse.json({ ok: true, ...result });
}
