import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { and, eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const voterId: string = session.user.id;
  const { id: itemId } = await params;

  const existing = await db
    .select({ id: schema.feedbackVotes.id })
    .from(schema.feedbackVotes)
    .where(
      and(
        eq(schema.feedbackVotes.itemId, itemId),
        eq(schema.feedbackVotes.voterId, voterId)
      )
    )
    .limit(1);

  let voted: boolean;
  if (existing.length) {
    await db
      .delete(schema.feedbackVotes)
      .where(eq(schema.feedbackVotes.id, existing[0].id));
    voted = false;
  } else {
    await db.insert(schema.feedbackVotes).values({ itemId, voterId });
    voted = true;
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.feedbackVotes)
    .where(eq(schema.feedbackVotes.itemId, itemId));

  return NextResponse.json({ voted, votes: Number(count || 0) });
}
