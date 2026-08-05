import { describe, expect, it } from "vitest";
import { buildDepositInstructions, depositReminderMessage } from "@/lib/deposit";
import type { Operator } from "@/lib/types";

const operator: Operator = {
  id: "op_test",
  authUserId: "user_1",
  slug: "test-tours",
  name: "Test Tours",
  tagline: "",
  city: "Saranda",
  whatsapp: "355691111111",
  phone: "+355 69 111 1111",
  currency: "EUR",
  locale: "it",
  depositNote: "Pay within 24 hours.",
  depositIban: "AL47 2121 1010 0000 0002 3569 8741",
  depositRevolutLink: "https://revolut.me/test",
  depositWiseLink: "",
  notificationEmail: "",
};

describe("deposit helpers", () => {
  it("builds instructions with configured methods", () => {
    const instructions = buildDepositInstructions(operator, 27, "en");
    expect(instructions.amount).toMatch(/27/);
    expect(instructions.methods.length).toBe(2);
    expect(instructions.methods[0].label).toBe("IBAN");
    expect(instructions.methods[1].href).toContain("revolut");
  });

  it("shows empty hint when no payment methods", () => {
    const bare: Operator = {
      ...operator,
      depositIban: "",
      depositRevolutLink: "",
      depositWiseLink: "",
    };
    const instructions = buildDepositInstructions(bare, 10, "it");
    expect(instructions.methods.length).toBe(0);
    expect(instructions.emptyHint).toMatch(/WhatsApp/);
  });

  it("builds deposit reminder for WhatsApp", () => {
    const msg = depositReminderMessage({
      guestName: "Giulia",
      code: "RZ-KSM-1000",
      depositEur: 27,
      operator,
      locale: "it",
    });
    expect(msg).toContain("Giulia");
    expect(msg).toContain("RZ-KSM-1000");
    expect(msg).toContain("AL47");
  });
});
