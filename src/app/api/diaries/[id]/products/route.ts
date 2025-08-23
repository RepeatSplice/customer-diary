import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { productLineSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await requireSession();
  const items = (await req.json()) as unknown[];
  const parsed = items.map((i) => productLineSchema.parse(i));

  await db
    .delete(schema.diaryProducts)
    .where(eq(schema.diaryProducts.diaryId, id));
  if (parsed.length) {
    await db.insert(schema.diaryProducts).values(
      parsed.map((p) => ({
        diaryId: id,
        upc: p.upc,
        name: p.name,
        qty: p.qty,
        unitPrice: String(p.unitPrice),
      }))
    );
  }
  return NextResponse.json({ ok: true });
}
