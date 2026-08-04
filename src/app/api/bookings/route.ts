import { NextResponse } from "next/server";
import {
  createBooking,
  getBookingsForOperator,
  getOperatorBySlug,
  getService,
} from "@/lib/store";
import type { Locale } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? "blue-ionian";
  const operator = await getOperatorBySlug(slug);
  if (!operator) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }
  const bookings = await getBookingsForOperator(operator.id);
  const enriched = await Promise.all(
    bookings.map(async (b) => {
      const service = await getService(b.serviceId);
      return { ...b, serviceName: service?.name ?? b.serviceId };
    }),
  );
  return NextResponse.json({ operator, bookings: enriched });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    slug?: string;
    serviceId?: string;
    date?: string;
    time?: string;
    guestName?: string;
    guestPhone?: string;
    guestLocale?: Locale;
    guests?: number;
    notes?: string;
    source?: "link" | "ops" | "whatsapp";
  };

  const slug = body.slug ?? "blue-ionian";
  const operator = await getOperatorBySlug(slug);
  if (!operator) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  if (
    !body.serviceId ||
    !body.date ||
    !body.time ||
    !body.guestName ||
    !body.guestPhone ||
    !body.guests
  ) {
    return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 });
  }

  const result = await createBooking({
    operatorId: operator.id,
    serviceId: body.serviceId,
    date: body.date,
    time: body.time,
    guestName: body.guestName,
    guestPhone: body.guestPhone,
    guestLocale: body.guestLocale ?? "it",
    guests: Number(body.guests),
    notes: body.notes,
    source: body.source ?? "link",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ booking: result.booking }, { status: 201 });
}
