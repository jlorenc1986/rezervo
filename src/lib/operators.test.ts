import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb } from "@/lib/db/client";
import {
  createOperatorForUser,
  createServiceForOperator,
} from "@/lib/operators";
import { getOperatorBySlug, getServicesForOperator, resetDemoStore } from "@/lib/store";

describe("operator onboarding store", () => {
  beforeAll(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL required");
    }
  });

  beforeEach(async () => {
    await resetDemoStore();
  });

  afterEach(async () => {
    await closeDb();
  });

  it("creates an operator linked to an auth user id", async () => {
    const suffix = Date.now().toString(36);
    const result = await createOperatorForUser({
      authUserId: `user_test_${suffix}`,
      name: "Ionian Waves",
      slug: `ionian-waves-${suffix}`,
      city: "Himare",
      whatsapp: "355691234567",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operator.authUserId).toBe(`user_test_${suffix}`);
    expect(result.operator.slug).toBe(`ionian-waves-${suffix}`);

    const loaded = await getOperatorBySlug(`ionian-waves-${suffix}`);
    expect(loaded?.name).toBe("Ionian Waves");
  });

  it("rejects duplicate slugs", async () => {
    const suffix = Date.now().toString(36);
    const slug = `shared-slug-${suffix}`;
    const first = await createOperatorForUser({
      authUserId: `user_a_${suffix}`,
      name: "A",
      slug,
      city: "Vlore",
      whatsapp: "355690000001",
    });
    expect(first.ok).toBe(true);

    const second = await createOperatorForUser({
      authUserId: `user_b_${suffix}`,
      name: "B",
      slug,
      city: "Vlore",
      whatsapp: "355690000002",
    });
    expect(second.ok).toBe(false);
  });

  it("adds a service under the operator", async () => {
    const suffix = Date.now().toString(36);
    const op = await createOperatorForUser({
      authUserId: `user_svc_${suffix}`,
      name: "Boat Co",
      slug: `boat-co-${suffix}`,
      city: "Saranda",
      whatsapp: "355690000003",
    });
    expect(op.ok).toBe(true);
    if (!op.ok) return;

    const service = await createServiceForOperator({
      operatorId: op.operator.id,
      name: "Sunset cruise",
      priceEur: 35,
      capacity: 10,
      durationMinutes: 120,
      daysOfWeek: [5, 6],
      departures: ["17:00"],
    });
    expect(service.ok).toBe(true);

    const list = await getServicesForOperator(op.operator.id);
    expect(list.some((s) => s.name === "Sunset cruise")).toBe(true);
  });
});
