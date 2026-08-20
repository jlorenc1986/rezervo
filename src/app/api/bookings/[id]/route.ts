import { NextResponse } from "next/server";
import { getAuthUser, getOperatorForUser } from "@/lib/auth";
import {
  getBookingsForOperator,
  updateBooking,
  updateBookingStatus,
} from "@/lib/store";
import type { Booking, BookingStatus } from "@/lib/types";

const ALLOWED: BookingStatus[] = [
  "pending",
  "confirmed",
  "deposit_paid",
  "completed",
  "no_show",
  "cancelled",
];

type PatchBody = {
  status?: BookingStatus;
  date?: string;
  time?: string;
  guests?: number;
  guestName?: string;
  guestPhone?: string;
  notes?: string;
};

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
  const body = (await request.json()) as PatchBody;
  const hasStatus = body.status !== undefined;
  const hasFields =
    body.date !== undefined ||
    body.time !== undefined ||
    body.guests !== undefined ||
    body.guestName !== undefined ||
    body.guestPhone !== undefined ||
    body.notes !== undefined;

  if (!hasStatus && !hasFields) {
    return NextResponse.json({ error: "Nessun campo da aggiornare" }, { status: 400 });
  }
  if (hasStatus && (!body.status || !ALLOWED.includes(body.status))) {
    return NextResponse.json({ error: "Status non valido" }, { status: 400 });
  }

  const owned = (await getBookingsForOperator(operator.id)).some((b) => b.id === id);
  if (!owned) {
    return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
  }

  let booking: Booking | null = null;

  if (hasFields) {
    const result = await updateBooking(id, {
      date: body.date,
      time: body.time,
      guests: body.guests,
      guestName: body.guestName,
      guestPhone: body.guestPhone,
      notes: body.notes,
    });
    if (!result.ok) {
      const status = result.error.includes("Posti insufficienti") ? 409 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    booking = result.booking;
  }

  if (hasStatus && body.status) {
    booking = await updateBookingStatus(id, body.status);
    if (!booking) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
    }
  }

  return NextResponse.json({ booking });
}
