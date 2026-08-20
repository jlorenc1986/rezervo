import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import {
  createBooking,
  applyNoShowCutoffForOperator,
  getAvailability,
  getBookingByCode,
  getOperatorBySlug,
  resetDemoStore,
  updateBooking,
  updateBookingStatus,
} from "@/lib/store";
import { DEMO_OPERATOR } from "@/lib/seed";
import { todayIso } from "@/lib/format";
import { bookings } from "@/lib/db/schema";

describe("booking store", () => {
  beforeAll(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL required for store tests (docker compose up -d)",
      );
    }
  });

  beforeEach(async () => {
    await resetDemoStore();
  });

  afterEach(async () => {
    await closeDb();
  });

  it("loads the demo operator by slug", async () => {
    const operator = await getOperatorBySlug("blue-ionian");
    expect(operator?.name).toBe(DEMO_OPERATOR.name);
  });

  it("creates a booking when capacity remains", async () => {
    const slots = await getAvailability("svc_gjirokaster", nextWeekday(2), 1);
    const open = slots.find((s) => s.remaining > 0);
    expect(open).toBeTruthy();

    const result = await createBooking({
      operatorId: DEMO_OPERATOR.id,
      serviceId: "svc_gjirokaster",
      date: open!.date,
      time: open!.time,
      guestName: "Test Guest",
      guestPhone: "+39 333 1112233",
      guestLocale: "en",
      guests: 2,
      source: "link",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.booking.status).toBe("pending");
    expect(result.booking.totalEur).toBe(110);
    expect(result.booking.depositEur).toBe(33);
    expect(result.booking.code).toMatch(/^RZ-GJK-\d{4}$/);

    const found = await getBookingByCode(result.booking.code);
    expect(found?.guestName).toBe("Test Guest");
  });

  it("rejects overbooking on a full slot", async () => {
    const slots = await getAvailability("svc_gjirokaster", nextWeekday(2), 1);
    const open = slots.find((s) => s.remaining > 0);
    expect(open).toBeTruthy();

    const first = await createBooking({
      operatorId: DEMO_OPERATOR.id,
      serviceId: "svc_gjirokaster",
      date: open!.date,
      time: open!.time,
      guestName: "Full Boat",
      guestPhone: "+355 69 0000001",
      guestLocale: "en",
      guests: open!.remaining,
    });
    expect(first.ok).toBe(true);

    const second = await createBooking({
      operatorId: DEMO_OPERATOR.id,
      serviceId: "svc_gjirokaster",
      date: open!.date,
      time: open!.time,
      guestName: "Too Late",
      guestPhone: "+355 69 0000002",
      guestLocale: "en",
      guests: 1,
    });

    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error).toMatch(/Posti insufficienti/);
  });

  it("updates booking status", async () => {
    const slots = await getAvailability("svc_gjirokaster", nextWeekday(2), 1);
    const open = slots.find((s) => s.remaining > 0)!;

    const created = await createBooking({
      operatorId: DEMO_OPERATOR.id,
      serviceId: "svc_gjirokaster",
      date: open.date,
      time: open.time,
      guestName: "Pay Later",
      guestPhone: "+39 340 0000000",
      guestLocale: "it",
      guests: 1,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = await updateBookingStatus(
      created.booking.id,
      "deposit_paid",
    );
    expect(updated?.status).toBe("deposit_paid");
  });

  it("frees capacity after cancellation", async () => {
    const slotsBefore = await getAvailability(
      "svc_gjirokaster",
      nextWeekday(2),
      1,
    );
    const open = slotsBefore.find((s) => s.remaining > 0)!;
    const remainingBefore = open.remaining;

    const created = await createBooking({
      operatorId: DEMO_OPERATOR.id,
      serviceId: "svc_gjirokaster",
      date: open.date,
      time: open.time,
      guestName: "Cancel Me",
      guestPhone: "+39 340 1111111",
      guestLocale: "it",
      guests: 2,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await updateBookingStatus(created.booking.id, "cancelled");

    const slotsAfter = await getAvailability("svc_gjirokaster", open.date, 1);
    const after = slotsAfter.find((s) => s.time === open.time);
    expect(after?.remaining).toBe(remainingBefore);
  });

  it("edits guests and recalculates totals", async () => {
    const slots = await getAvailability("svc_gjirokaster", nextWeekday(2), 1);
    const open = slots.find((s) => s.remaining > 1)!;
    const created = await createBooking({
      operatorId: DEMO_OPERATOR.id,
      serviceId: "svc_gjirokaster",
      date: open.date,
      time: open.time,
      guestName: "Edit Me",
      guestPhone: "+39 340 2222222",
      guestLocale: "it",
      guests: 2,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = await updateBooking(created.booking.id, {
      guests: 1,
      guestPhone: "+39 340 9999999",
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.booking.guests).toBe(1);
    expect(updated.booking.totalEur).toBe(55);
    expect(updated.booking.depositEur).toBe(16.5);
    expect(updated.booking.guestPhone).toBe("+39 340 9999999");
    expect(updated.booking.code).toBe(created.booking.code);
    expect(updated.booking.status).toBe("pending");
  });

  it("rejects moving onto a full slot", async () => {
    const tue = await getAvailability("svc_gjirokaster", nextWeekday(2), 1);
    const thu = await getAvailability("svc_gjirokaster", nextWeekday(4), 1);
    const tueOpen = tue.find((s) => s.remaining > 0)!;
    const thuOpen = thu.find((s) => s.remaining > 0)!;

    const filler = await createBooking({
      operatorId: DEMO_OPERATOR.id,
      serviceId: "svc_gjirokaster",
      date: tueOpen.date,
      time: tueOpen.time,
      guestName: "Fills Tuesday",
      guestPhone: "+355 69 0000003",
      guestLocale: "en",
      guests: tueOpen.remaining,
    });
    expect(filler.ok).toBe(true);

    const mover = await createBooking({
      operatorId: DEMO_OPERATOR.id,
      serviceId: "svc_gjirokaster",
      date: thuOpen.date,
      time: thuOpen.time,
      guestName: "Thursday Guest",
      guestPhone: "+355 69 0000004",
      guestLocale: "en",
      guests: 1,
    });
    expect(mover.ok).toBe(true);
    if (!mover.ok) return;

    const moved = await updateBooking(mover.booking.id, {
      date: tueOpen.date,
      time: tueOpen.time,
    });
    expect(moved.ok).toBe(false);
    if (moved.ok) return;
    expect(moved.error).toMatch(/Posti insufficienti/);
  });

  it("cancels stale pending bookings on any date after cutoff", async () => {
    const future = nextWeekday(2);
    const cutoffHours = 12;
    const old = new Date(Date.now() - (cutoffHours + 1) * 3600_000);

    const pendingId = `bk_cutoff_pending_${Date.now()}`;
    const confirmedId = `bk_cutoff_confirmed_${Date.now()}`;
    const depositPaidId = `bk_cutoff_deposit_${Date.now()}`;

    const db = getDb();
    await db.insert(bookings).values([
      {
        id: pendingId,
        code: `RZ-CUT-P-${Date.now()}`,
        operatorId: DEMO_OPERATOR.id,
        serviceId: "svc_gjirokaster",
        date: future,
        time: "07:45",
        guestName: "Old pending",
        guestPhone: "+355 69 123 4567",
        guestLocale: "en",
        guests: 1,
        status: "pending",
        totalEur: "100.00",
        depositEur: "30.00",
        notes: "",
        source: "link",
        createdAt: old,
        updatedAt: old,
      },
      {
        id: confirmedId,
        code: `RZ-CUT-C-${Date.now()}`,
        operatorId: DEMO_OPERATOR.id,
        serviceId: "svc_gjirokaster",
        date: future,
        time: "07:45",
        guestName: "Old confirmed",
        guestPhone: "+355 69 123 4568",
        guestLocale: "en",
        guests: 1,
        status: "confirmed",
        totalEur: "100.00",
        depositEur: "30.00",
        notes: "",
        source: "link",
        createdAt: old,
        updatedAt: old,
      },
      {
        id: depositPaidId,
        code: `RZ-CUT-D-${Date.now()}`,
        operatorId: DEMO_OPERATOR.id,
        serviceId: "svc_gjirokaster",
        date: todayIso(),
        time: "07:45",
        guestName: "Old deposit_paid",
        guestPhone: "+355 69 999 4567",
        guestLocale: "en",
        guests: 1,
        status: "deposit_paid",
        totalEur: "120.00",
        depositEur: "36.00",
        notes: "",
        source: "link",
        createdAt: old,
        updatedAt: old,
      },
    ]);

    await applyNoShowCutoffForOperator({
      operatorId: DEMO_OPERATOR.id,
      cutoffHours,
    });

    const [pendingRow, confirmedRow, depositPaidRow] = await Promise.all([
      db.select().from(bookings).where(eq(bookings.id, pendingId)).limit(1),
      db.select().from(bookings).where(eq(bookings.id, confirmedId)).limit(1),
      db.select().from(bookings).where(eq(bookings.id, depositPaidId)).limit(1),
    ]);

    expect(pendingRow[0]?.status).toBe("cancelled");
    expect(confirmedRow[0]?.status).toBe("confirmed");
    expect(depositPaidRow[0]?.status).toBe("deposit_paid");
  });
});

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
