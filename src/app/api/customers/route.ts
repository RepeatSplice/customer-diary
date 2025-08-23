import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { customerUpsertSchema } from "@/lib/validators";
import { ilike, or, eq, sql } from "drizzle-orm";

export const runtime = "nodejs";

// -------- GET: list customers with aggregates --------
export async function GET(req: NextRequest) {
  await requireSession();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("query") || "").trim();
  const limit = Number(searchParams.get("limit") || 50);

  const c = schema.customers;
  const d = schema.customerDiary;

  // When query is empty, ilike('%%') will match all rows, so we still return everything.
  const where =
    q.length > 0
      ? or(
          ilike(c.name, `%${q}%`),
          ilike(c.email, `%${q}%`),
          ilike(c.phone, `%${q}%`),
          ilike(c.accountNo, `%${q}%`)
        )
      : undefined;

  const rows = await db
    .select({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      accountNo: c.accountNo,
      createdAt: c.createdAt,

      // aggregates computed across diaries
      diariesTotal: sql<number>`count(${d.id})`,
      activeTotal: sql<number>`
        sum(case
              when ${d.id} is not null
               and ${d.status} not in ('Collected','Cancelled')
              then 1 else 0
            end)
      `,
      overdueTotal: sql<number>`
        sum(case
              when ${d.dueDate} is not null
               and ${d.dueDate} < now()::date
               and ${d.status} not in ('Collected','Cancelled')
              then 1 else 0
            end)
      `,
      lastActivityAt: sql<string | null>`max(${d.updatedAt})`,
      staff: sql<string | null>`max(${d.createdByCode})`,
    })
    .from(c)
    .leftJoin(d, eq(d.customerId, c.id))
    .where(where)
    .groupBy(c.id)
    // order by most recent diary activity, then created date
    .orderBy(sql`max(${d.updatedAt}) desc nulls last`, sql`${c.createdAt} desc`)
    .limit(limit);

  const out = rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email ?? null,
    phone: r.phone ?? null,
    accountNo: r.accountNo ?? null,
    createdAt: r.createdAt,
    diariesTotal: Number(r.diariesTotal ?? 0),
    activeTotal: Number(r.activeTotal ?? 0),
    overdueTotal: Number(r.overdueTotal ?? 0),
    lastActivityAt: r.lastActivityAt,
    staff: r.staff ?? null,
  }));

  return NextResponse.json(out);
}

// -------- POST: create / update (kept from your version) --------
export async function POST(req: NextRequest) {
  await requireSession();
  const data = customerUpsertSchema.parse(await req.json());
  if (data.id) {
    const [row] = await db
      .update(schema.customers)
      .set({
        name: data.name,
        email: data.email,
        phone: data.phone,
        accountNo: data.accountNo,
      })
      .where(eq(schema.customers.id, data.id))
      .returning();
    return NextResponse.json(row);
  } else {
    const [row] = await db
      .insert(schema.customers)
      .values({
        name: data.name,
        email: data.email,
        phone: data.phone,
        accountNo: data.accountNo,
      })
      .returning();
    return NextResponse.json(row);
  }
}
