import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/BookingForm";
import { todayIso } from "@/lib/format";
import {
  ensureSeeded,
  getAvailability,
  getOperatorBySlug,
  getServicesForOperator,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await ensureSeeded();
  const { slug } = await params;
  const operator = await getOperatorBySlug(slug);
  if (!operator) notFound();

  const services = await getServicesForOperator(operator.id);
  const availability: Record<
    string,
    Awaited<ReturnType<typeof getAvailability>>
  > = {};
  for (const service of services) {
    availability[service.id] = await getAvailability(
      service.id,
      todayIso(),
      14,
    );
  }

  return (
    <main className="flex-1">
      <div className="sea-hero text-foam">
        <div className="mx-auto max-w-xl px-6 py-10">
          <Link href="/" className="text-sm text-foam/70 hover:text-white">
            ← Rezervo
          </Link>
          <p className="mt-6 font-display text-4xl text-white">{operator.name}</p>
          <p className="mt-2 text-foam/85">{operator.tagline}</p>
          <p className="mt-1 text-sm text-foam/60">{operator.city}</p>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-6 py-10">
        <BookingForm
          operator={operator}
          services={services}
          availability={availability}
        />
        <p className="mt-8 text-sm text-muted leading-relaxed">
          {operator.depositNote}
        </p>
      </div>
    </main>
  );
}
