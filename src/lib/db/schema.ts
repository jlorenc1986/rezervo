import {
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const localeEnum = pgEnum("locale", ["en", "it", "sq"]);
export const currencyEnum = pgEnum("currency", ["EUR", "ALL"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "deposit_paid",
  "completed",
  "no_show",
  "cancelled",
]);
export const bookingSourceEnum = pgEnum("booking_source", [
  "link",
  "ops",
  "whatsapp",
]);

export const operators = pgTable("operators", {
  id: text("id").primaryKey(),
  authUserId: text("auth_user_id").unique(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  city: text("city").notNull(),
  whatsapp: text("whatsapp").notNull(),
  phone: text("phone").notNull(),
  currency: currencyEnum("currency").notNull().default("EUR"),
  locale: localeEnum("locale").notNull().default("it"),
  depositNote: text("deposit_note").notNull().default(""),
  depositIban: text("deposit_iban").notNull().default(""),
  depositRevolutLink: text("deposit_revolut_link").notNull().default(""),
  depositWiseLink: text("deposit_wise_link").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const services = pgTable("services", {
  id: text("id").primaryKey(),
  operatorId: text("operator_id")
    .notNull()
    .references(() => operators.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  nameIt: text("name_it").notNull(),
  nameSq: text("name_sq").notNull(),
  description: text("description").notNull().default(""),
  durationMinutes: integer("duration_minutes").notNull(),
  capacity: integer("capacity").notNull(),
  priceEur: numeric("price_eur", { precision: 10, scale: 2 }).notNull(),
  depositPercent: integer("deposit_percent").notNull().default(30),
  meetingPoint: text("meeting_point").notNull().default(""),
  daysOfWeek: jsonb("days_of_week").$type<number[]>().notNull(),
  departures: jsonb("departures").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  operatorId: text("operator_id")
    .notNull()
    .references(() => operators.id, { onDelete: "cascade" }),
  serviceId: text("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "restrict" }),
  date: text("date").notNull(),
  time: text("time").notNull(),
  guestName: text("guest_name").notNull(),
  guestPhone: text("guest_phone").notNull(),
  guestLocale: localeEnum("guest_locale").notNull().default("it"),
  guests: integer("guests").notNull(),
  status: bookingStatusEnum("status").notNull().default("pending"),
  totalEur: numeric("total_eur", { precision: 10, scale: 2 }).notNull(),
  depositEur: numeric("deposit_eur", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes").notNull().default(""),
  source: bookingSourceEnum("source").notNull().default("link"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
