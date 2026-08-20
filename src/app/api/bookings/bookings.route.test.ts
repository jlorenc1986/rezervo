import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  POST as createBookingRoute,
  GET as listBookingsRoute,
} from "@/app/api/bookings/route";
import { PATCH as patchBookingRoute } from "@/app/api/bookings/[id]/route";
import * as auth from "@/lib/auth";
import { closeDb } from "@/lib/db/client";
import { DEMO_OPERATOR } from "@/lib/seed";
import { getAvailability, resetDemoStore } from "@/lib/store";

function nextWeekday(weekday: number): string {
  const d = new Date();
  for (let i = 0; i < 14; i++) {
    const candidate = new Date(d);
    candidate.setDate(d.getDate() + i);
    if (candidate.getDay() === weekday) {
      const y = candidate.getFullYear();
      const m = String(candidate.getMonth() + 1).padStart(2, "0");
      const day = String(candidate.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }
  throw new Error("weekday not found");
}

function mockOpsAuth() {
  vi.spyOn(auth, "getAuthUser").mockResolvedValue({
    id: "user-ops",
  } as NonNullable<Awaited<ReturnType<typeof auth.getAuthUser>>>);
  vi.spyOn(auth, "getOperatorForUser").mockResolvedValue(DEMO_OPERATOR);
}

describe("bookings API", () => {
  beforeAll(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL required for API tests");
    }
  });

  beforeEach(async () => {
    await resetDemoStore();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await closeDb();
  });

  it("lists seeded bookings for the demo operator", async () => {
    const res = await listBookingsRoute(
      new Request("http://localhost/api/bookings?slug=blue-ionian"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.operator.slug).toBe("blue-ionian");
    expect(body.bookings.length).toBeGreaterThan(0);
  });

  it("rejects unauthenticated status updates", async () => {
    vi.spyOn(auth, "getAuthUser").mockResolvedValue(null);

    const slots = await getAvailability("svc_gjirokaster", nextWeekday(2), 1);
    const open = slots.find((s) => s.remaining > 0)!;

    const createRes = await createBookingRoute(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "blue-ionian",
          serviceId: "svc_gjirokaster",
          date: open.date,
          time: open.time,
          guestName: "API Guest",
          guestPhone: "+355691111111",
          guestLocale: "en",
          guests: 1,
        }),
      }),
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();

    const patchRes = await patchBookingRoute(
      new Request(`http://localhost/api/bookings/${created.booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      }),
      { params: Promise.resolve({ id: created.booking.id }) },
    );
    expect(patchRes.status).toBe(401);
  });

  it("edits booking fields when authenticated", async () => {
    mockOpsAuth();
    const slots = await getAvailability("svc_gjirokaster", nextWeekday(2), 1);
    const open = slots.find((s) => s.remaining > 1)!;

    const createRes = await createBookingRoute(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "blue-ionian",
          serviceId: "svc_gjirokaster",
          date: open.date,
          time: open.time,
          guestName: "API Guest",
          guestPhone: "+355691111111",
          guestLocale: "en",
          guests: 2,
        }),
      }),
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();

    const patchRes = await patchBookingRoute(
      new Request(`http://localhost/api/bookings/${created.booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guests: 1, guestPhone: "+355699999999" }),
      }),
      { params: Promise.resolve({ id: created.booking.id }) },
    );
    expect(patchRes.status).toBe(200);
    const body = await patchRes.json();
    expect(body.booking.guests).toBe(1);
    expect(body.booking.totalEur).toBe(55);
    expect(body.booking.guestPhone).toBe("+355699999999");
    expect(body.booking.status).toBe("pending");
  });

  it("returns 409 when editing onto a full slot", async () => {
    mockOpsAuth();
    const tue = await getAvailability("svc_gjirokaster", nextWeekday(2), 1);
    const thu = await getAvailability("svc_gjirokaster", nextWeekday(4), 1);
    const tueOpen = tue.find((s) => s.remaining > 0)!;
    const thuOpen = thu.find((s) => s.remaining > 0)!;

    await createBookingRoute(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "blue-ionian",
          serviceId: "svc_gjirokaster",
          date: tueOpen.date,
          time: tueOpen.time,
          guestName: "Fills Tuesday",
          guestPhone: "+355691000003",
          guestLocale: "en",
          guests: tueOpen.remaining,
        }),
      }),
    );

    const moverRes = await createBookingRoute(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "blue-ionian",
          serviceId: "svc_gjirokaster",
          date: thuOpen.date,
          time: thuOpen.time,
          guestName: "Thursday Guest",
          guestPhone: "+355691000004",
          guestLocale: "en",
          guests: 1,
        }),
      }),
    );
    const mover = await moverRes.json();

    const patchRes = await patchBookingRoute(
      new Request(`http://localhost/api/bookings/${mover.booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: tueOpen.date, time: tueOpen.time }),
      }),
      { params: Promise.resolve({ id: mover.booking.id }) },
    );
    expect(patchRes.status).toBe(409);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await createBookingRoute(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "blue-ionian" }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
