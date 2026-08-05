import type { DepositInstructions } from "@/lib/deposit";

export function DepositInstructionsCard({
  instructions,
}: {
  instructions: DepositInstructions;
}) {
  return (
    <div className="mt-6 border border-accent/30 bg-foam/40 p-5 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-xl">{instructions.title}</h2>
        <p className="font-display text-2xl text-accent-hot">{instructions.amount}</p>
      </div>
      <p className="text-sm text-muted leading-relaxed">{instructions.note}</p>

      {instructions.methods.length > 0 ? (
        <ul className="space-y-3">
          {instructions.methods.map((m) => (
            <li key={m.label} className="border border-line bg-surface p-3">
              <p className="text-xs uppercase tracking-wide text-muted">{m.label}</p>
              {m.href ? (
                <a
                  href={m.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-sea break-all hover:underline"
                >
                  {m.value}
                </a>
              ) : (
                <p className="mt-1 font-mono text-sm break-all">{m.value}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-warn">{instructions.emptyHint}</p>
      )}
    </div>
  );
}
