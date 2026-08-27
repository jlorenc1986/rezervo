type ToolCall = {
  id: string;
  name: string;
  arguments: string;
};

type State = {
  messages: Message[];
  n: number;
  maxSteps: number;
  seen: Set<string>;
  deadline: number;
};

type Message =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string }
  | { role: "assistant"; content: null; tool_calls: ToolCall[] }
  | { role: "tool"; tool_call_id: string; name: string; content: string };

type Result =
  | { status: "finished"; text: string; steps: number }
  | { status: "aborted"; reason: string; steps: number };

function shouldExit(state: State): Extract<Result, { status: "aborted" }> | null {
  if (Date.now() > state.deadline) {
    return { status: "aborted", reason: "timeout", steps: state.n - 1 };
  }
  if (state.n > state.maxSteps) {
    return { status: "aborted", reason: "max steps", steps: state.n - 1 };
  }
  return null;
}

export function loop(state: State): Result {
  // prima cosa e la condizione di uscita
  // se la condizione e vera, esci dal ciclo
  const early = shouldExit(state);
  if (early) return early;
  return { status: "finished", text: "", steps: state.n };
}
