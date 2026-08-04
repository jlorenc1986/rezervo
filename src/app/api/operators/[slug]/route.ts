import { NextResponse } from "next/server";
import {
  getAvailability,
  getOperatorBySlug,
  getServicesForOperator,
} from "@/lib/store";
import { todayIso } from "@/lib/format";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const operator = await getOperatorBySlug(slug);
  if (!operator) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }
  const services = await getServicesForOperator(operator.id);
  const availability: Record<string, Awaited<ReturnType<typeof getAvailability>>> =
    {};
  for (const service of services) {
    availability[service.id] = await getAvailability(
      service.id,
      todayIso(),
      14,
    );
  }
  return NextResponse.json({ operator, services, availability });
}
