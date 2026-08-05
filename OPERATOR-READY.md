# Path to a real operator

Current state: **demo MVP** (booking link + ops dashboard + Saranda seed).  
Goal: an Albanian operator can run it alone for 1–2 weeks in season.

## Ship blockers (must-have)

| # | Item | Why it blocks |
|---|---|---|
| 1 | **Operator login** (email/password or magic link) | `/ops` is open to anyone; only one hard-coded demo (`blue-ionian`) |
| 2 | **Own account + slug** (name, WhatsApp, city, services) | Cannot onboard a second business without code changes |
| 3 | **Real database** (Postgres / hosted SQLite), not `data/store.json` | Local file = no phone + laptop sync, no backup, overwrite risk |
| 4 | **Public HTTPS deploy** | Guests must open the link from WhatsApp off your laptop |
| 5 | **End-to-end deposit flow** | Minimum: Wise/Revolut/IBAN instructions + “mark paid” + reminder; better: Stripe Payment Link |
| 6 | **Mobile-friendly ops** | Harbour / beach staff work from a phone: today list, tap statuses, guest WhatsApp |
| 7 | **Edit / cancel booking** (seats freed immediately) | Date changes and mistakes are daily; statuses exist, editing is limited |
| 8 | **Basic auto-confirm** | SMS, email, or WhatsApp template after booking (even a ready message + log) |

## Important (week 2)

| # | Item | Why |
|---|---|---|
| 9 | **Operator notifications** (push / email / WhatsApp) on new booking | Otherwise they must keep `/ops` open |
| 10 | **No-show / cutoff rules** (e.g. release seats after X hours without deposit) | Stops capacity locked by ghosts |
| 11 | **Multi-day capacity calendar** (week view) | Filters alone are weak in peak season |
| 12 | **Staff roles** (owner vs guide/driver “today” only) | Often several people on the same van/boat |
| 13 | **Simple export** (CSV for day / month) | Accounting and partner tour operators |
| 14 | **Backup + restore** and deletion policy | GDPR / trust |

## Later (does not block the first operator)

| # | Item | Note |
|---|---|---|
| 15 | WhatsApp Business API / unified inbox | Deep links are enough until volume justifies API |
| 16 | Albanian fiscalization (DPT) | Needed when invoicing from the tool, not to validate booking |
| 17 | Channel manager / OTAs | Out of scope: this product replaces Excel, not Booking.com |
| 18 | Native app stores | Mobile browser / PWA is enough at first |
| 19 | Ops UI beyond IT/EN | Guest already has IT/EN/SQ |

## Definition of “field-ready”

A real operator can:

1. Create an account and 2–3 services  
2. Send the booking link on WhatsApp to a guest  
3. See the booking on their phone within a minute  
4. Mark the deposit as received  
5. Open “Today” in the morning and know who boards / who is a no-show  

If any of these five fails → **do not hand it over** without sitting next to them.

## Suggested build order

1. ~~Deploy + database~~ → **Postgres (Supabase) + Railway config done**  
2. ~~Auth + operator/service onboarding~~ → **in progress / this PR**  
3. Deposit (instructions + statuses + optional Payment Link)  
4. Mobile ops + new-booking notifications  
5. No-show cutoff + export  

Only after that: automated payments, WhatsApp API, fiscalization.
