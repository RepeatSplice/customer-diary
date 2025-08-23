import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  // manager-only
  pinned: z.boolean().optional(),
  status: z
    .enum(["Open", "Planned", "InProgress", "Done", "Declined"])
    .optional(),
  // creator-only (title/details edit)
  title: z.string().min(3).optional(),
  details: z.string().min(5).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSession();
  const { id } = await params;
  const [row] = await db
    .select()
    .from(schema.feedbackItems)
    .where(eq(schema.feedbackItems.id, id))
    .limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const userId: string = session.user.id;
  const role: "staff" | "manager" = session.user.role;

  const { id } = await params;
  const body = updateSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(schema.feedbackItems)
    .where(eq(schema.feedbackItems.id, id))
    .limit(1);
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = { updatedAt: sql`now()` };

  // manager-only fields
  if (body.data.pinned !== undefined || body.data.status !== undefined) {
    if (role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (body.data.pinned !== undefined) updates["pinned"] = body.data.pinned;
    if (body.data.status) updates["status"] = body.data.status;
  }

  // creator-only fields
  if (body.data.title || body.data.details) {
    if (existing.createdBy !== userId) {
      return NextResponse.json(
        { error: "Only creator can edit content" },
        { status: 403 }
      );
    }
    if (body.data.title) updates["title"] = body.data.title;
    if (body.data.details) updates["details"] = body.data.details;
  }

  const [row] = await db
    .update(schema.feedbackItems)
    .set(updates)
    .where(eq(schema.feedbackItems.id, id))
    .returning();

  return NextResponse.json(row);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const userId: string = session.user.id;

  const { id } = await params;
  const [existing] = await db
    .select({ createdBy: schema.feedbackItems.createdBy })
    .from(schema.feedbackItems)
    .where(eq(schema.feedbackItems.id, id))
    .limit(1);

  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.createdBy !== userId) {
    return NextResponse.json(
      { error: "Only creator can delete" },
      { status: 403 }
    );
  }

  await db.delete(schema.feedbackItems).where(eq(schema.feedbackItems.id, id));
  return new NextResponse(null, { status: 204 });
}
