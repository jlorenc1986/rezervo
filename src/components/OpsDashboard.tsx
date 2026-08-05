"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Booking, BookingStatus, Operator } from "@/lib/types";
import {
  formatDateLabel,
  formatMoney,
  statusLabel,
  todayIso,
  whatsappLink,
} from "@/lib/format";
import { depositReminderMessage } from "@/lib/deposit";

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

/** High-signal actions for phone; remaining stay behind “Altri stati”. */
function primaryStatusesFor(status: BookingStatus): BookingStatus[] {
  switch (status) {
    case "pending":
      return ["deposit_paid", "confirmed", "cancelled"];
    case "confirmed":
      return ["deposit_paid", "no_show", "cancelled"];
    case "deposit_paid":
      return ["completed", "no_show", "cancelled"];
    case "completed":
      return [];
    case "no_show":
      return ["cancelled"];
    case "cancelled":
      return [];
    default:
      return [];
  }
}

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

const btnOutline =
  "rounded-full border border-line px-4 py-2.5 text-sm min-h-11 inline-flex items-center justify-center hover:border-sea/40";
const btnPrimary =
  "rounded-full bg-sea px-4 py-2.5 text-sm font-medium text-white min-h-11 inline-flex items-center justify-center hover:bg-sea-deep";
const btnWa =
  "rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white min-h-11 inline-flex items-center justify-center hover:brightness-105";

