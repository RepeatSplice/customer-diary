import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({ message: z.string().min(1) });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSession();
  const { id: itemId } = await params;

  const rows = await db
    .select({
      id: schema.feedbackComments.id,
      message: schema.feedbackComments.message,
      createdAt: schema.feedbackComments.createdAt,
      authorId: schema.feedbackComments.authorId,
      authorName: sql<string>`(select su.full_name from ${schema.staffUsers} su where su.id = ${schema.feedbackComments.authorId} limit 1)`,
      authorCode: sql<string>`(select su.staff_code from ${schema.staffUsers} su where su.id = ${schema.feedbackComments.authorId} limit 1)`,
    })
    .from(schema.feedbackComments)
    .where(eq(schema.feedbackComments.itemId, itemId))
    .orderBy(sql`${schema.feedbackComments}.created_at asc`);

  return NextResponse.json({ items: rows });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const role: "staff" | "manager" = session.user.role;
  const authorId: string = session.user.id;

  if (role !== "manager") {
    return NextResponse.json({ error: "Managers only" }, { status: 403 });
  }

  const { id: itemId } = await params;
  const body = createSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const [row] = await db
    .insert(schema.feedbackComments)
    .values({ itemId, authorId: authorId!, message: body.data.message })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
