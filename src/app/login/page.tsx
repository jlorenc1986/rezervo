import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="flex-1 mx-auto max-w-lg px-6 py-12">
      <Link href="/" className="text-sm text-muted hover:text-ink">
        ← Rezervo
      </Link>
      <h1 className="font-display text-4xl mt-6">Operator sign in</h1>
      <p className="text-muted mt-2 mb-8">
        Access your bookings dashboard and booking link.
      </p>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </main>
  );
}
