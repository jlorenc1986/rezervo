import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatDateLabel,
  formatMoney,
  guestConfirmMessage,
  serviceLabel,
  statusLabel,
  whatsappLink,
} from "@/lib/format";
import {
  getBookingByCode,
  getOperatorBySlug,
  getService,
} from "@/lib/store";

export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
  const operator = await getOperatorBySlug(slug);
  const booking = await getBookingByCode(code);
  if (!operator || !booking || booking.operatorId !== operator.id) {
    notFound();
  }
  const service = await getService(booking.serviceId);
  if (!service) notFound();

  const serviceName = serviceLabel(service, booking.guestLocale);
  const wa = whatsappLink(
    operator.whatsapp,
    guestConfirmMessage({
      guestName: booking.guestName,
      serviceName,
      date: booking.date,
      time: booking.time,
      code: booking.code,
      depositEur: booking.depositEur,
      meetingPoint: service.meetingPoint,
      locale: booking.guestLocale,
    }),
  );

  return (
    <main className="flex-1 bg-bg">
      <div className="mx-auto max-w-xl px-6 py-12">
        <Link href={`/book/${slug}`} className="text-sm text-muted hover:text-ink">
          ← Altre date
        </Link>

        <p className="mt-8 text-sm uppercase tracking-[0.14em] text-ok">
          Richiesta ricevuta
        </p>
        <h1 className="font-display text-4xl mt-2">{booking.code}</h1>
        <p className="mt-3 text-muted">
          {statusLabel(booking.status, booking.guestLocale)} ·{" "}
          {operator.name}
        </p>

        <div className="mt-8 border border-line bg-surface p-5 space-y-3">
          <Row label="Esperienza" value={serviceName} />
          <Row
            label="Quando"
            value={`${formatDateLabel(booking.date, booking.guestLocale)} · ${booking.time}`}
          />
          <Row label="Ospiti" value={String(booking.guests)} />
          <Row label="Totale" value={formatMoney(booking.totalEur)} />
          <Row label="Deposito" value={formatMoney(booking.depositEur)} />
          <Row label="Meeting" value={service.meetingPoint} />
        </div>

        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="mt-8 flex w-full items-center justify-center rounded-full bg-[#25D366] py-3 font-medium text-white hover:brightness-105 transition"
        >
          Conferma su WhatsApp
        </a>
        <p className="mt-3 text-sm text-muted text-center leading-relaxed">
          Invia il messaggio all&apos;operatore per il deposito. Dopo il pagamento
          lo stato passa a &quot;Deposito ok&quot; dalla dashboard.
        </p>

        <div className="mt-10 flex justify-center gap-4 text-sm">
          <Link href="/ops" className="text-sea underline-offset-2 hover:underline">
            Dashboard ops
          </Link>
          <Link href="/" className="text-muted hover:text-ink">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-2 last:border-0 last:pb-0">
      <span className="text-muted text-sm">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
