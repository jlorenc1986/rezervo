import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { mapBooking, mapOperator, mapService } from "@/lib/db/mappers";
import { bookings, operators, services } from "@/lib/db/schema";
import { createSeedStore, DEMO_OPERATOR, DEMO_SERVICES } from "@/lib/seed";
import type {
  Booking,
  BookingStatus,
  Locale,
  Operator,
  Service,
  SlotAvailability,
} from "@/lib/types";

function activeStatusSql() {
  return sql`${bookings.status} in ('pending', 'confirmed', 'deposit_paid')`;
}

export async function getOperatorBySlug(
  slug: string,
): Promise<Operator | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(operators)
    .where(eq(operators.slug, slug))
    .limit(1);
  return rows[0] ? mapOperator(rows[0]) : undefined;
}

export async function getServicesForOperator(
  operatorId: string,
): Promise<Service[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(services)
    .where(eq(services.operatorId, operatorId));
  return rows.map(mapService);
}

export async function getService(id: string): Promise<Service | undefined> {
  const db = getDb();
  const rows = await db.select().from(services).where(eq(services.id, id)).limit(1);
  return rows[0] ? mapService(rows[0]) : undefined;
}

export async function getBookingsForOperator(
  operatorId: string,
): Promise<Booking[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(bookings)
    .where(eq(bookings.operatorId, operatorId))
    .orderBy(asc(bookings.date), asc(bookings.time));
  return rows.map(mapBooking);
}

export async function getBookingByCode(
  code: string,
): Promise<Booking | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(bookings)
    .where(sql`lower(${bookings.code}) = lower(${code})`)
    .limit(1);
  return rows[0] ? mapBooking(rows[0]) : undefined;
}

export async function getAvailability(
  serviceId: string,
  fromDate: string,
  days: number,
): Promise<SlotAvailability[]> {
  const db = getDb();
  const serviceRows = await db
    .select()
    .from(services)
    .where(eq(services.id, serviceId))
    .limit(1);
  if (!serviceRows[0]) return [];
  const service = mapService(serviceRows[0]);

  const endDate = addDays(fromDate, days - 1);
  const bookingRows = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.serviceId, serviceId),
        sql`${bookings.date} >= ${fromDate}`,
        sql`${bookings.date} <= ${endDate}`,
        activeStatusSql(),
      ),
    );

  const bookedBySlot = new Map<string, number>();
  for (const row of bookingRows) {
    const key = `${row.date}|${row.time}`;
    bookedBySlot.set(key, (bookedBySlot.get(key) ?? 0) + row.guests);
  }

  const slots: SlotAvailability[] = [];
  const start = parseDate(fromDate);

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (!service.daysOfWeek.includes(d.getDay())) continue;
    const date = formatDate(d);
    for (const time of service.departures) {
      const booked = bookedBySlot.get(`${date}|${time}`) ?? 0;
      slots.push({
        date,
        time,
        capacity: service.capacity,
        booked,
        remaining: Math.max(0, service.capacity - booked),
      });
    }
  }

  return slots;
}

export type CreateBookingInput = {
  operatorId: string;
  serviceId: string;
  date: string;
  time: string;
  guestName: string;
  guestPhone: string;
  guestLocale: Locale;
  guests: number;
  notes?: string;
  source?: Booking["source"];
};

