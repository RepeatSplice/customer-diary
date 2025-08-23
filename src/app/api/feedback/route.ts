import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { inArray } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  kind: z.enum(["feature", "bug"]),
  severity: z.enum(["low", "normal", "high"]),
  title: z.string().min(3),
  details: z.string().min(5),
});

export async function GET(req: NextRequest) {
  const session = await requireSession(); // must be signed-in to see list
  const viewerId: string = session.user.id;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("query") || "").trim();
  const kind = (searchParams.get("kind") || "") as "feature" | "bug" | "";
  const severity = (searchParams.get("severity") || "") as
    | "low"
    | "normal"
    | "high"
    | "";
  const status = (searchParams.get("status") || "") as
    | "Open"
    | "Planned"
    | "InProgress"
    | "Done"
    | "Declined"
    | "";
  const sort = (searchParams.get("sort") || "top") as "top" | "new";
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "25"))
  );
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"));

  // base WHERE
  const where = and(
    kind ? eq(schema.feedbackItems.kind, kind) : undefined,
    severity ? eq(schema.feedbackItems.severity, severity) : undefined,
    status ? eq(schema.feedbackItems.status, status) : undefined,
    q
      ? or(
          ilike(schema.feedbackItems.title, `%${q}%`),
          ilike(schema.feedbackItems.details, `%${q}%`)
        )
      : undefined
  );

  // Get base feedback items
  const items = await db
    .select({
      id: schema.feedbackItems.id,
      title: schema.feedbackItems.title,
      details: schema.feedbackItems.details,
      kind: schema.feedbackItems.kind,
      severity: schema.feedbackItems.severity,
      status: schema.feedbackItems.status,
      pinned: schema.feedbackItems.pinned,
      createdAt: schema.feedbackItems.createdAt,
      updatedAt: schema.feedbackItems.updatedAt,
      createdBy: schema.feedbackItems.createdBy,
    })
    .from(schema.feedbackItems)
    .where(where)
    .orderBy(
      // pinned first always
      sql`pinned desc`,
      sort === "top" ? sql`created_at desc` : sql`created_at desc`
    )
    .limit(limit)
    .offset(offset);

  // Get votes and comments counts separately
  const itemIds = items.map((item) => item.id);

  const votesCounts: Record<string, number> = {};
  const commentsCounts: Record<string, number> = {};
  const hasVotedMap: Record<string, boolean> = {};

  if (itemIds.length > 0) {
    // Get vote counts
    const votes = await db
      .select({
        itemId: schema.feedbackVotes.itemId,
        count: sql<number>`count(*)`,
      })
      .from(schema.feedbackVotes)
      .where(inArray(schema.feedbackVotes.itemId, itemIds))
      .groupBy(schema.feedbackVotes.itemId);

    votes.forEach((v) => {
      votesCounts[v.itemId] = Number(v.count);
    });

    // Get comment counts
    const comments = await db
      .select({
        itemId: schema.feedbackComments.itemId,
        count: sql<number>`count(*)`,
      })
      .from(schema.feedbackComments)
      .where(inArray(schema.feedbackComments.itemId, itemIds))
      .groupBy(schema.feedbackComments.itemId);

    comments.forEach((c) => {
      commentsCounts[c.itemId] = Number(c.count);
    });

    // Check if current user has voted
    if (viewerId) {
      const userVotes = await db
        .select({ itemId: schema.feedbackVotes.itemId })
        .from(schema.feedbackVotes)
        .where(
          and(
            inArray(schema.feedbackVotes.itemId, itemIds),
            eq(schema.feedbackVotes.voterId, viewerId)
          )
        );

      userVotes.forEach((v) => {
        hasVotedMap[v.itemId] = true;
      });
    }
  }

  // Get creator names
  const creatorIds = [...new Set(items.map((item) => item.createdBy))];
  const creatorMap: Record<
    string,
    { name: string | null; code: string | null }
  > = {};

  if (creatorIds.length > 0) {
    const creators = await db
      .select({
        id: schema.staffUsers.id,
        fullName: schema.staffUsers.fullName,
        staffCode: schema.staffUsers.staffCode,
      })
      .from(schema.staffUsers)
      .where(inArray(schema.staffUsers.id, creatorIds));

    creators.forEach((c) => {
      creatorMap[c.id] = { name: c.fullName, code: c.staffCode };
    });
  }

  // Combine all data
  const rows = items.map((item) => ({
    ...item,
    votes: votesCounts[item.id] || 0,
    comments: commentsCounts[item.id] || 0,
    hasVoted: hasVotedMap[item.id] || false,
    creatorName: creatorMap[item.createdBy]?.name || null,
    creatorCode: creatorMap[item.createdBy]?.code || null,
  }));

  // Re-sort by votes if needed
  if (sort === "top") {
    rows.sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
      return (b.votes || 0) - (a.votes || 0);
    });
  }

  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const userId: string = session.user.id;

  const body = createSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const [row] = await db
    .insert(schema.feedbackItems)
    .values({
      createdBy: userId,
      title: body.data.title,
      details: body.data.details,
      kind: body.data.kind,
      severity: body.data.severity,
      status: "Open", // Default status for new feedback
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
