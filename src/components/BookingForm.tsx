"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale, Operator, Service, SlotAvailability } from "@/lib/types";
import { formatMoney, serviceLabel } from "@/lib/format";

type Props = {
  operator: Operator;
  services: Service[];
  availability: Record<string, SlotAvailability[]>;
};

export function BookingForm({ operator, services, availability }: Props) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("it");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState(2);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const service = services.find((s) => s.id === serviceId);
  const slots = availability[serviceId] ?? [];

  const dates = useMemo(() => {
    const map = new Map<string, SlotAvailability[]>();
    for (const slot of slots) {
      if (slot.remaining <= 0) continue;
      const list = map.get(slot.date) ?? [];
      list.push(slot);
      map.set(slot.date, list);
    }
    return [...map.entries()];
  }, [slots]);

  const timesForDate = dates.find(([d]) => d === date)?.[1] ?? [];

  const copy = {
    it: {
      pickService: "Scegli esperienza",
      pickDate: "Data",
      pickTime: "Orario",
      guests: "Ospiti",
      name: "Nome",
      phone: "Telefono / WhatsApp",
      notes: "Note (opzionale)",
      submit: "Richiedi prenotazione",
      deposit: "Deposito richiesto",
      total: "Totale",
      empty: "Nessuno slot libero nei prossimi 14 giorni",
    },
    en: {
      pickService: "Choose experience",
      pickDate: "Date",
      pickTime: "Time",
      guests: "Guests",
      name: "Name",
      phone: "Phone / WhatsApp",
      notes: "Notes (optional)",
      submit: "Request booking",
      deposit: "Deposit due",
      total: "Total",
      empty: "No open slots in the next 14 days",
    },
    sq: {
      pickService: "Zgjidh përvojën",
      pickDate: "Data",
      pickTime: "Ora",
      guests: "Mysafirë",
      name: "Emri",
      phone: "Telefon / WhatsApp",
      notes: "Shënime (opsionale)",
      submit: "Kërko rezervim",
      deposit: "Depozita",
      total: "Totali",
      empty: "Nuk ka vende të lira në 14 ditët e ardhshme",
    },
  }[locale];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: operator.slug,
          serviceId,
          date,
          time,
          guests,
          guestName,
          guestPhone,
          guestLocale: locale,
          notes,
          source: "link",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Errore");
        return;
      }
      router.push(`/book/${operator.slug}/confirm/${data.booking.code}`);
    } catch {
      setError("Connessione non riuscita");
    } finally {
      setLoading(false);
    }
  }

  const total = service ? service.priceEur * guests : 0;
  const deposit = service
    ? Math.round(((total * service.depositPercent) / 100) * 100) / 100
    : 0;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex gap-2">
        {(["it", "en", "sq"] as Locale[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            className={`rounded-full px-3 py-1 text-sm border transition ${
              locale === l
                ? "bg-sea text-white border-sea"
                : "border-line text-muted hover:border-sea/40"
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <fieldset className="space-y-3">
        <legend className="font-display text-xl">{copy.pickService}</legend>
        <div className="space-y-2">
          {services.map((s) => (
            <label
              key={s.id}
              className={`block cursor-pointer border p-4 transition ${
                serviceId === s.id
                  ? "border-accent bg-foam/50"
                  : "border-line bg-surface hover:border-sea/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="service"
                  className="mt-1"
                  checked={serviceId === s.id}
                  onChange={() => {
                    setServiceId(s.id);
                    setDate("");
                    setTime("");
                  }}
                />
                <div>
                  <p className="font-medium">{serviceLabel(s, locale)}</p>
                  <p className="text-sm text-muted mt-1">{s.description}</p>
                  <p className="text-sm mt-2 text-sea">
                    {formatMoney(s.priceEur)} / persona · deposito{" "}
                    {s.depositPercent}%
                  </p>
                </div>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {dates.length === 0 ? (
        <p className="text-warn">{copy.empty}</p>
      ) : (
        <>
          <div>
            <label className="block text-sm text-muted mb-2">{copy.pickDate}</label>
            <div className="flex flex-wrap gap-2">
              {dates.map(([d, daySlots]) => {
                const rem = daySlots.reduce((n, s) => n + s.remaining, 0);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDate(d);
                      setTime("");
                    }}
                    className={`rounded-full px-3 py-2 text-sm border transition ${
                      date === d
                        ? "bg-sea text-white border-sea"
                        : "border-line bg-surface"
                    }`}
                  >
                    {d.slice(5)} · {rem} left
                  </button>
                );
              })}
            </div>
          </div>

          {date && (
            <div>
              <label className="block text-sm text-muted mb-2">{copy.pickTime}</label>
              <div className="flex flex-wrap gap-2">
                {timesForDate.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => setTime(slot.time)}
                    className={`rounded-full px-4 py-2 text-sm border transition ${
                      time === slot.time
                        ? "bg-accent text-white border-accent"
                        : "border-line bg-surface"
                    }`}
                  >
                    {slot.time} ({slot.remaining})
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-muted">{copy.guests}</span>
          <input
            type="number"
            min={1}
            max={service?.capacity ?? 12}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="mt-1 w-full border border-line bg-surface px-3 py-2"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted">{copy.name}</span>
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="mt-1 w-full border border-line bg-surface px-3 py-2"
            required
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm text-muted">{copy.phone}</span>
          <input
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            className="mt-1 w-full border border-line bg-surface px-3 py-2"
            placeholder="+39 … / +355 …"
            required
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm text-muted">{copy.notes}</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full border border-line bg-surface px-3 py-2"
          />
        </label>
      </div>

      {service && date && time && (
        <div className="border border-line bg-sand/50 p-4 flex flex-wrap gap-6 justify-between">
          <div>
            <p className="text-sm text-muted">{copy.total}</p>
            <p className="font-display text-2xl">{formatMoney(total)}</p>
          </div>
          <div>
            <p className="text-sm text-muted">{copy.deposit}</p>
            <p className="font-display text-2xl text-accent-hot">
              {formatMoney(deposit)}
            </p>
          </div>
        </div>
      )}

      {error && <p className="text-danger text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading || !date || !time || !guestName || !guestPhone}
        className="w-full rounded-full bg-sea py-3 text-white font-medium disabled:opacity-40 hover:bg-sea-deep transition"
      >
        {loading ? "…" : copy.submit}
      </button>
    </form>
  );
}
