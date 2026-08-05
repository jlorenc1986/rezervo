import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { mapOperator } from "@/lib/db/mappers";
import { operators } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import type { Operator } from "@/lib/types";

export async function getAuthUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getOperatorForUser(
  authUserId: string,
): Promise<Operator | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(operators)
    .where(eq(operators.authUserId, authUserId))
    .limit(1);
  return rows[0] ? mapOperator(rows[0]) : undefined;
}

export async function requireUser() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireOperator(): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;
  operator: Operator;
}> {
  const user = await requireUser();
  const operator = await getOperatorForUser(user.id);
  if (!operator) redirect("/onboarding");
  return { user, operator };
}
