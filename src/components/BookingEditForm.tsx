"use client";

import { useMemo, useState } from "react";
import type { Booking, Service, SlotAvailability } from "@/lib/types";
import { formatDateLabel, formatMoney } from "@/lib/format";

type Props = {
  booking: Booking;
  service?: Service;
  slots: SlotAvailability[];
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
};

export function BookingEditForm({
  booking,
  service,
  slots,
  onCancel,
  onSaved,
}: Props) {
  const [date, setDate] = useState(booking.date);
  const [time, setTime] = useState(booking.time);
  const [guests, setGuests] = useState(booking.guests);
  const [guestName, setGuestName] = useState(booking.guestName);
  const [guestPhone, setGuestPhone] = useState(booking.guestPhone);
  const [notes, setNotes] = useState(booking.notes);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const editableSlots = useMemo(() => {
    const list = [...slots];
    const hasCurrent = list.some(
      (s) => s.date === booking.date && s.time === booking.time,
    );
    if (!hasCurrent) {
      list.unshift({
        date: booking.date,
        time: booking.time,
        capacity: service?.capacity ?? booking.guests,
        booked: booking.guests,
        remaining: 0,
      });
    }
    return list.filter(
      (s) =>
        s.remaining > 0 ||
        (s.date === booking.date && s.time === booking.time),
    );
  }, [slots, booking.date, booking.time, booking.guests, service?.capacity]);

  const dates = useMemo(() => {
    const map = new Map<string, SlotAvailability[]>();
    for (const slot of editableSlots) {
      const list = map.get(slot.date) ?? [];
      list.push(slot);
      map.set(slot.date, list);
    }
    return [...map.entries()];
  }, [editableSlots]);

  const timesForDate = dates.find(([d]) => d === date)?.[1] ?? [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          time,
          guests,
          guestName,
          guestPhone,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save");
        return;
      }
      await onSaved();
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  const total = service ? service.priceEur * guests : booking.totalEur;
  const deposit = service
    ? Math.round(((total * service.depositPercent) / 100) * 100) / 100
    : booking.depositEur;

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 border border-line bg-foam/30 p-4 space-y-4"
    >
      <div>
        <p className="text-sm text-muted mb-2">Data</p>
        <div className="flex flex-wrap gap-2">
          {dates.map(([d, daySlots]) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDate(d);
                const stillValid = daySlots.some((s) => s.time === time);
                if (!stillValid) setTime(daySlots[0]?.time ?? "");
              }}
              className={`rounded-full px-3 py-2.5 text-sm border min-h-11 ${
                date === d
                  ? "bg-sea text-white border-sea"
                  : "border-line bg-surface"
              }`}
            >
              {formatDateLabel(d)}
            </button>
          ))}
        </div>
      </div>

      {date && (
        <div>
          <p className="text-sm text-muted mb-2">Orario</p>
          <div className="flex flex-wrap gap-2">
            {timesForDate.map((slot) => {
              const remaining =
                slot.date === booking.date && slot.time === booking.time
                  ? slot.remaining + booking.guests
                  : slot.remaining;
              return (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => setTime(slot.time)}
                  className={`rounded-full px-4 py-2.5 text-sm border min-h-11 ${
                    time === slot.time
                      ? "bg-accent text-white border-accent"
                      : "border-line bg-surface"
                  }`}
                >
                  {slot.time} ({remaining})
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-muted">Ospiti</span>
          <input
            type="number"
            min={1}
            max={service?.capacity ?? 12}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="field mt-1"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted">Nome</span>
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="field mt-1"
            required
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm text-muted">Telefono</span>
          <input
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            className="field mt-1"
            required
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm text-muted">Note</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="field mt-1 min-h-[5.5rem]"
          />
        </label>
      </div>

      <p className="text-sm text-muted">
        Totale {formatMoney(total)} · dep. {formatMoney(deposit)}
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-line px-4 py-2.5 text-sm min-h-11"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={loading || !date || !time}
          className="rounded-full bg-sea px-4 py-2.5 text-sm font-medium text-white min-h-11 disabled:opacity-40"
        >
          {loading ? "…" : "Salva"}
        </button>
      </div>
    </form>
  );
}
