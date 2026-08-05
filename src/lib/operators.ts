import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { mapOperator, mapService } from "@/lib/db/mappers";
import { operators, services } from "@/lib/db/schema";
import { isValidSlug, normalizeSlug } from "@/lib/slug";
import type { Locale, Operator, Service } from "@/lib/types";

export type CreateOperatorInput = {
  authUserId: string;
  name: string;
  slug: string;
  city: string;
  whatsapp: string;
  phone?: string;
  tagline?: string;
  depositNote?: string;
  locale?: Locale;
};

export type CreateServiceInput = {
  operatorId: string;
  name: string;
  nameIt?: string;
  nameSq?: string;
  description?: string;
  durationMinutes: number;
  capacity: number;
  priceEur: number;
  depositPercent?: number;
  meetingPoint?: string;
  daysOfWeek: number[];
  departures: string[];
};

export async function createOperatorForUser(
  input: CreateOperatorInput,
): Promise<{ ok: true; operator: Operator } | { ok: false; error: string }> {
  const slug = normalizeSlug(input.slug);
  if (!isValidSlug(slug)) {
    return { ok: false, error: "Invalid slug (use lowercase letters, numbers, hyphens)" };
  }
  if (!input.name.trim() || !input.city.trim() || !input.whatsapp.trim()) {
    return { ok: false, error: "Name, city and WhatsApp are required" };
  }

  const db = getDb();
  const existingUser = await db
    .select()
    .from(operators)
    .where(eq(operators.authUserId, input.authUserId))
    .limit(1);
  if (existingUser[0]) {
    return { ok: false, error: "You already have an operator profile" };
  }

  const existingSlug = await db
    .select()
    .from(operators)
    .where(eq(operators.slug, slug))
    .limit(1);
  if (existingSlug[0]) {
    return { ok: false, error: "This booking link is already taken" };
  }

  const id = `op_${Date.now().toString(36)}`;
  const now = new Date();
  const inserted = await db
    .insert(operators)
    .values({
      id,
      authUserId: input.authUserId,
      slug,
      name: input.name.trim(),
      tagline: input.tagline?.trim() ?? "",
      city: input.city.trim(),
      whatsapp: input.whatsapp.replace(/\s+/g, ""),
      phone: (input.phone ?? input.whatsapp).trim(),
      currency: "EUR",
      locale: input.locale ?? "it",
      depositNote:
        input.depositNote?.trim() ||
        "Pay the deposit via Wise/Revolut or cash at the meeting point. Balance due on the day.",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return { ok: true, operator: mapOperator(inserted[0]) };
}

export async function createServiceForOperator(
  input: CreateServiceInput,
): Promise<{ ok: true; service: Service } | { ok: false; error: string }> {
  if (!input.name.trim()) return { ok: false, error: "Service name is required" };
  if (input.capacity < 1) return { ok: false, error: "Capacity must be at least 1" };
  if (input.priceEur < 0) return { ok: false, error: "Price must be >= 0" };
  if (!input.daysOfWeek.length || !input.departures.length) {
    return { ok: false, error: "Add at least one weekday and departure time" };
  }

  const db = getDb();
  const id = `svc_${Date.now().toString(36)}`;
  const name = input.name.trim();
  const inserted = await db
    .insert(services)
    .values({
      id,
      operatorId: input.operatorId,
      name,
      nameIt: (input.nameIt ?? name).trim(),
      nameSq: (input.nameSq ?? name).trim(),
      description: input.description?.trim() ?? "",
      durationMinutes: input.durationMinutes,
      capacity: input.capacity,
      priceEur: input.priceEur.toFixed(2),
      depositPercent: input.depositPercent ?? 30,
      meetingPoint: input.meetingPoint?.trim() ?? "",
      daysOfWeek: input.daysOfWeek,
      departures: input.departures,
    })
    .returning();

  return { ok: true, service: mapService(inserted[0]) };
}

export async function deleteServiceForOperator(
  serviceId: string,
  operatorId: string,
): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(services)
    .where(and(eq(services.id, serviceId), eq(services.operatorId, operatorId)))
    .returning();
  return deleted.length > 0;
}

export type UpdateDepositSettingsInput = {
  operatorId: string;
  depositNote?: string;
  depositIban?: string;
  depositRevolutLink?: string;
  depositWiseLink?: string;
};

export async function updateOperatorDepositSettings(
  input: UpdateDepositSettingsInput,
): Promise<Operator | null> {
  const db = getDb();
  const updated = await db
    .update(operators)
    .set({
      depositNote: input.depositNote?.trim() ?? "",
      depositIban: input.depositIban?.trim() ?? "",
      depositRevolutLink: input.depositRevolutLink?.trim() ?? "",
      depositWiseLink: input.depositWiseLink?.trim() ?? "",
      updatedAt: new Date(),
    })
    .where(eq(operators.id, input.operatorId))
    .returning();
  return updated[0] ? mapOperator(updated[0]) : null;
}
