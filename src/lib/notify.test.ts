import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notifyOperatorNewBooking } from "@/lib/notify";
import type { Booking, Operator } from "@/lib/types";

const operator: Operator = {
  id: "op_test",
  authUserId: "user_1",
  slug: "test",
  name: "Test Tours",
  tagline: "",
  city: "Saranda",
  whatsapp: "355691111111",
  phone: "+355",
  currency: "EUR",
  locale: "it",
  depositNote: "",
  depositIban: "",
  depositRevolutLink: "",
  depositWiseLink: "",
  notificationEmail: "ops@example.com",
};

const booking: Booking = {
  id: "bk_1",
  code: "RZ-KSM-1000",
  operatorId: "op_test",
  serviceId: "svc_1",
  date: "2026-08-10",
  time: "09:30",
  guestName: "Giulia",
  guestPhone: "+39 333",
  guestLocale: "it",
  guests: 2,
  status: "pending",
  totalEur: 90,
  depositEur: 27,
  notes: "",
  source: "link",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("notifyOperatorNewBooking", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    delete process.env.RESEND_API_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("skips when no notification email", async () => {
    const result = await notifyOperatorNewBooking({
      operator: { ...operator, notificationEmail: "" },
      booking,
      serviceName: "Boat",
    });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("no-email");
  });

  it("skips when RESEND_API_KEY missing", async () => {
    const result = await notifyOperatorNewBooking({
      operator,
      booking,
      serviceName: "Boat",
    });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("no-resend-key");
  });

  it("sends via Resend when configured", async () => {
    process.env.RESEND_API_KEY = "test-key";
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "email_1" }), { status: 200 }),
    );

    const result = await notifyOperatorNewBooking({
      operator,
      booking,
      serviceName: "Boat",
      appOrigin: "https://rezervo.app",
    });

    expect(result.sent).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
