# Rezervo

Booking ops MVP for **tours, transfers, and boat trips** in Albania — without OTA commissions.

Flow: shareable WhatsApp link → guest picks service / date / seats → confirmation code + deposit → operator dashboard (confirm, deposit paid, no-show).

## Demo

Seed operator: **Blue Ionian Tours** (Saranda)

| URL | Purpose |
|---|---|
| `/` | Product landing |
| `/book/blue-ionian` | Public booking page (IT / EN / SQ) |
| `/ops` | Operator dashboard |

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Data lives in `data/store.json` (created on first request). Reset demo data:

```bash
curl -X POST http://localhost:3000/api/demo/reset
```

## MVP scope

Included:
- Per-slot capacity (no overbooking)
- Deposit % per service
- Statuses: pending → confirmed → deposit_paid → completed / no_show / cancelled
- WhatsApp deep links (guest ↔ operator)
- Seed bookings for “today”

**What is still missing before handing this to a real operator:** see [OPERATOR-READY.md](./OPERATOR-READY.md).

Out of scope for now:
- WhatsApp Business API / AI inbox
- Albanian fiscalization (fiskalizimi / DPT)
- Channel manager / OTAs
- Native mobile apps

## Stack

Next.js 16 · React 19 · Tailwind CSS 4 · local JSON file store

## License

Private / unpublished unless noted otherwise.
