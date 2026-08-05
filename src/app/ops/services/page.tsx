import Link from "next/link";
import { ServicesManager } from "@/components/ServicesManager";
import { requireOperator } from "@/lib/auth";
import { getServicesForOperator } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function OpsServicesPage() {
  const { operator } = await requireOperator();
  const services = await getServicesForOperator(operator.id);

  return (
    <main className="flex-1 mx-auto max-w-3xl px-6 py-10">
      <Link href="/ops" className="text-sm text-muted hover:text-ink">
        ← {operator.name}
      </Link>
      <h1 className="font-display text-4xl mt-4">Services</h1>
      <p className="text-muted mt-2 mb-8">
        Tours, transfers and boat trips guests can book on{" "}
        <Link href={`/book/${operator.slug}`} className="text-sea underline">
          /book/{operator.slug}
        </Link>
      </p>
      <ServicesManager initialServices={services} />
    </main>
  );
}
