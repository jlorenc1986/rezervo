"use client";

import { useState } from "react";
import Link from "next/link";
import type { Service } from "@/lib/types";
import { formatMoney } from "@/lib/format";

export function ServicesManager({
  initialServices,
}: {
  initialServices: Service[];
}) {
  const [services, setServices] = useState(initialServices);
  const [name, setName] = useState("");
  const [priceEur, setPriceEur] = useState(40);
  const [capacity, setCapacity] = useState(8);
  const [meetingPoint, setMeetingPoint] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function reload() {
    const res = await fetch("/api/services");
    const data = await res.json();
    setServices(data.services ?? []);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          priceEur,
          capacity,
          durationMinutes: 180,
          meetingPoint,
          daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
          departures: ["09:30", "14:00"],
          depositPercent: 30,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create service");
        return;
      }
      setName("");
      setMeetingPoint("");
      await reload();
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    await fetch(`/api/services?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await reload();
  }

  return (
    <div className="space-y-8">
      <ul className="space-y-3">
        {services.map((s) => (
          <li
            key={s.id}
            className="border border-line bg-surface p-4 flex flex-wrap gap-3 justify-between"
          >
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-muted mt-1">
                {formatMoney(s.priceEur)} · {s.capacity} seats ·{" "}
                {s.departures.join(", ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onDelete(s.id)}
              className="text-sm text-danger"
            >
              Delete
            </button>
          </li>
        ))}
        {services.length === 0 && (
          <p className="text-muted">No services yet. Add your first tour below.</p>
        )}
      </ul>

      <form onSubmit={onCreate} className="border-t border-line pt-6 space-y-4">
        <h2 className="font-display text-2xl">Add service</h2>
        <label className="block">
          <span className="text-sm text-muted">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full border border-line bg-surface px-3 py-2"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-muted">Price EUR</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={priceEur}
              onChange={(e) => setPriceEur(Number(e.target.value))}
              className="mt-1 w-full border border-line bg-surface px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">Capacity</span>
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="mt-1 w-full border border-line bg-surface px-3 py-2"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-muted">Meeting point</span>
          <input
            value={meetingPoint}
            onChange={(e) => setMeetingPoint(e.target.value)}
            className="mt-1 w-full border border-line bg-surface px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-sea px-5 py-2.5 text-white disabled:opacity-40"
        >
          {loading ? "…" : "Add service"}
        </button>
      </form>

      <Link href="/ops" className="text-sm text-sea hover:underline">
        ← Back to dashboard
      </Link>
    </div>
  );
}
