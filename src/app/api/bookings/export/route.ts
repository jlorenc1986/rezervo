import { NextResponse } from "next/server";
import { getAuthUser, getOperatorForUser } from "@/lib/auth";
import { todayIso } from "@/lib/format";
import {
  applyNoShowCutoffForOperator,
  getBookingsForOperator,
  getService,
} from "@/lib/store";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isoFromDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function csvEscape(value: unknown) {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await getOperatorForUser(user.id);
  if (!operator) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const scopeRaw = searchParams.get("scope") ?? "today";
  const scope = scopeRaw === "month" ? "month" : "today";

  const today = todayIso();
  const cutoffHoursRaw = Number(process.env.NO_SHOW_CUTOFF_HOURS ?? "12");
  const cutoffHours = Number.isFinite(cutoffHoursRaw) ? cutoffHoursRaw : 12;

  // Keep capacity accurate: turn old pending/confirmed into no-show before export.
  await applyNoShowCutoffForOperator({
    operatorId: operator.id,
    today,
    cutoffHours,
  });

  const allBookings = await getBookingsForOperator(operator.id);

  const now = new Date();
  let fromDate = today;
  let toDate = today;
  if (scope === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    fromDate = isoFromDate(start);
    toDate = isoFromDate(end);
  }

  const filtered = allBookings
    .filter((b) => b.date >= fromDate && b.date <= toDate)
    .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));

  const enriched = await Promise.all(
    filtered.map(async (b) => {
      const service = await getService(b.serviceId);
      return { ...b, serviceName: service?.name ?? b.serviceId };
    }),
  );

  const header = [
    "code",
    "serviceName",
    "date",
    "time",
    "guestName",
    "guestPhone",
    "guests",
    "status",
    "totalEur",
    "depositEur",
  ].join(",");

  const rows = enriched.map((b) => {
    return [
      csvEscape(b.code),
      csvEscape(b.serviceName),
      csvEscape(b.date),
      csvEscape(b.time),
      csvEscape(b.guestName),
      csvEscape(b.guestPhone),
      csvEscape(b.guests),
      csvEscape(b.status),
      csvEscape(Number(b.totalEur).toFixed(2)),
      csvEscape(Number(b.depositEur).toFixed(2)),
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");

  const filename =
    scope === "today"
      ? `rezervo_bookings_${fromDate}.csv`
      : `rezervo_bookings_${fromDate.slice(0, 7)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  });
}

