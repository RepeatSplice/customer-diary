import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  await requireSession();
  await db
    .delete(schema.diaryProducts)
    .where(eq(schema.diaryProducts.id, productId));
  return NextResponse.json({ ok: true });
}
