import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex-1">
      <section className="sea-hero text-foam relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-6 pt-10 pb-24 md:pt-14 md:pb-32">
          <header className="flex items-center justify-between gap-4 rise">
            <p className="font-display text-3xl md:text-4xl tracking-tight text-white">
              Rezervo
            </p>
            <nav className="flex items-center gap-3 text-sm">
              <Link
                href="/ops"
                className="rounded-full border border-white/25 px-4 py-2 text-foam/90 hover:bg-white/10 transition"
              >
                Dashboard
              </Link>
              <Link
                href="/book/blue-ionian"
                className="rounded-full bg-accent-hot px-4 py-2 font-medium text-white hover:brightness-110 transition"
              >
                Prova booking
              </Link>
            </nav>
          </header>

          <div className="mt-16 md:mt-24 max-w-2xl">
            <h1 className="font-display text-4xl md:text-6xl text-white leading-[1.05] rise rise-delay-1">
              Prenotazioni da WhatsApp, senza Excel.
            </h1>
            <p className="mt-5 text-lg md:text-xl text-foam/85 max-w-xl leading-relaxed rise rise-delay-2">
              Per tour, transfer e boat in Albania: capacità reale, deposito e
              conferma in un link che mandi in chat.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 rise rise-delay-3">
              <Link
                href="/book/blue-ionian"
                className="rounded-full bg-white px-6 py-3 font-medium text-sea-deep hover:bg-foam transition"
              >
                Apri demo Saranda
              </Link>
              <Link
                href="/ops"
                className="rounded-full border border-white/30 px-6 py-3 text-white hover:bg-white/10 transition"
              >
                Vedi ops di oggi
              </Link>
            </div>
          </div>
        </div>
        <div className="wave-mask absolute bottom-0 left-0 right-0 h-6" />
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <h2 className="font-display text-3xl md:text-4xl text-ink max-w-xl">
          MVP concreto: un flusso, non un marketplace.
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Link in chat",
              body: "Condividi /book/blue-ionian su WhatsApp. Il cliente sceglie servizio, data e posti.",
            },
            {
              step: "02",
              title: "Capacità bloccata",
              body: "Lo slot si riempie subito. Niente doppie prenotazioni tra te e il collega.",
            },
            {
              step: "03",
              title: "Deposito + conferma",
              body: "Codice prenotazione, importo deposito, deep-link WhatsApp per chiudere il pagamento.",
            },
          ].map((item) => (
            <div key={item.step} className="border-t border-line pt-5">
              <p className="text-sm text-accent font-medium tracking-wide">
                {item.step}
              </p>
              <h3 className="mt-2 font-display text-2xl">{item.title}</h3>
              <p className="mt-2 text-muted leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-sand/40">
        <div className="mx-auto max-w-5xl px-6 py-14 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-muted">
              Demo operator
            </p>
            <h2 className="font-display text-3xl mt-2">Blue Ionian Tours · Saranda</h2>
            <p className="mt-2 text-muted max-w-md">
              Boat Ksamil, transfer TIA→Saranda, trekking Gjirokastër. Dati seed
              già pronti per oggi e domani.
            </p>
          </div>
          <Link
            href="/ops"
            className="self-start rounded-full bg-sea px-6 py-3 text-white hover:bg-sea-deep transition"
          >
            Apri dashboard →
          </Link>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-6 py-8 text-sm text-muted flex flex-wrap gap-4 justify-between">
        <span>Rezervo MVP · Albania booking ops</span>
        <span>IT / EN / SQ · no OTA commissions</span>
      </footer>
    </main>
  );
}
