import { promises as fs } from "fs";
import path from "path";
import { createSeedStore } from "./seed";
import type {
  Booking,
  BookingStatus,
  Locale,
  Operator,
  Service,
  SlotAvailability,
  StoreData,
} from "./types";

function dataDir(): string {
  return process.env.REZERVO_DATA_DIR
    ? path.resolve(process.env.REZERVO_DATA_DIR)
    : path.join(process.cwd(), "data");
}

function storePath(): string {
  return path.join(dataDir(), "store.json");
}

async function ensureStore(): Promise<StoreData> {
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    return JSON.parse(raw) as StoreData;
  } catch {
    const seed = createSeedStore();
    await fs.mkdir(dataDir(), { recursive: true });
    await fs.writeFile(storePath(), JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
}

async function writeStore(data: StoreData): Promise<void> {
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(storePath(), JSON.stringify(data, null, 2), "utf8");
}

export async function getStore(): Promise<StoreData> {
  return ensureStore();
}

export async function getOperatorBySlug(
  slug: string,
): Promise<Operator | undefined> {
  const store = await ensureStore();
  return store.operators.find((o) => o.slug === slug);
}

export async function getServicesForOperator(
  operatorId: string,
): Promise<Service[]> {
  const store = await ensureStore();
  return store.services.filter((s) => s.operatorId === operatorId);
}

export async function getService(id: string): Promise<Service | undefined> {
  const store = await ensureStore();
  return store.services.find((s) => s.id === id);
}

export async function getBookingsForOperator(
  operatorId: string,
): Promise<Booking[]> {
  const store = await ensureStore();
  return store.bookings
    .filter((b) => b.operatorId === operatorId)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

export async function getBookingByCode(
  code: string,
): Promise<Booking | undefined> {
  const store = await ensureStore();
  return store.bookings.find(
    (b) => b.code.toLowerCase() === code.toLowerCase(),
  );
}

function activeGuests(status: BookingStatus): boolean {
  return (
    status === "pending" ||
    status === "confirmed" ||
    status === "deposit_paid" ||
    status === "completed"
  );
}

export async function getAvailability(
  serviceId: string,
  fromDate: string,
  days: number,
): Promise<SlotAvailability[]> {
  const store = await ensureStore();
  const service = store.services.find((s) => s.id === serviceId);
  if (!service) return [];

  const slots: SlotAvailability[] = [];
  const start = parseDate(fromDate);

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const weekday = d.getDay();
    if (!service.daysOfWeek.includes(weekday)) continue;

    const date = formatDate(d);
    for (const time of service.departures) {
      const booked = store.bookings
        .filter(
          (b) =>
            b.serviceId === serviceId &&
            b.date === date &&
            b.time === time &&
            activeGuests(b.status) &&
            b.status !== "completed",
        )
        .reduce((sum, b) => sum + b.guests, 0);

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
  const store = await ensureStore();
  const service = store.services.find((s) => s.id === input.serviceId);
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
  const depositEur = roundMoney(
    (totalEur * service.depositPercent) / 100,
  );
  const now = new Date().toISOString();
  const booking: Booking = {
    id: `bk_${Date.now().toString(36)}`,
    code: makeCode(service),
    operatorId: input.operatorId,
    serviceId: input.serviceId,
    date: input.date,
    time: input.time,
    guestName: input.guestName.trim(),
    guestPhone: input.guestPhone.trim(),
    guestLocale: input.guestLocale,
    guests: input.guests,
    status: "pending",
    totalEur,
    depositEur,
    notes: input.notes?.trim() ?? "",
    source: input.source ?? "link",
    createdAt: now,
    updatedAt: now,
  };

  store.bookings.push(booking);
  await writeStore(store);
  return { ok: true, booking };
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<Booking | null> {
  const store = await ensureStore();
  const booking = store.bookings.find((b) => b.id === id);
  if (!booking) return null;
  booking.status = status;
  booking.updatedAt = new Date().toISOString();
  await writeStore(store);
  return booking;
}

export async function resetDemoStore(): Promise<StoreData> {
  const seed = createSeedStore();
  await writeStore(seed);
  return seed;
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

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function makeCode(service: Service): string {
  const prefix =
    service.id.includes("ksamil")
      ? "KSM"
      : service.id.includes("tirana")
        ? "TIA"
        : service.id.includes("gjirokaster")
          ? "GJK"
          : "RZ";
  const n = Math.floor(1000 + Math.random() * 9000);
  return `RZ-${prefix}-${n}`;
}
