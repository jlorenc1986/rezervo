import type {
  Booking,
  BookingStatus,
  Locale,
  Operator,
  Service,
} from "@/lib/types";
import type { InferSelectModel } from "drizzle-orm";
import { bookings, operators, services } from "./schema";

type OperatorRow = InferSelectModel<typeof operators>;
type ServiceRow = InferSelectModel<typeof services>;
type BookingRow = InferSelectModel<typeof bookings>;

export function mapOperator(row: OperatorRow): Operator {
  return {
    id: row.id,
    authUserId: row.authUserId,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    city: row.city,
    whatsapp: row.whatsapp,
    phone: row.phone,
    currency: row.currency,
    locale: row.locale,
    depositNote: row.depositNote,
  };
}

export function mapService(row: ServiceRow): Service {
  return {
    id: row.id,
    operatorId: row.operatorId,
    name: row.name,
    nameIt: row.nameIt,
    nameSq: row.nameSq,
    description: row.description,
    durationMinutes: row.durationMinutes,
    capacity: row.capacity,
    priceEur: Number(row.priceEur),
    depositPercent: row.depositPercent,
    meetingPoint: row.meetingPoint,
    daysOfWeek: row.daysOfWeek,
    departures: row.departures,
  };
}

export function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    code: row.code,
    operatorId: row.operatorId,
    serviceId: row.serviceId,
    date: row.date,
    time: row.time,
    guestName: row.guestName,
    guestPhone: row.guestPhone,
    guestLocale: row.guestLocale as Locale,
    guests: row.guests,
    status: row.status as BookingStatus,
    totalEur: Number(row.totalEur),
    depositEur: Number(row.depositEur),
    notes: row.notes,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
