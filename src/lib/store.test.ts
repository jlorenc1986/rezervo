import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  createBooking,
  getAvailability,
  getBookingByCode,
  getOperatorBySlug,
  resetDemoStore,
  updateBookingStatus,
} from "@/lib/store";
import { DEMO_OPERATOR } from "@/lib/seed";

async function useTempStore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rezervo-"));
  process.env.REZERVO_DATA_DIR = dir;
  await resetDemoStore();
  return dir;
}

describe("booking store", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await useTempStore();
  });

  afterEach(async () => {
    delete process.env.REZERVO_DATA_DIR;
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
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

    const slotsAfter = await getAvailability(
      "svc_gjirokaster",
      open.date,
      1,
    );
    const after = slotsAfter.find((s) => s.time === open.time);
    expect(after?.remaining).toBe(remainingBefore);
  });
});

/** Next calendar date whose weekday matches `weekday` (0=Sun … 6=Sat). */
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
