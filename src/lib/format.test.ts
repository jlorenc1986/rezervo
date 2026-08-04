import { describe, expect, it } from "vitest";
import {
  formatMoney,
  guestConfirmMessage,
  serviceLabel,
  statusLabel,
  whatsappLink,
} from "@/lib/format";
import type { Service } from "@/lib/types";

const service: Service = {
  id: "svc_ksamil_boat",
  operatorId: "op_blue_ionian",
  name: "Ksamil Islands boat trip",
  nameIt: "Gita in barca alle isole di Ksamil",
  nameSq: "Udhëtim me varkë në ishujt e Ksamilit",
  description: "Half day",
  durationMinutes: 300,
  capacity: 12,
  priceEur: 45,
  depositPercent: 30,
  meetingPoint: "Pier 2",
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  departures: ["09:30"],
};

describe("format helpers", () => {
  it("picks localized service labels", () => {
    expect(serviceLabel(service, "en")).toBe("Ksamil Islands boat trip");
    expect(serviceLabel(service, "it")).toBe(
      "Gita in barca alle isole di Ksamil",
    );
    expect(serviceLabel(service, "sq")).toContain("Ksamilit");
  });

  it("formats EUR money for IT locale", () => {
    expect(formatMoney(45)).toMatch(/45/);
    expect(formatMoney(45)).toMatch(/€|EUR/);
  });

  it("builds WhatsApp deep links with digits only", () => {
    expect(whatsappLink("+355 69 200 0111", "hello")).toBe(
      `https://wa.me/355692000111?text=${encodeURIComponent("hello")}`,
    );
  });

  it("returns status labels per locale", () => {
    expect(statusLabel("pending", "en")).toBe("Awaiting deposit");
    expect(statusLabel("deposit_paid", "it")).toBe("Deposito ok");
  });

  it("builds guest confirmation messages", () => {
    const msg = guestConfirmMessage({
      guestName: "Giulia",
      serviceName: "Boat",
      date: "2026-08-05",
      time: "09:30",
      code: "RZ-KSM-1000",
      depositEur: 27,
      meetingPoint: "Pier 2",
      locale: "en",
    });
    expect(msg).toContain("Giulia");
    expect(msg).toContain("RZ-KSM-1000");
    expect(msg).toContain("Pier 2");
  });
});
