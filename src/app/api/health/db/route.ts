import { NextResponse } from "next/server";
import postgres from "postgres";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";

// A. Test raw postgres-js first (bypasses Drizzle)
async function testPostgres() {
  const client = postgres(process.env.DATABASE_URL!, {
    ssl: "require",
    prepare: false,
    max: 1,
  });
  try {
    const rows = await client`select now() as now`;
    return { ok: true, layer: "postgres-js", now: rows?.[0]?.now ?? null };
  } finally {
    await client.end();
  }
}

// B. Then test Drizzle
async function testDrizzle() {
  const r = await db.execute(sql`select now() as now`);
  return {
    ok: true,
    layer: "drizzle",
    now: (r as unknown as { rows: { now: string }[] }).rows?.[0]?.now ?? null,
  };
}

export async function GET() {
  try {
    const postgresResult = await testPostgres();
    const drizzleResult = await testDrizzle();
    return NextResponse.json({ postgresResult, drizzleResult });
  } catch (e: unknown) {
    const error = e as Error & {
      code?: string;
      detail?: string;
      hint?: string;
    };
    return NextResponse.json(
      {
        ok: false,
        message: error?.message || String(error),
        code: error?.code,
        detail: error?.detail,
        hint: error?.hint,
        stack: error?.stack,
      },
      { status: 500 }
    );
  }
}