export async function createBooking(
  input: CreateBookingInput,
): Promise<{ ok: true; booking: Booking } | { ok: false; error: string }> {
  const db = getDb();
  const service = await getService(input.serviceId);
  if (!service || service.operatorId !== input.operatorId) {
    return { ok: false, error: "Servizio non trovato" };
  }

  if (input.guests < 1 || input.guests > service.capacity) {
    return { ok: false, error: "Numero ospiti non valido" };
  }

  const slots = await getAvailability(input.serviceId, input.date, 1);
  const slot = slots.find((s) => s.time === input.time);
  if (!slot || slot.remaining < input.guests) {
    return { ok: false, error: "Posti insufficienti per questo orario" };
  }

  const totalEur = roundMoney(service.priceEur * input.guests);
  const depositEur = roundMoney((totalEur * service.depositPercent) / 100);
  const now = new Date();
  const bookingId = `bk_${Date.now().toString(36)}`;
  const code = makeCode(service);

  const inserted = await db
    .insert(bookings)
    .values({
      id: bookingId,
      code,
      operatorId: input.operatorId,
      serviceId: input.serviceId,
      date: input.date,
      time: input.time,
      guestName: input.guestName.trim(),
      guestPhone: input.guestPhone.trim(),
      guestLocale: input.guestLocale,
      guests: input.guests,
      status: "pending",
      totalEur: totalEur.toFixed(2),
      depositEur: depositEur.toFixed(2),
      notes: input.notes?.trim() ?? "",
      source: input.source ?? "link",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return { ok: true, booking: mapBooking(inserted[0]) };
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<Booking | null> {
  const db = getDb();
  const updated = await db
    .update(bookings)
    .set({ status, updatedAt: new Date() })
    .where(eq(bookings.id, id))
    .returning();
  return updated[0] ? mapBooking(updated[0]) : null;
}

export async function resetDemoStore(): Promise<{
  operators: number;
  services: number;
  bookings: number;
}> {
  const db = getDb();
  const seed = createSeedStore();

  await db.delete(bookings).where(eq(bookings.operatorId, DEMO_OPERATOR.id));
  await db.delete(services).where(eq(services.operatorId, DEMO_OPERATOR.id));
  await db.delete(operators).where(eq(operators.id, DEMO_OPERATOR.id));

  await db.insert(operators).values({
    id: DEMO_OPERATOR.id,
    authUserId: null,
    slug: DEMO_OPERATOR.slug,
    name: DEMO_OPERATOR.name,
    tagline: DEMO_OPERATOR.tagline,
    city: DEMO_OPERATOR.city,
    whatsapp: DEMO_OPERATOR.whatsapp,
    phone: DEMO_OPERATOR.phone,
    currency: DEMO_OPERATOR.currency,
    locale: DEMO_OPERATOR.locale,
    depositNote: DEMO_OPERATOR.depositNote,
    depositIban: DEMO_OPERATOR.depositIban,
    depositRevolutLink: DEMO_OPERATOR.depositRevolutLink,
    depositWiseLink: DEMO_OPERATOR.depositWiseLink,
  });

  await db.insert(services).values(
    DEMO_SERVICES.map((s) => ({
      id: s.id,
      operatorId: s.operatorId,
      name: s.name,
      nameIt: s.nameIt,
      nameSq: s.nameSq,
      description: s.description,
      durationMinutes: s.durationMinutes,
      capacity: s.capacity,
      priceEur: s.priceEur.toFixed(2),
      depositPercent: s.depositPercent,
      meetingPoint: s.meetingPoint,
      daysOfWeek: s.daysOfWeek,
      departures: s.departures,
    })),
  );

  await db.insert(bookings).values(
    seed.bookings.map((b) => ({
      id: b.id,
      code: b.code,
      operatorId: b.operatorId,
      serviceId: b.serviceId,
      date: b.date,
      time: b.time,
      guestName: b.guestName,
      guestPhone: b.guestPhone,
      guestLocale: b.guestLocale,
      guests: b.guests,
      status: b.status,
      totalEur: b.totalEur.toFixed(2),
      depositEur: b.depositEur.toFixed(2),
      notes: b.notes,
      source: b.source,
      createdAt: new Date(b.createdAt),
      updatedAt: new Date(b.updatedAt),
    })),
  );

  return {
    operators: 1,
    services: DEMO_SERVICES.length,
    bookings: seed.bookings.length,
  };
}

export async function ensureSeeded(): Promise<void> {
  const existing = await getOperatorBySlug(DEMO_OPERATOR.slug);
  if (!existing) {
    await resetDemoStore();
  }
}

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function makeCode(service: Service): string {
  const prefix = service.id.includes("ksamil")
    ? "KSM"
    : service.id.includes("tirana")
      ? "TIA"
      : service.id.includes("gjirokaster")
        ? "GJK"
        : "RZ";
  const n = Math.floor(1000 + Math.random() * 9000);
  return `RZ-${prefix}-${n}`;
}
