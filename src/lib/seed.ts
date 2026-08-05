import type { Operator, Service, StoreData } from "./types";

export const DEMO_OPERATOR: Operator = {
  id: "op_blue_ionian",
  authUserId: null,
  slug: "blue-ionian",
  name: "Blue Ionian Tours",
  tagline: "Boat, transfer e trekking da Saranda",
  city: "Saranda",
  whatsapp: "355692000111",
  phone: "+355 69 200 0111",
  currency: "EUR",
  locale: "it",
  depositNote:
    "Deposito 30% via Wise/Revolut o contanti al meeting point. Il resto il giorno del tour.",
  depositIban: "",
  depositRevolutLink: "",
  depositWiseLink: "",
  notificationEmail: "",
};

export const DEMO_SERVICES: Service[] = [
  {
    id: "svc_ksamil_boat",
    operatorId: DEMO_OPERATOR.id,
    name: "Ksamil Islands boat trip",
    nameIt: "Gita in barca alle isole di Ksamil",
    nameSq: "Udhëtim me varkë në ishujt e Ksamilit",
    description:
      "Mezza giornata: snorkel, spiagge nascoste, pranzo a bordo. Max 12 posti.",
    durationMinutes: 300,
    capacity: 12,
    priceEur: 45,
    depositPercent: 30,
    meetingPoint: "Saranda harbour — pier 2, blue flag",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    departures: ["09:30", "14:00"],
  },
  {
    id: "svc_tirana_transfer",
    operatorId: DEMO_OPERATOR.id,
    name: "Tirana Airport → Saranda transfer",
    nameIt: "Transfer aeroporto Tirana → Saranda",
    nameSq: "Transfer aeroporti Tirana → Sarandë",
    description:
      "Van privato fino a 7 persone. Pickup all'uscita arrivi. ~3h30.",
    durationMinutes: 210,
    capacity: 7,
    priceEur: 120,
    depositPercent: 40,
    meetingPoint: "TIA arrivals hall — driver with Blue Ionian sign",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    departures: ["10:00", "16:00", "22:00"],
  },
  {
    id: "svc_gjirokaster",
    operatorId: DEMO_OPERATOR.id,
    name: "Gjirokastër day hike",
    nameIt: "Trekking giornaliero a Gjirokastër",
    nameSq: "Ecursion ditore në Gjirokastër",
    description:
      "Guida locale, castello e villaggi. Include pranzo tipico. Max 8.",
    durationMinutes: 480,
    capacity: 8,
    priceEur: 55,
    depositPercent: 30,
    meetingPoint: "Saranda bus station — 07:45",
    daysOfWeek: [2, 4, 6],
    departures: ["07:45"],
  },
];

export function createSeedStore(): StoreData {
  const today = new Date();
  const iso = (offsetDays: number, time: string) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return { date: `${y}-${m}-${day}`, time };
  };

  const b1 = iso(0, "09:30");
  const b2 = iso(0, "14:00");
  const b3 = iso(1, "10:00");

  return {
    operators: [DEMO_OPERATOR],
    services: DEMO_SERVICES,
    bookings: [
      {
        id: "bk_demo_1",
        code: "RZ-KSM-1042",
        operatorId: DEMO_OPERATOR.id,
        serviceId: "svc_ksamil_boat",
        date: b1.date,
        time: b1.time,
        guestName: "Giulia Rossi",
        guestPhone: "+39 340 111 2233",
        guestLocale: "it",
        guests: 2,
        status: "deposit_paid",
        totalEur: 90,
        depositEur: 27,
        notes: "Preferisce sedili all'ombra",
        source: "whatsapp",
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: "bk_demo_2",
        code: "RZ-KSM-1043",
        operatorId: DEMO_OPERATOR.id,
        serviceId: "svc_ksamil_boat",
        date: b1.date,
        time: b1.time,
        guestName: "Tom Müller",
        guestPhone: "+49 151 444 8899",
        guestLocale: "en",
        guests: 4,
        status: "confirmed",
        totalEur: 180,
        depositEur: 54,
        notes: "",
        source: "link",
        createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 7).toISOString(),
      },
      {
        id: "bk_demo_3",
        code: "RZ-KSM-1044",
        operatorId: DEMO_OPERATOR.id,
        serviceId: "svc_ksamil_boat",
        date: b2.date,
        time: b2.time,
        guestName: "Elena Kola",
        guestPhone: "+355 69 555 1212",
        guestLocale: "sq",
        guests: 3,
        status: "pending",
        totalEur: 135,
        depositEur: 40.5,
        notes: "Aspetta conferma deposito",
        source: "link",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "bk_demo_4",
        code: "RZ-TIA-2201",
        operatorId: DEMO_OPERATOR.id,
        serviceId: "svc_tirana_transfer",
        date: b3.date,
        time: b3.time,
        guestName: "Marco Bianchi",
        guestPhone: "+39 333 777 0099",
        guestLocale: "it",
        guests: 3,
        status: "deposit_paid",
        totalEur: 120,
        depositEur: 48,
        notes: "Volo Wizz Air arriva ~09:40",
        source: "whatsapp",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
  };
}
