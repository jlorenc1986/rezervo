/**
 * Same recursive loop as scripts/agent-loop.ts, wired to Rezervo.
 *
 *   npx tsx scripts/agent-rezervo.ts
 *   npx tsx scripts/agent-rezervo.ts --demo max
 *   npx tsx scripts/agent-rezervo.ts --demo loop
 *   npx tsx scripts/agent-rezervo.ts --write
 *
 * Default is dry-run: check_availability hits the DB, create_hold does not.
 * Needs DATABASE_URL and the demo operator (npm run db:seed).
 */

import { config } from "dotenv";
import { closeDb } from "../src/lib/db/client";
import { todayIso } from "../src/lib/format";
import {
  createBooking,
  getAvailability,
  getOperatorBySlug,
  getServicesForOperator,
} from "../src/lib/store";

config({ path: ".env.local" });
config({ path: ".env" });

type Demo = "happy" | "max" | "loop";

type ToolCall = {
  id: string;
  name: string;
  arguments: string;
};

type Message =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string }
  | { role: "assistant"; content: null; tool_calls: ToolCall[] }
  | { role: "tool"; tool_call_id: string; name: string; content: string };

type LlmOut =
  | { type: "text"; text: string }
  | { type: "tools"; calls: ToolCall[] };

type AbortResult = { status: "aborted"; reason: string; steps: number };
type Result =
  | { status: "finished"; text: string; steps: number }
  | AbortResult;

type State = {
  messages: Message[];
  n: number;
  maxSteps: number;
  seen: Set<string>;
  deadline: number;
};

type AgentContext = {
  operatorId: string;
  dryRun: boolean;
};

const SLUG = "blue-ionian";

function indent(n: number) {
  return "  ".repeat(n - 1);
}

function log(n: number, message: string) {
  console.log(`${indent(n)}${message}`);
}

