import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  POST as createBookingRoute,
  GET as listBookingsRoute,
} from "@/app/api/bookings/route";
import { PATCH as patchBookingRoute } from "@/app/api/bookings/[id]/route";
import { closeDb } from "@/lib/db/client";
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

  it("creates a booking via POST and updates status via PATCH", async () => {
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
    expect(created.booking.code).toMatch(/^RZ-GJK-/);

    const patchRes = await patchBookingRoute(
      new Request(`http://localhost/api/bookings/${created.booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      }),
      { params: Promise.resolve({ id: created.booking.id }) },
    );
    expect(patchRes.status).toBe(200);
    const patched = await patchRes.json();
    expect(patched.booking.status).toBe("confirmed");
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
