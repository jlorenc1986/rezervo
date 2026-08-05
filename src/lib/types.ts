export type BookingStatus =
  | "pending"
  | "confirmed"
  | "deposit_paid"
  | "completed"
  | "no_show"
  | "cancelled";

export type Locale = "en" | "it" | "sq";

export type Operator = {
  id: string;
  authUserId: string | null;
  slug: string;
  name: string;
  tagline: string;
  city: string;
  whatsapp: string;
  phone: string;
  currency: "EUR" | "ALL";
  locale: Locale;
  depositNote: string;
  depositIban: string;
  depositRevolutLink: string;
  depositWiseLink: string;
  notificationEmail: string;
};

export type Service = {
  id: string;
  operatorId: string;
  name: string;
  nameIt: string;
  nameSq: string;
  description: string;
  durationMinutes: number;
  capacity: number;
  priceEur: number;
  depositPercent: number;
  meetingPoint: string;
  /** Weekdays 0=Sun … 6=Sat */
  daysOfWeek: number[];
  /** Local times HH:mm */
  departures: string[];
};

export type Booking = {
  id: string;
  code: string;
  operatorId: string;
  serviceId: string;
  date: string;
  time: string;
  guestName: string;
  guestPhone: string;
  guestLocale: Locale;
  guests: number;
  status: BookingStatus;
  totalEur: number;
  depositEur: number;
  notes: string;
  source: "link" | "ops" | "whatsapp";
  createdAt: string;
  updatedAt: string;
};

export type StoreData = {
  operators: Operator[];
  services: Service[];
  bookings: Booking[];
};

export type SlotAvailability = {
  date: string;
  time: string;
  capacity: number;
  booked: number;
  remaining: number;
};
