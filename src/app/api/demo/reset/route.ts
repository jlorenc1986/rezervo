import { NextResponse } from "next/server";
import { resetDemoStore } from "@/lib/store";

export async function POST() {
  const store = await resetDemoStore();
  return NextResponse.json({
    ok: true,
    bookings: store.bookings.length,
    services: store.services.length,
  });
}
