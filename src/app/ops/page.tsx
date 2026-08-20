import { OpsDashboard } from "@/components/OpsDashboard";
import { requireOperator } from "@/lib/auth";
import { todayIso } from "@/lib/format";
import {
  getAvailability,
  getBookingsForOperator,
  getService,
  getServicesForOperator,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function OpsPage() {
  const { operator } = await requireOperator();

  const [bookings, services] = await Promise.all([
    getBookingsForOperator(operator.id),
    getServicesForOperator(operator.id),
  ]);
  const initialBookings = await Promise.all(
    bookings.map(async (b) => {
      const service = await getService(b.serviceId);
      return { ...b, serviceName: service?.name ?? b.serviceId };
    }),
  );
  const initialAvailability: Record<
    string,
    Awaited<ReturnType<typeof getAvailability>>
  > = {};
  for (const service of services) {
    initialAvailability[service.id] = await getAvailability(
      service.id,
      todayIso(),
      14,
    );
  }

  return (
    <main className="flex-1">
      <OpsDashboard
        operator={operator}
        initialBookings={initialBookings}
        services={services}
        initialAvailability={initialAvailability}
      />
    </main>
  );
}