export function OpsDashboard({ operator, initialBookings }: Props) {
  const [bookings, setBookings] = useState(initialBookings);
  const [filter, setFilter] = useState<"today" | "all" | "pending">("today");
  const [shareCopied, setShareCopied] = useState(false);
  const [newAlert, setNewAlert] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [expandedActions, setExpandedActions] = useState<Record<string, boolean>>(
    {},
  );
  const knownIdsRef = useRef(new Set(initialBookings.map((b) => b.id)));

  const reload = useCallback(async () => {
    const res = await fetch("/api/bookings/mine");
    const data = await res.json();
    const list = (data.bookings ?? []) as EnrichedBooking[];
    const fresh = list.filter((b) => !knownIdsRef.current.has(b.id));
    if (fresh.length > 0) {
      for (const b of list) knownIdsRef.current.add(b.id);
      const label = `${fresh.length} new booking${fresh.length > 1 ? "s" : ""}`;
      setNewAlert(label);
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification("Rezervo", {
          body: `${fresh[0].code} · ${fresh[0].guestName}`,
        });
      }
    }
    setBookings(list);
  }, []);

  const today = todayIso();
  const isDemo = operator.slug === "blue-ionian";

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

  useEffect(() => {
    const id = window.setInterval(() => void reload(), 45000);
    return () => window.clearInterval(id);
  }, [reload]);

  async function enablePush() {
    if (typeof Notification === "undefined") return;
    await Notification.requestPermission();
  }

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

  async function exportCsv(scope: "today" | "month") {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      const res = await fetch(`/api/bookings/export?scope=${scope}`);
      if (!res.ok) {
        setNewAlert("Export CSV fallito");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        scope === "today"
          ? `rezervo_bookings_${today}.csv`
          : `rezervo_bookings_${today.slice(0, 7)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setNewAlert("Export CSV fallito");
    } finally {
      setExportBusy(false);
    }
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
    <div className="mx-auto max-w-5xl px-4 md:px-6 py-6 md:py-10 pb-[max(6rem,env(safe-area-inset-bottom))]">
      {newAlert && (
        <div className="mb-4 flex items-center justify-between gap-3 border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok">
          <span>{newAlert}</span>
          <button
            type="button"
            className="text-ok underline-offset-2 hover:underline min-h-11 px-2"
            onClick={() => setNewAlert(null)}
          >
            OK
          </button>
        </div>
      )}

      <div className="sticky top-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 py-3 mb-4 border-b border-line bg-bg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <Stat label="Oggi" value={String(stats.todays)} compact />
          <Stat label="Ospiti" value={String(stats.guests)} compact />
          <Stat label="Da pagare" value={String(stats.pendingPay)} compact />
          <Stat label="Dep. ok" value={String(stats.deposits)} compact />
        </div>
      </div>

      <header className="flex flex-col gap-4">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-ink">
            ← Rezervo
          </Link>
          <h1 className="font-display text-3xl md:text-4xl mt-3">
            {operator.name}
          </h1>
          <p className="text-muted mt-1">Ops · {operator.city}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
          <a href={waShare} target="_blank" rel="noreferrer" className={btnWa}>
            Invia WhatsApp
          </a>
          <button
            type="button"
            onClick={() => void copyBookingLink()}
            className={btnOutline}
          >
            {shareCopied ? "Link copiato" : "Copia link"}
          </button>
          <Link href={`/book/${operator.slug}`} className={btnPrimary}>
            Vista cliente
          </Link>
          <button
            type="button"
            onClick={() => void reload()}
            className={btnOutline}
          >
            Aggiorna
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="text-sm text-muted underline-offset-2 hover:underline min-h-11"
          >
            {moreOpen ? "Nascondi altro" : "Altro (export, settings…)"}
          </button>
          {moreOpen && (
            <div className="mt-2 grid grid-cols-2 gap-2 md:flex md:flex-wrap">
              <button
                type="button"
                onClick={() => void enablePush()}
                className={btnOutline}
              >
                Notifiche
              </button>
              <button
                type="button"
                onClick={() => void exportCsv("today")}
                disabled={exportBusy}
                className={`${btnOutline} disabled:opacity-50`}
              >
                Export oggi
              </button>
              <button
                type="button"
                onClick={() => void exportCsv("month")}
                disabled={exportBusy}
                className={`${btnOutline} disabled:opacity-50`}
              >
                Export mese
              </button>
              <Link href="/ops/settings" className={btnOutline}>
                Deposito
              </Link>
              <Link href="/ops/services" className={btnOutline}>
                Services
              </Link>
              <form action="/auth/signout" method="post" className="contents">
                <button type="submit" className={`${btnOutline} text-muted`}>
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </header>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
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
            className={`rounded-full px-4 py-2.5 text-sm border min-h-11 shrink-0 ${
              filter === key
                ? "bg-sea text-white border-sea"
                : "border-line text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {visible.length === 0 && (
          <p className="text-muted border border-dashed border-line p-8 text-center">
            Nessuna prenotazione in questa vista.
          </p>
        )}
        {visible.map((b) => {
          const primary = primaryStatusesFor(b.status);
          const showAll = expandedActions[b.id] ?? false;
          const actions = STATUS_ACTIONS.filter((a) => a.status !== b.status);
          const visibleActions = showAll
            ? actions
            : actions.filter((a) => primary.includes(a.status));
          const hiddenCount = actions.length - visibleActions.length;

          return (
            <article
              key={b.id}
              className="border border-line bg-surface p-4 md:p-5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
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
                  <p className="mt-2 break-words">
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

              <div className="mt-4 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                {visibleActions.map((a) => (
                  <button
                    key={a.status}
                    type="button"
                    onClick={() => void setStatus(b.id, a.status)}
                    className="rounded-full border border-line px-3 py-2.5 text-sm min-h-11 hover:border-sea/40"
                  >
                    {a.label}
                  </button>
                ))}
                {b.status === "pending" && (
                  <a
                    href={whatsappLink(
                      b.guestPhone,
                      depositReminderMessage({
                        guestName: b.guestName,
                        code: b.code,
                        depositEur: b.depositEur,
                        operator,
                        locale: b.guestLocale,
                      }),
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-warn/40 px-3 py-2.5 text-sm text-warn min-h-11 flex items-center justify-center hover:bg-warn/10"
                  >
                    Chiedi deposito
                  </a>
                )}
                <a
                  href={whatsappLink(
                    b.guestPhone,
                    `Ciao ${b.guestName}, riguardo ${b.code} (${b.serviceName} ${b.date} ${b.time}): `,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[#25D366]/40 px-3 py-2.5 text-sm text-[#128C7E] min-h-11 flex items-center justify-center hover:bg-[#25D366]/10"
                >
                  WhatsApp ospite
                </a>
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedActions((prev) => ({
                        ...prev,
                        [b.id]: !showAll,
                      }))
                    }
                    className="rounded-full border border-dashed border-line px-3 py-2.5 text-sm text-muted min-h-11 col-span-2 sm:col-span-1"
                  >
                    {showAll ? "Meno stati" : `Altri stati (${hiddenCount})`}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {isDemo && (
        <div className="mt-10 pt-6 border-t border-line text-center">
          <button
            type="button"
            onClick={() => void resetDemo()}
            className="text-xs text-muted hover:text-ink underline-offset-2 hover:underline"
          >
            Reset demo data
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={`border border-line bg-surface ${compact ? "p-2.5" : "p-4"}`}>
      <p className="text-[10px] md:text-xs uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className={`font-display mt-0.5 ${compact ? "text-2xl" : "text-3xl"}`}>
        {value}
      </p>
    </div>
  );
}
