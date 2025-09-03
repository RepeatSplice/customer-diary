import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { productLineSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await requireSession();
  const items = (await req.json()) as unknown[];

  // Normalize and drop incomplete rows before validation
  type IncomingProduct = {
    upc?: string | null;
    name?: string;
    qty?: number | string;
    unitPrice?: number | string;
  };
  const normalized = Array.isArray(items)
    ? (items as IncomingProduct[])
        .map((i) => {
          const name = String(i?.name ?? "").trim();
          const qtyNum = Number(i?.qty);
          const unitPriceNum = Number(i?.unitPrice);
          const qty = Number.isFinite(qtyNum)
            ? Math.max(1, Math.floor(qtyNum))
            : 1;
          const unitPrice = Number.isFinite(unitPriceNum)
            ? Math.max(0, unitPriceNum)
            : 0;
          const upc = i?.upc ?? undefined;
          return { upc, name, qty, unitPrice };
        })
        .filter((p) => p.name.length > 0)
    : [];

  let parsed;
  try {
    parsed = normalized.map((i) => productLineSchema.parse(i));
  } catch (err) {
    const payload =
      err instanceof ZodError ? { issues: err.issues } : undefined;
    return NextResponse.json(
      { error: "Invalid products", ...payload },
      { status: 400 }
    );
  }

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
