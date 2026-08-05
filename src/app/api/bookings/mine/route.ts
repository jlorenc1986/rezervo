import { NextResponse } from "next/server";
import { getAuthUser, getOperatorForUser } from "@/lib/auth";
import { todayIso } from "@/lib/format";
import {
  applyNoShowCutoffForOperator,
  getBookingsForOperator,
  getService,
} from "@/lib/store";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const operator = await getOperatorForUser(user.id);
  if (!operator) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  const cutoffHours = Number(process.env.NO_SHOW_CUTOFF_HOURS ?? "12");
  await applyNoShowCutoffForOperator({
    operatorId: operator.id,
    today: todayIso(),
    cutoffHours: Number.isFinite(cutoffHours) ? cutoffHours : 12,
  });

  const bookings = await getBookingsForOperator(operator.id);
  const enriched = await Promise.all(
    bookings.map(async (b) => {
      const service = await getService(b.serviceId);
      return { ...b, serviceName: service?.name ?? b.serviceId };
    }),
  );

  return NextResponse.json({ operator, bookings: enriched });
}
