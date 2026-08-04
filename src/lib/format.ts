import type { BookingStatus, Locale, Service } from "./types";

export function serviceLabel(service: Service, locale: Locale): string {
  if (locale === "it") return service.nameIt;
  if (locale === "sq") return service.nameSq;
  return service.name;
}

export function formatMoney(amount: number, currency: "EUR" | "ALL" = "EUR") {
  if (currency === "ALL") {
    return `${Math.round(amount).toLocaleString("sq-AL")} ALL`;
  }
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatDateLabel(iso: string, locale: Locale = "it") {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const loc = locale === "sq" ? "sq-AL" : locale === "en" ? "en-GB" : "it-IT";
  return new Intl.DateTimeFormat(loc, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function statusLabel(status: BookingStatus, locale: Locale = "it") {
  const map: Record<Locale, Record<BookingStatus, string>> = {
    it: {
      pending: "In attesa deposito",
      confirmed: "Confermata",
      deposit_paid: "Deposito ok",
      completed: "Completata",
      no_show: "No-show",
      cancelled: "Cancellata",
    },
    en: {
      pending: "Awaiting deposit",
      confirmed: "Confirmed",
      deposit_paid: "Deposit paid",
      completed: "Completed",
      no_show: "No-show",
      cancelled: "Cancelled",
    },
    sq: {
      pending: "Në pritje të depozitës",
      confirmed: "Konfirmuar",
      deposit_paid: "Depozita OK",
      completed: "Përfunduar",
      no_show: "Nuk u paraqit",
      cancelled: "Anuluar",
    },
  };
  return map[locale][status];
}

export function whatsappLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function guestConfirmMessage(opts: {
  guestName: string;
  serviceName: string;
  date: string;
  time: string;
  code: string;
  depositEur: number;
  meetingPoint: string;
  locale: Locale;
}) {
  const deposit = formatMoney(opts.depositEur);
  if (opts.locale === "en") {
    return `Hi ${opts.guestName}, booking ${opts.code} for ${opts.serviceName} on ${opts.date} at ${opts.time}. Deposit ${deposit}. Meeting: ${opts.meetingPoint}`;
  }
  if (opts.locale === "sq") {
    return `Përshëndetje ${opts.guestName}, rezervimi ${opts.code} për ${opts.serviceName} më ${opts.date} ora ${opts.time}. Depozita ${deposit}. Takimi: ${opts.meetingPoint}`;
  }
  return `Ciao ${opts.guestName}, prenotazione ${opts.code} per ${opts.serviceName} il ${opts.date} alle ${opts.time}. Deposito ${deposit}. Meeting: ${opts.meetingPoint}`;
}
