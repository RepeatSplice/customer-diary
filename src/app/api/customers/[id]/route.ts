// src/app/api/customers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // NOTE: params is a Promise in your setup
) {
  await requireSession();
  const { id } = await ctx.params; // ✅ await params per Next.js warning

  const d = schema.customerDiary;

  // Count diaries that are NOT closed (i.e., not Collected or Cancelled)
  const [row] = await db
    .select({
      activeCount: sql<number>`
        coalesce(
          sum(
            case
              when ${d.status} not in ('Collected','Cancelled') then 1
              else 0
            end
          ),
          0
        )
      `,
    })
    .from(d)
    .where(eq(d.customerId, id));

  const activeCount = Number(row?.activeCount ?? 0);

  if (activeCount > 0) {
    return NextResponse.json(
      {
        error:
          "This customer has open diaries. Please close or cancel all diaries before deleting the customer.",
      },
      { status: 409 }
    );
  }

  // All diaries are closed → allow deleting the customer.
  // (Your FK is ON DELETE SET NULL, so existing closed diaries will be retained with customerId=null.)
  await db.delete(schema.customers).where(eq(schema.customers.id, id));

  return new NextResponse(null, { status: 204 });
}
