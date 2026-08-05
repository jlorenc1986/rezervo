import Link from "next/link";
import { DepositSettingsForm } from "@/components/DepositSettingsForm";
import { requireOperator } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OpsSettingsPage() {
  const { operator } = await requireOperator();

  return (
    <main className="flex-1 mx-auto max-w-3xl px-6 py-10">
      <Link href="/ops" className="text-sm text-muted hover:text-ink">
        ← {operator.name}
      </Link>
      <h1 className="font-display text-4xl mt-4">Deposit & payment</h1>
      <p className="text-muted mt-2 mb-8">
        Shown to guests on the booking confirmation page for{" "}
        <Link href={`/book/${operator.slug}`} className="text-sea underline">
          /book/{operator.slug}
        </Link>
      </p>
      <DepositSettingsForm operator={operator} />
    </main>
  );
}
