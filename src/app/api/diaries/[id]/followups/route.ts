import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { followupCreateSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: diaryId } = await params;
  const session = await requireSession();
  const body = followupCreateSchema.parse(await req.json());
  const [f] = await db
    .insert(schema.diaryFollowups)
    .values({
      diaryId: diaryId,
      entryType: body.entryType,
      message: body.message,
      staffCode: body.staffCode || session.user.staffCode,
    })
    .returning();
  return NextResponse.json(f);
}

export async function PATCH(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params: { params: Promise<{ id: string }> }
) {
  await requireSession();
  const body = await req.json();

  const [f] = await db
    .update(schema.diaryFollowups)
    .set({
      entryType: body.entryType,
      message: body.message,
      staffCode: body.staffCode || null,
    })
    .where(eq(schema.diaryFollowups.id, body.id))
    .returning();

  return NextResponse.json(f);
}

export async function DELETE(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params: { params: Promise<{ id: string }> }
) {
  await requireSession();
  const { searchParams } = new URL(req.url);
  const followupId = searchParams.get("id");

  if (!followupId) {
    return NextResponse.json(
      { error: "Follow-up ID required" },
      { status: 400 }
    );
  }

  await db
    .delete(schema.diaryFollowups)
    .where(eq(schema.diaryFollowups.id, followupId));

  return NextResponse.json({ ok: true });
}
