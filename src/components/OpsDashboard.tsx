"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { Booking, BookingStatus, Operator } from "@/lib/types";
import {
  formatDateLabel,
  formatMoney,
  statusLabel,
  todayIso,
  whatsappLink,
} from "@/lib/format";

export type EnrichedBooking = Booking & { serviceName: string };

type Props = {
  operator: Operator;
  initialBookings: EnrichedBooking[];
};

const STATUS_ACTIONS: { status: BookingStatus; label: string }[] = [
  { status: "confirmed", label: "Conferma" },
  { status: "deposit_paid", label: "Deposito ok" },
  { status: "completed", label: "Completata" },
  { status: "no_show", label: "No-show" },
  { status: "cancelled", label: "Cancella" },
];

function tone(status: BookingStatus) {
  switch (status) {
    case "deposit_paid":
    case "completed":
      return "bg-ok/10 text-ok border-ok/20";
    case "confirmed":
      return "bg-accent/10 text-sea border-accent/25";
    case "pending":
      return "bg-warn/10 text-warn border-warn/25";
    case "no_show":
    case "cancelled":
      return "bg-danger/10 text-danger border-danger/20";
    default:
      return "bg-sand text-muted border-line";
  }
}

export function OpsDashboard({ operator, initialBookings }: Props) {
  const [bookings, setBookings] = useState(initialBookings);
  const [filter, setFilter] = useState<"today" | "all" | "pending">("today");
  const [shareCopied, setShareCopied] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/bookings?slug=${operator.slug}`);
    const data = await res.json();
    setBookings(data.bookings);
  }, [operator.slug]);

  const today = todayIso();

  const visible = useMemo(() => {
    if (filter === "today") return bookings.filter((b) => b.date === today);
    if (filter === "pending")
      return bookings.filter(
        (b) => b.status === "pending" || b.status === "confirmed",
      );
    return bookings;
  }, [bookings, filter, today]);

  const stats = useMemo(() => {
    const todays = bookings.filter((b) => b.date === today);
    const guests = todays
      .filter((b) => !["cancelled", "no_show"].includes(b.status))
      .reduce((n, b) => n + b.guests, 0);
    const pendingPay = bookings.filter((b) => b.status === "pending").length;
    const deposits = bookings.filter((b) => b.status === "deposit_paid").length;
    return { todays: todays.length, guests, pendingPay, deposits };
  }, [bookings, today]);

  async function setStatus(id: string, status: BookingStatus) {
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await reload();
  }

  async function resetDemo() {
    await fetch("/api/demo/reset", { method: "POST" });
    await reload();
  }

  async function copyBookingLink() {
    const url = `${window.location.origin}/book/${operator.slug}`;
    await navigator.clipboard.writeText(url);
    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 2000);
  }

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://rezervo.app";
  const waShare = whatsappLink(
    operator.whatsapp,
    `Prenota online con ${operator.name}: ${origin}/book/${operator.slug}`,
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-ink">
            ← Rezervo
          </Link>
          <h1 className="font-display text-3xl md:text-4xl mt-3">
            {operator.name}
          </h1>
          <p className="text-muted mt-1">Ops · {operator.city}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyBookingLink()}
            className="rounded-full border border-line px-4 py-2 text-sm hover:border-sea/40"
          >
            {shareCopied ? "Link copiato" : "Copia link booking"}
          </button>
          <a
            href={waShare}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[#25D366] px-4 py-2 text-sm text-white"
          >
            Invia link WhatsApp
          </a>
          <Link
            href={`/book/${operator.slug}`}
            className="rounded-full bg-sea px-4 py-2 text-sm text-white hover:bg-sea-deep"
          >
            Vista cliente
          </Link>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Prenotazioni oggi" value={String(stats.todays)} />
        <Stat label="Ospiti oggi" value={String(stats.guests)} />
        <Stat label="In attesa deposito" value={String(stats.pendingPay)} />
        <Stat label="Depositi ok" value={String(stats.deposits)} />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2">
          {(
            [
              ["today", "Oggi"],
              ["pending", "Da chiudere"],
              ["all", "Tutte"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-4 py-2 text-sm border ${
                filter === key
                  ? "bg-sea text-white border-sea"
                  : "border-line text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void resetDemo()}
          className="text-sm text-muted hover:text-ink underline-offset-2 hover:underline"
        >
          Reset demo data
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {visible.length === 0 && (
          <p className="text-muted border border-dashed border-line p-8 text-center">
            Nessuna prenotazione in questa vista.
          </p>
        )}
        {visible.map((b) => (
          <article
            key={b.id}
            className="border border-line bg-surface p-4 md:p-5"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm">{b.code}</span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${tone(b.status)}`}
                  >
                    {statusLabel(b.status)}
                  </span>
                  <span className="text-xs text-muted uppercase tracking-wide">
                    {b.source}
                  </span>
                </div>
                <h2 className="font-display text-xl mt-2">{b.serviceName}</h2>
                <p className="text-sm text-muted mt-1">
                  {formatDateLabel(b.date)} · {b.time} · {b.guests} ospiti
                </p>
                <p className="mt-2">
                  <span className="font-medium">{b.guestName}</span>
                  <span className="text-muted"> · {b.guestPhone}</span>
                </p>
                {b.notes && (
                  <p className="mt-1 text-sm text-muted italic">{b.notes}</p>
                )}
              </div>
              <div className="text-left md:text-right shrink-0">
                <p className="font-display text-xl">
                  {formatMoney(b.totalEur)}
                </p>
                <p className="text-sm text-accent-hot">
                  dep. {formatMoney(b.depositEur)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {STATUS_ACTIONS.filter((a) => a.status !== b.status).map((a) => (
                <button
                  key={a.status}
                  type="button"
                  onClick={() => void setStatus(b.id, a.status)}
                  className="rounded-full border border-line px-3 py-1.5 text-xs hover:border-sea/40"
                >
                  {a.label}
                </button>
              ))}
              <a
                href={whatsappLink(
                  b.guestPhone,
                  `Ciao ${b.guestName}, riguardo ${b.code} (${b.serviceName} ${b.date} ${b.time}): `,
                )}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[#25D366]/40 px-3 py-1.5 text-xs text-[#128C7E] hover:bg-[#25D366]/10"
              >
                WhatsApp ospite
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-surface p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="font-display text-3xl mt-1">{value}</p>
    </div>
  );
}
