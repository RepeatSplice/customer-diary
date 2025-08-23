import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { diaryCreateSchema } from "@/lib/validators";
import { parseDiariesQuery } from "@/lib/filters";
import { and, desc, eq, ilike, notInArray, sql, type SQL } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  await requireSession();
  const sp = parseDiariesQuery(new URL(req.url).searchParams);

  const where: SQL[] = [
    sp.archived ? sql`true` : sql`${schema.customerDiary.archivedAt} is null`,
  ];
  if (sp.status)
    where.push(
      eq(
        schema.customerDiary.status,
        sp.status as (typeof schema.status_t.enumValues)[number]
      )
    );
  if (sp.priority)
    where.push(
      eq(
        schema.customerDiary.priority,
        sp.priority as (typeof schema.priority_t.enumValues)[number]
      )
    );
  if (sp.text) {
    where.push(ilike(schema.customerDiary.whatTheyWant, `%${sp.text}%`));
  }
  if (sp.overdue) {
    where.push(
      sql`coalesce(${schema.customerDiary.lastViewedAt}, ${schema.customerDiary.createdAt}) < now() - interval '3 days'`
    );
    where.push(
      notInArray(schema.customerDiary.status, ["Collected", "Cancelled"])
    );
  }

  const rows = await db.query.customerDiary.findMany({
    where: and(...where),
    orderBy: [desc(schema.customerDiary.createdAt)],
    limit: sp.limit,
    offset: sp.offset,
    with: { customer: true },
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = diaryCreateSchema.parse(await req.json());

  let customerId = body.customerId;
  if (!customerId && body.customerInline) {
    const [c] = await db
      .insert(schema.customers)
      .values({
        name: body.customerInline.name,
        email: body.customerInline.email,
        phone: body.customerInline.phone,
        accountNo: body.customerInline.accountNo,
      })
      .returning();
    customerId = (c as { id: string }).id;
  }

  const [d] = await db
    .insert(schema.customerDiary)
    .values({
      customerId,
      createdBy: session.user.id,
      createdByCode: session.user.staffCode,
      whatTheyWant: body.whatTheyWant,
      priority: body.priority,
      dueDate: body.dueDate ?? null,
      isPaid: body.isPaid,
      isOrdered: body.isOrdered,
      hasTextedCustomer: body.hasTextedCustomer,
      adminNotes: body.adminNotes,
    })
    .returning();

  if (body.products?.length) {
    await db.insert(schema.diaryProducts).values(
      body.products.map((p) => ({
        diaryId: (d as { id: string }).id,
        upc: p.upc,
        name: p.name,
        qty: p.qty,
        unitPrice: String(p.unitPrice),
      }))
    );
  }

  return NextResponse.json(d);
}
