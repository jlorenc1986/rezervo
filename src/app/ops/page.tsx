import { notFound } from "next/navigation";
import { OpsDashboard } from "@/components/OpsDashboard";
import {
  ensureSeeded,
  getBookingsForOperator,
  getOperatorBySlug,
  getService,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function OpsPage() {
  await ensureSeeded();
  const operator = await getOperatorBySlug("blue-ionian");
  if (!operator) notFound();

  const bookings = await getBookingsForOperator(operator.id);
  const initialBookings = await Promise.all(
    bookings.map(async (b) => {
      const service = await getService(b.serviceId);
      return { ...b, serviceName: service?.name ?? b.serviceId };
    }),
  );

  return (
    <main className="flex-1">
      <OpsDashboard operator={operator} initialBookings={initialBookings} />
    </main>
  );
}
