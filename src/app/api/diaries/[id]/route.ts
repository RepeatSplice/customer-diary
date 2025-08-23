import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { diaryPatchSchema } from "@/lib/validators";
import { eq, desc } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSession();
  const { id } = await params;

  try {
    // 1) Base diary + customer (left join)
    const [base] = await db
      .select({
        id: schema.customerDiary.id,
        customerId: schema.customerDiary.customerId,
        createdBy: schema.customerDiary.createdBy,
        assignedTo: schema.customerDiary.assignedTo,
        createdByCode: schema.customerDiary.createdByCode,
        whatTheyWant: schema.customerDiary.whatTheyWant,
        status: schema.customerDiary.status,
        priority: schema.customerDiary.priority,
        isPaid: schema.customerDiary.isPaid,
        isOrdered: schema.customerDiary.isOrdered,
        hasTextedCustomer: schema.customerDiary.hasTextedCustomer,
        adminNotes: schema.customerDiary.adminNotes,
        dueDate: schema.customerDiary.dueDate,
        lastViewedAt: schema.customerDiary.lastViewedAt,
        archivedAt: schema.customerDiary.archivedAt,
        subtotal: schema.customerDiary.subtotal,
        tax: schema.customerDiary.tax,
        total: schema.customerDiary.total,
        createdAt: schema.customerDiary.createdAt,
        updatedAt: schema.customerDiary.updatedAt,
        customer: {
          id: schema.customers.id,
          name: schema.customers.name,
          email: schema.customers.email,
          phone: schema.customers.phone,
          accountNo: schema.customers.accountNo,
          createdAt: schema.customers.createdAt,
        },
      })
      .from(schema.customerDiary)
      .leftJoin(
        schema.customers,
        eq(schema.customers.id, schema.customerDiary.customerId)
      )
      .where(eq(schema.customerDiary.id, id))
      .limit(1);

    if (!base)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // 2) Products
    const products = await db
      .select({
        id: schema.diaryProducts.id,
        diaryId: schema.diaryProducts.diaryId,
        upc: schema.diaryProducts.upc,
        name: schema.diaryProducts.name,
        qty: schema.diaryProducts.qty,
        unitPrice: schema.diaryProducts.unitPrice,
        lineTotal: schema.diaryProducts.lineTotal,
      })
      .from(schema.diaryProducts)
      .where(eq(schema.diaryProducts.diaryId, id));

    // 3) Followups
    const followups = await db
      .select({
        id: schema.diaryFollowups.id,
        diaryId: schema.diaryFollowups.diaryId,
        entryType: schema.diaryFollowups.entryType,
        message: schema.diaryFollowups.message,
        staffCode: schema.diaryFollowups.staffCode,
        createdAt: schema.diaryFollowups.createdAt,
      })
      .from(schema.diaryFollowups)
      .where(eq(schema.diaryFollowups.diaryId, id))
      .orderBy(desc(schema.diaryFollowups.createdAt));

    // 4) Attachments
    const attachments = await db
      .select({
        id: schema.attachments.id,
        diaryId: schema.attachments.diaryId,
        fileName: schema.attachments.fileName,
        filePath: schema.attachments.filePath,
        mimeType: schema.attachments.mimeType,
        sizeBytes: schema.attachments.sizeBytes,
        uploadedBy: schema.attachments.uploadedBy,
        uploadedAt: schema.attachments.uploadedAt,
      })
      .from(schema.attachments)
      .where(eq(schema.attachments.diaryId, id))
      .orderBy(desc(schema.attachments.uploadedAt));

    // Update last viewed (non-blocking)
    await db
      .update(schema.customerDiary)
      .set({ lastViewedAt: new Date() })
      .where(eq(schema.customerDiary.id, id));

    // Assemble response
    const result = {
      ...base,
      customer: base.customer?.id
        ? {
            id: base.customer.id,
            name: base.customer.name,
            email: base.customer.email,
            phone: base.customer.phone,
            accountNo: base.customer.accountNo,
            createdAt: base.customer.createdAt,
          }
        : null,
      products,
      followups,
      attachments,
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireSession();

  const body = diaryPatchSchema.parse(await req.json());
  if (
    body.status === "Collected" &&
    body.isPaid === false &&
    session.user.role !== "manager"
  ) {
    return NextResponse.json(
      { error: "Cannot set Collected unless paid (manager overrides)" },
      { status: 400 }
    );
  }

  const [row] = await db
    .update(schema.customerDiary)
    .set({
      status: body.status,
      priority: body.priority,
      isPaid: body.isPaid,
      isOrdered: body.isOrdered,
      hasTextedCustomer: body.hasTextedCustomer,
      adminNotes: body.adminNotes,
      assignedTo: body.assignedTo,
    })
    .where(eq(schema.customerDiary.id, id))
    .returning();

  return NextResponse.json(row);
}
