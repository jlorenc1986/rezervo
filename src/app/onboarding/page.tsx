import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/OnboardingForm";
import { getAuthUser, getOperatorForUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login?next=/onboarding");
  const existing = await getOperatorForUser(user.id);
  if (existing) redirect("/ops");

  return (
    <main className="flex-1 mx-auto max-w-xl px-6 py-12">
      <Link href="/" className="text-sm text-muted hover:text-ink">
        ← Rezervo
      </Link>
      <h1 className="font-display text-4xl mt-6">Set up your operator</h1>
      <p className="text-muted mt-2 mb-8">
        This creates your public booking link and WhatsApp contact details.
      </p>
      <OnboardingForm />
    </main>
  );
}
