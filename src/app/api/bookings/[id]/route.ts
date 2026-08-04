import { NextResponse } from "next/server";
import { updateBookingStatus } from "@/lib/store";
import type { BookingStatus } from "@/lib/types";

const ALLOWED: BookingStatus[] = [
  "pending",
  "confirmed",
  "deposit_paid",
  "completed",
  "no_show",
  "cancelled",
];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as { status?: BookingStatus };
  if (!body.status || !ALLOWED.includes(body.status)) {
    return NextResponse.json({ error: "Status non valido" }, { status: 400 });
  }
  const booking = await updateBookingStatus(id, body.status);
  if (!booking) {
    return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
  }
  return NextResponse.json({ booking });
}
