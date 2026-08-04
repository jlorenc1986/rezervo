import { NextResponse } from "next/server";
import { getAuthUser, getOperatorForUser } from "@/lib/auth";
import {
  createServiceForOperator,
  deleteServiceForOperator,
} from "@/lib/operators";
import { getServicesForOperator } from "@/lib/store";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const operator = await getOperatorForUser(user.id);
  if (!operator) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }
  const list = await getServicesForOperator(operator.id);
  return NextResponse.json({ services: list });
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const operator = await getOperatorForUser(user.id);
  if (!operator) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    name?: string;
    nameIt?: string;
    nameSq?: string;
    description?: string;
    durationMinutes?: number;
    capacity?: number;
    priceEur?: number;
    depositPercent?: number;
    meetingPoint?: string;
    daysOfWeek?: number[];
    departures?: string[];
  };

  if (
    !body.name ||
    body.capacity == null ||
    body.priceEur == null ||
    body.durationMinutes == null ||
    !body.daysOfWeek?.length ||
    !body.departures?.length
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const created = await createServiceForOperator({
    operatorId: operator.id,
    name: body.name,
    nameIt: body.nameIt,
    nameSq: body.nameSq,
    description: body.description,
    durationMinutes: Number(body.durationMinutes),
    capacity: Number(body.capacity),
    priceEur: Number(body.priceEur),
    depositPercent: body.depositPercent,
    meetingPoint: body.meetingPoint,
    daysOfWeek: body.daysOfWeek,
    departures: body.departures,
  });

  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: 400 });
  }
  return NextResponse.json({ service: created.service }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const operator = await getOperatorForUser(user.id);
  if (!operator) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const ok = await deleteServiceForOperator(id, operator.id);
  if (!ok) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
