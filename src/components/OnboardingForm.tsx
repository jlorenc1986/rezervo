"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeSlug, suggestSlugFromName } from "@/lib/slug";

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [city, setCity] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [tagline, setTagline] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [priceEur, setPriceEur] = useState(45);
  const [capacity, setCapacity] = useState(8);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const previewSlug = useMemo(() => {
    if (slugTouched) return normalizeSlug(slug);
    return suggestSlugFromName(name);
  }, [name, slug, slugTouched]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/operators/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: previewSlug,
          city,
          whatsapp,
          tagline,
          firstService: serviceName.trim()
            ? {
                name: serviceName.trim(),
                priceEur,
                capacity,
                durationMinutes: 180,
                daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
                departures: ["09:30"],
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create operator");
        return;
      }
      router.push("/ops");
      router.refresh();
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-xl">
      <label className="block">
        <span className="text-sm text-muted">Business name</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full border border-line bg-surface px-3 py-2"
          placeholder="Blue Ionian Tours"
        />
      </label>

      <label className="block">
        <span className="text-sm text-muted">Booking link slug</span>
        <div className="mt-1 flex items-center gap-2 border border-line bg-surface px-3 py-2">
          <span className="text-muted text-sm shrink-0">/book/</span>
          <input
            required
            value={slugTouched ? slug : previewSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className="w-full bg-transparent outline-none"
          />
        </div>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-muted">City</span>
          <input
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 w-full border border-line bg-surface px-3 py-2"
            placeholder="Saranda"
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted">WhatsApp (with country code)</span>
          <input
            required
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="mt-1 w-full border border-line bg-surface px-3 py-2"
            placeholder="35569…"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm text-muted">Tagline (optional)</span>
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          className="mt-1 w-full border border-line bg-surface px-3 py-2"
        />
      </label>

      <div className="border-t border-line pt-5 space-y-4">
        <h2 className="font-display text-2xl">First service (optional)</h2>
        <label className="block">
          <span className="text-sm text-muted">Service name</span>
          <input
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            className="mt-1 w-full border border-line bg-surface px-3 py-2"
            placeholder="Ksamil boat trip"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-muted">Price EUR / person</span>
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
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-sea px-6 py-3 text-white font-medium disabled:opacity-40"
      >
        {loading ? "…" : "Create operator profile"}
      </button>
    </form>
  );
}
