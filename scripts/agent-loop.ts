/**
 * Teaching script: the agent loop as recursion.
 *
 *   npx tsx scripts/agent-loop.ts
 *   npx tsx scripts/agent-loop.ts --demo max
 *   npx tsx scripts/agent-loop.ts --demo loop
 *
 * No API key. The "model" is a tiny deterministic function so you can
 * watch base cases fire: finish, max steps, repeated tool call.
 */

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

type AgentContext = { operatorId: string };

const OPERATOR_ID = "op-demo";

const slots = [
  { id: "slot-sat-20", date: "2026-08-29", time: "20:00", remaining: 6 },
  { id: "slot-sat-21", date: "2026-08-29", time: "21:00", remaining: 2 },
];

const holds: { slotId: string; guestName: string; phone: string }[] = [];

const tools = {
  check_availability: {
    description: "List free slots for a date and party size.",
    async execute(args: { date: string; partySize: number }, ctx: AgentContext) {
      if (ctx.operatorId !== OPERATOR_ID) return { error: "FORBIDDEN" };
      return slots.filter(
        (slot) => slot.date === args.date && slot.remaining >= args.partySize,
      );
    },
  },
  create_hold: {
    description: "Hold a real slotId from check_availability.",
    async execute(
      args: { slotId: string; guestName: string; phone: string },
      ctx: AgentContext,
    ) {
      if (ctx.operatorId !== OPERATOR_ID) return { error: "FORBIDDEN" };
      const slot = slots.find((item) => item.id === args.slotId);
      if (!slot) return { error: "UNKNOWN_SLOT" };
      if (slot.remaining < 1) return { error: "FULL" };
      slot.remaining -= 1;
      holds.push(args);
      return { holdId: `hold-${holds.length}`, ...args, time: slot.time };
    },
  },
};

function indent(n: number) {
  return "  ".repeat(n - 1);
}

function log(n: number, message: string) {
  console.log(`${indent(n)}${message}`);
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

function llm(messages: Message[], demo: Demo): LlmOut {
  if (demo === "loop") {
    return {
      type: "tools",
      calls: [
        {
          id: `call-${messages.length}`,
          name: "check_availability",
          arguments: JSON.stringify({ date: "2026-08-29", partySize: 4 }),
        },
      ],
    };
  }

  const saw = (name: string) =>
    messages.some((message) => message.role === "tool" && message.name === name);

  if (!saw("check_availability")) {
    return {
      type: "tools",
      calls: [
        {
          id: "call-1",
          name: "check_availability",
          arguments: JSON.stringify({ date: "2026-08-29", partySize: 4 }),
        },
      ],
    };
  }

  if (!saw("create_hold")) {
    return {
      type: "tools",
      calls: [
        {
          id: "call-2",
          name: "create_hold",
          arguments: JSON.stringify({
            slotId: "slot-sat-20",
            guestName: "Anna",
            phone: "+39 333 0000000",
          }),
        },
      ],
    };
  }

  return {
    type: "text",
    text: "Prenotazione in hold: sabato 29 agosto alle 20:00, 4 persone, a nome Anna.",
  };
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

async function step(state: State, demo: Demo, ctx: AgentContext): Promise<Result> {
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

  const next: State = {
    ...state,
    messages: [
      ...state.messages,
      { role: "assistant", content: null, tool_calls: out.calls },
      ...observations,
    ],
    n: state.n + 1,
  };

  const result = await step(next, demo, ctx);
  log(state.n, `← n=${state.n} unwind`);
  return result;
}

function parseDemo(argv: string[]): Demo {
  const flag = argv.find((arg) => arg.startsWith("--demo"));
  if (!flag) return "happy";
  const value = flag.includes("=") ? flag.split("=")[1] : argv[argv.indexOf(flag) + 1];
  if (value === "max" || value === "loop" || value === "happy") return value;
  throw new Error(`Unknown demo "${value}". Use happy | max | loop.`);
}

async function main() {
  const demo = parseDemo(process.argv.slice(2));
  const maxSteps = demo === "max" ? 2 : 8;

  console.log(`demo=${demo}  maxSteps=${maxSteps}\n`);

  const result = await step(
    {
      messages: [
        {
          role: "system",
          content: "Non inventare slot. Chiama i tool. Una azione alla volta.",
        },
        {
          role: "user",
          content: "Tavolo per 4 sabato sera, a nome Anna.",
        },
      ],
      n: 1,
      maxSteps,
      seen: new Set(),
      deadline: Date.now() + 5_000,
    },
    demo,
    { operatorId: OPERATOR_ID },
  );

  console.log("\nresult:", result);
  if (holds.length) console.log("holds:", holds);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
