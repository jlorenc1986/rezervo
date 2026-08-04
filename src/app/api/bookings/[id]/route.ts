import { NextResponse } from "next/server";
import { getAuthUser, getOperatorForUser } from "@/lib/auth";
import { getBookingsForOperator, updateBookingStatus } from "@/lib/store";
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
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const operator = await getOperatorForUser(user.id);
  if (!operator) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as { status?: BookingStatus };
  if (!body.status || !ALLOWED.includes(body.status)) {
    return NextResponse.json({ error: "Status non valido" }, { status: 400 });
  }

  const owned = (await getBookingsForOperator(operator.id)).some((b) => b.id === id);
  if (!owned) {
    return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
  }

  const booking = await updateBookingStatus(id, body.status);
  if (!booking) {
    return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
  }
  return NextResponse.json({ booking });
}
