import type { Locale, Operator } from "./types";
import { formatMoney } from "./format";

export type DepositInstructions = {
  title: string;
  amount: string;
  note: string;
  methods: { label: string; value: string; href?: string }[];
  emptyHint: string;
};

export function buildDepositInstructions(
  operator: Operator,
  depositEur: number,
  locale: Locale = "it",
): DepositInstructions {
  const amount = formatMoney(depositEur);
  const methods: DepositInstructions["methods"] = [];

  if (operator.depositIban.trim()) {
    methods.push({
      label: labels.iban[locale],
      value: operator.depositIban.trim(),
    });
  }
  if (operator.depositRevolutLink.trim()) {
    const link = operator.depositRevolutLink.trim();
    methods.push({
      label: labels.revolut[locale],
      value: link,
      href: link.startsWith("http") ? link : undefined,
    });
  }
  if (operator.depositWiseLink.trim()) {
    const link = operator.depositWiseLink.trim();
    methods.push({
      label: labels.wise[locale],
      value: link,
      href: link.startsWith("http") ? link : undefined,
    });
  }

  return {
    title: labels.title[locale],
    amount,
    note: operator.depositNote.trim() || labels.defaultNote[locale],
    methods,
    emptyHint: labels.emptyHint[locale],
  };
}

export function depositReminderMessage(opts: {
  guestName: string;
  code: string;
  depositEur: number;
  operator: Operator;
  locale?: Locale;
}) {
  const locale = opts.locale ?? "it";
  const instructions = buildDepositInstructions(
    opts.operator,
    opts.depositEur,
    locale,
  );
  const lines = [
    labels.reminderIntro[locale](opts.guestName, opts.code, instructions.amount),
    "",
    instructions.note,
  ];
  for (const m of instructions.methods) {
    lines.push(`${m.label}: ${m.value}`);
  }
  lines.push("", labels.reminderOutro[locale]);
  return lines.join("\n");
}

const labels = {
  title: {
    it: "Come pagare il deposito",
    en: "How to pay the deposit",
    sq: "Si të paguani depozitën",
  },
  defaultNote: {
    it: "Paga il deposito entro 24 ore per confermare. Saldo il giorno del tour.",
    en: "Pay the deposit within 24 hours to confirm. Balance on the day of the tour.",
    sq: "Paguani depozitën brenda 24 orëve për të konfirmuar. Pjesa tjetër ditën e turit.",
  },
  emptyHint: {
    it: "L'operatore ti darà i dettagli di pagamento su WhatsApp.",
    en: "The operator will share payment details on WhatsApp.",
    sq: "Operatori do t'ju japë detajet e pagesës në WhatsApp.",
  },
  iban: { it: "IBAN", en: "IBAN", sq: "IBAN" },
  revolut: { it: "Revolut", en: "Revolut", sq: "Revolut" },
  wise: { it: "Wise", en: "Wise", sq: "Wise" },
  reminderIntro: {
    it: (name: string, code: string, amount: string) =>
      `Ciao ${name}, per confermare ${code} serve il deposito di ${amount}.`,
    en: (name: string, code: string, amount: string) =>
      `Hi ${name}, to confirm ${code} please pay the ${amount} deposit.`,
    sq: (name: string, code: string, amount: string) =>
      `Përshëndetje ${name}, për të konfirmuar ${code} duhet depozita ${amount}.`,
  },
  reminderOutro: {
    it: "Quando hai pagato, rispondi qui con la conferma. Grazie!",
    en: "Once paid, reply here to confirm. Thanks!",
    sq: "Kur të paguani, përgjigjuni këtu për të konfirmuar. Faleminderit!",
  },
};
