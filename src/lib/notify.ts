import type { Booking, Operator } from "./types";
import { formatDateLabel, formatMoney } from "./format";

export type NotifyResult = { sent: boolean; reason?: string };

export async function notifyOperatorNewBooking(opts: {
  operator: Operator;
  booking: Booking;
  serviceName: string;
  appOrigin?: string;
}): Promise<NotifyResult> {
  const to = opts.operator.notificationEmail.trim();
  if (!to) {
    return { sent: false, reason: "no-email" };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.info(
      `[rezervo] new booking ${opts.booking.code} — email skipped (RESEND_API_KEY not set). Would notify: ${to}`,
    );
    return { sent: false, reason: "no-resend-key" };
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "Rezervo <onboarding@resend.dev>";
  const origin = opts.appOrigin ?? process.env.APP_URL ?? "https://rezervo.app";
  const opsUrl = `${origin}/ops`;
  const when = `${formatDateLabel(opts.booking.date)} · ${opts.booking.time}`;
  const deposit = formatMoney(opts.booking.depositEur);
  const total = formatMoney(opts.booking.totalEur);

  const subject = `New booking ${opts.booking.code} · ${opts.booking.guestName}`;
  const html = `
    <h2>New booking on Rezervo</h2>
    <p><strong>${opts.booking.code}</strong> · ${opts.serviceName}</p>
    <ul>
      <li>Guest: ${opts.booking.guestName} (${opts.booking.guestPhone})</li>
      <li>When: ${when}</li>
      <li>Guests: ${opts.booking.guests}</li>
      <li>Total: ${total} · Deposit: ${deposit}</li>
    </ul>
    <p><a href="${opsUrl}">Open dashboard</a></p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[rezervo] Resend failed:", err);
    return { sent: false, reason: "resend-error" };
  }

  return { sent: true };
}
