import { NextResponse } from "next/server";
import { getAuthUser, getOperatorForUser } from "@/lib/auth";
import {
  createOperatorForUser,
  createServiceForOperator,
  updateOperatorDepositSettings,
} from "@/lib/operators";
import type { Locale } from "@/lib/types";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const operator = await getOperatorForUser(user.id);
  if (!operator) {
    return NextResponse.json({ operator: null });
  }
  return NextResponse.json({ operator });
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    slug?: string;
    city?: string;
    whatsapp?: string;
    phone?: string;
    tagline?: string;
    depositNote?: string;
    locale?: Locale;
    firstService?: {
      name: string;
      priceEur: number;
      capacity: number;
      durationMinutes?: number;
      daysOfWeek?: number[];
      departures?: string[];
      meetingPoint?: string;
      depositPercent?: number;
    };
  };

  if (!body.name || !body.slug || !body.city || !body.whatsapp) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const created = await createOperatorForUser({
    authUserId: user.id,
    name: body.name,
    slug: body.slug,
    city: body.city,
    whatsapp: body.whatsapp,
    phone: body.phone,
    tagline: body.tagline,
    depositNote: body.depositNote,
    locale: body.locale,
  });

  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: 409 });
  }

  if (body.firstService?.name) {
    await createServiceForOperator({
      operatorId: created.operator.id,
      name: body.firstService.name,
      priceEur: Number(body.firstService.priceEur),
      capacity: Number(body.firstService.capacity),
      durationMinutes: body.firstService.durationMinutes ?? 180,
      daysOfWeek: body.firstService.daysOfWeek ?? [1, 2, 3, 4, 5, 6, 0],
      departures: body.firstService.departures ?? ["09:30"],
      meetingPoint: body.firstService.meetingPoint,
      depositPercent: body.firstService.depositPercent,
    });
  }

  return NextResponse.json({ operator: created.operator }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const operator = await getOperatorForUser(user.id);
  if (!operator) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    depositNote?: string;
    depositIban?: string;
    depositRevolutLink?: string;
    depositWiseLink?: string;
  };

  const updated = await updateOperatorDepositSettings({
    operatorId: operator.id,
    depositNote: body.depositNote,
    depositIban: body.depositIban,
    depositRevolutLink: body.depositRevolutLink,
    depositWiseLink: body.depositWiseLink,
  });

  if (!updated) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ operator: updated });
}
