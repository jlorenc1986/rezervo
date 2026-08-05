"use client";

import { useState } from "react";
import Link from "next/link";
import type { Operator } from "@/lib/types";

export function DepositSettingsForm({ operator }: { operator: Operator }) {
  const [depositNote, setDepositNote] = useState(operator.depositNote);
  const [depositIban, setDepositIban] = useState(operator.depositIban);
  const [depositRevolutLink, setDepositRevolutLink] = useState(
    operator.depositRevolutLink,
  );
  const [depositWiseLink, setDepositWiseLink] = useState(operator.depositWiseLink);
  const [notificationEmail, setNotificationEmail] = useState(
    operator.notificationEmail,
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setLoading(true);
    try {
      const res = await fetch("/api/operators/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositNote,
          depositIban,
          depositRevolutLink,
          depositWiseLink,
          notificationEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save");
        return;
      }
      setSaved(true);
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-xl">
      <p className="text-muted text-sm leading-relaxed">
        Guests see these details on the confirmation page after booking. Add at
        least one payment method so they can pay without guessing.
      </p>

      <label className="block">
        <span className="text-sm text-muted">Deposit instructions</span>
        <textarea
          rows={3}
          value={depositNote}
          onChange={(e) => setDepositNote(e.target.value)}
          className="field mt-1"
          placeholder="Pay within 24h. Balance on the day."
        />
      </label>

      <label className="block">
        <span className="text-sm text-muted">IBAN (optional)</span>
        <input
          value={depositIban}
          onChange={(e) => setDepositIban(e.target.value)}
          className="field mt-1 font-mono text-sm"
          placeholder="AL47 2121 1010 0000 0002 3569 8741"
        />
      </label>

      <label className="block">
        <span className="text-sm text-muted">Revolut link or @handle (optional)</span>
        <input
          value={depositRevolutLink}
          onChange={(e) => setDepositRevolutLink(e.target.value)}
          className="field mt-1"
          placeholder="https://revolut.me/yourname or @yourname"
        />
      </label>

      <label className="block">
        <span className="text-sm text-muted">Email for new booking alerts</span>
        <input
          type="email"
          value={notificationEmail}
          onChange={(e) => setNotificationEmail(e.target.value)}
          className="field mt-1"
          placeholder="you@example.com"
        />
        <p className="mt-1 text-xs text-muted">
          Requires RESEND_API_KEY on the server. Dashboard also auto-refreshes every
          45s.
        </p>
      </label>

      <label className="block">
        <span className="text-sm text-muted">Wise link (optional)</span>
        <input
          value={depositWiseLink}
          onChange={(e) => setDepositWiseLink(e.target.value)}
          className="field mt-1"
          placeholder="https://wise.com/pay/me/..."
        />
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-ok">Saved. New bookings will show these details.</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-sea px-6 py-3 text-white font-medium disabled:opacity-40"
      >
        {loading ? "…" : "Save deposit settings"}
      </button>

      <Link href="/ops" className="text-sm text-sea hover:underline block">
        ← Back to dashboard
      </Link>
    </form>
  );
}
