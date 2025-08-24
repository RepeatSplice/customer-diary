import { NextResponse } from "next/server";
import { db } from "@/app/db/client";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    // Test basic connection
    const result = await db.execute(sql`SELECT 1 as test`);
    return NextResponse.json({ status: "ok", result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