function lastToolJson(messages: Message[], name: string): unknown {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === "tool" && message.name === name) {
      try {
        return JSON.parse(message.content);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function sawTool(messages: Message[], name: string) {
  return messages.some((message) => message.role === "tool" && message.name === name);
}

function shouldExit(state: State): AbortResult | null {
  if (Date.now() > state.deadline) {
    return { status: "aborted", reason: "timeout", steps: state.n - 1 };
  }
  if (state.n > state.maxSteps) {
    return { status: "aborted", reason: "max steps", steps: state.n - 1 };
  }
  return null;
}

const tools = {
  list_services: {
    async execute(_args: Record<string, never>, ctx: AgentContext) {
      const services = await getServicesForOperator(ctx.operatorId);
      return services.map((service) => ({
        id: service.id,
        name: service.nameIt,
        capacity: service.capacity,
        departures: service.departures,
      }));
    },
  },
  check_availability: {
    async execute(
      args: { serviceId: string; fromDate: string; guests: number },
      ctx: AgentContext,
    ) {
      const services = await getServicesForOperator(ctx.operatorId);
      const owned = services.some((service) => service.id === args.serviceId);
      if (!owned) return { error: "FORBIDDEN" };

      const slots = await getAvailability(args.serviceId, args.fromDate, 14);
      return slots
        .filter((slot) => slot.remaining >= args.guests)
        .slice(0, 8)
        .map((slot) => ({
          serviceId: args.serviceId,
          date: slot.date,
          time: slot.time,
          remaining: slot.remaining,
        }));
    },
  },
  create_hold: {
    async execute(
      args: {
        serviceId: string;
        date: string;
        time: string;
        guestName: string;
        guestPhone: string;
        guests: number;
      },
      ctx: AgentContext,
    ) {
      if (ctx.dryRun) {
        const slots = await getAvailability(args.serviceId, args.date, 1);
        const slot = slots.find((item) => item.time === args.time);
        if (!slot || slot.remaining < args.guests) {
          return { error: "FULL", dryRun: true };
        }
        return { dryRun: true, wouldCreate: args };
      }

      return createBooking({
        operatorId: ctx.operatorId,
        serviceId: args.serviceId,
        date: args.date,
        time: args.time,
        guestName: args.guestName,
        guestPhone: args.guestPhone,
        guestLocale: "it",
        guests: args.guests,
        notes: "agent-rezervo script",
        source: "ops",
      });
    },
  },
};

function llm(messages: Message[], demo: Demo): LlmOut {
  if (demo === "loop") {
    return {
      type: "tools",
      calls: [
        {
          id: `call-${messages.length}`,
          name: "list_services",
          arguments: "{}",
        },
      ],
    };
  }

  if (!sawTool(messages, "list_services")) {
    return {
      type: "tools",
      calls: [{ id: "call-1", name: "list_services", arguments: "{}" }],
    };
  }

  if (!sawTool(messages, "check_availability")) {
    const listed = lastToolJson(messages, "list_services");
    const first =
      Array.isArray(listed) && listed[0] && typeof listed[0] === "object"
        ? (listed[0] as { id?: string })
        : null;
    if (!first?.id) {
      return { type: "text", text: "Nessun servizio per questo operatore." };
    }
    return {
      type: "tools",
      calls: [
        {
          id: "call-2",
          name: "check_availability",
          arguments: JSON.stringify({
            serviceId: first.id,
            fromDate: todayIso(),
            guests: 4,
          }),
        },
      ],
    };
  }

  if (!sawTool(messages, "create_hold")) {
    const slots = lastToolJson(messages, "check_availability");
    if (!Array.isArray(slots) || slots.length === 0) {
      return {
        type: "text",
        text: "Nessuno slot libero per 4 persone nei prossimi 14 giorni.",
      };
    }
    const slot = slots[0] as {
      serviceId: string;
      date: string;
      time: string;
    };
    return {
      type: "tools",
      calls: [
        {
          id: "call-3",
          name: "create_hold",
          arguments: JSON.stringify({
            serviceId: slot.serviceId,
            date: slot.date,
            time: slot.time,
            guestName: "Anna",
            guestPhone: "+355 69 200 0111",
            guests: 4,
          }),
        },
      ],
    };
  }

  const hold = lastToolJson(messages, "create_hold") as {
    dryRun?: boolean;
    ok?: boolean;
    error?: string;
    booking?: { code: string; date: string; time: string };
    wouldCreate?: { date: string; time: string };
  } | null;

  if (hold && "error" in hold && hold.error) {
    return { type: "text", text: `Hold fallito: ${hold.error}` };
  }
  if (hold?.dryRun && hold.wouldCreate) {
    return {
      type: "text",
      text: `Dry-run: terrei 4 posti il ${hold.wouldCreate.date} alle ${hold.wouldCreate.time} a nome Anna. Rilancia con --write per scrivere nel DB.`,
    };
  }
  if (hold?.ok && hold.booking) {
    return {
      type: "text",
      text: `Prenotazione ${hold.booking.code}: ${hold.booking.date} ${hold.booking.time}, 4 persone, Anna.`,
    };
  }
  return { type: "text", text: "Fatto." };
}

async function dispatch(call: ToolCall, ctx: AgentContext) {
  const tool = tools[call.name as keyof typeof tools];
  if (!tool) return { error: `unknown tool: ${call.name}` };

  let args: never;
  try {
    args = JSON.parse(call.arguments) as never;
  } catch {
    return { error: "invalid JSON arguments" };
  }

  return tool.execute(args, ctx);
}

async function step(
  state: State,
  demo: Demo,
  ctx: AgentContext,
): Promise<Result> {
  log(state.n, `→ step n=${state.n}  messages=${state.messages.length}`);

  const early = shouldExit(state);
  if (early) {
    log(state.n, `← BASE ${early.status} (${early.reason})`);
    return early;
  }

  const out = llm(state.messages, demo);

  if (out.type === "text") {
    log(state.n, `  llm → testo`);
    log(state.n, `← BASE finished`);
    return { status: "finished", text: out.text, steps: state.n };
  }

  log(
    state.n,
    `  llm → tool ${out.calls.map((call) => call.name).join(", ")}`,
  );

  const observations: Message[] = [];
  for (const call of out.calls) {
    const key = `${call.name}:${call.arguments}`;
    if (state.seen.has(key)) {
      log(state.n, `← BASE aborted (repeated tool call)`);
      return {
        status: "aborted",
        reason: `repeated tool call: ${call.name}`,
        steps: state.n,
      };
    }
    state.seen.add(key);

    const result = await dispatch(call, ctx);
    log(state.n, `  execute ${call.name} → ${JSON.stringify(result)}`);
    observations.push({
      role: "tool",
      tool_call_id: call.id,
      name: call.name,
      content: JSON.stringify(result),
    });
  }

  const result = await step(
    {
      ...state,
      messages: [
        ...state.messages,
        { role: "assistant", content: null, tool_calls: out.calls },
        ...observations,
      ],
      n: state.n + 1,
    },
    demo,
    ctx,
  );
  log(state.n, `← n=${state.n} unwind`);
  return result;
}

function parseDemo(argv: string[]): Demo {
  const flag = argv.find((arg) => arg.startsWith("--demo"));
  if (!flag) return "happy";
  const value = flag.includes("=")
    ? flag.split("=")[1]
    : argv[argv.indexOf(flag) + 1];
  if (value === "max" || value === "loop" || value === "happy") return value;
  throw new Error(`Unknown demo "${value}". Use happy | max | loop.`);
}

async function main() {
  const argv = process.argv.slice(2);
  const demo = parseDemo(argv);
  const dryRun = !argv.includes("--write");
  const maxSteps = demo === "max" ? 2 : 8;

  const operator = await getOperatorBySlug(SLUG);
  if (!operator) {
    throw new Error(
      `Operator ${SLUG} not found. Start the DB and run npm run db:seed.`,
    );
  }

  console.log(
    `demo=${demo}  maxSteps=${maxSteps}  dryRun=${dryRun}  operator=${operator.slug}\n`,
  );

  const result = await step(
    {
      messages: [
        {
          role: "system",
          content:
            "Non inventare slot. Chiama i tool. Una azione alla volta.",
        },
        {
          role: "user",
          content: "Quattro posti in barca nei prossimi giorni, a nome Anna.",
        },
      ],
      n: 1,
      maxSteps,
      seen: new Set(),
      deadline: Date.now() + 15_000,
    },
    demo,
    { operatorId: operator.id, dryRun },
  );

  console.log("\nresult:", result);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
