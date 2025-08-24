import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PrintDiary({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const creator = alias(schema.staffUsers, "creator");
  const assignee = alias(schema.staffUsers, "assignee");

  // Base diary + customer + staff
  const [base] = await db
    .select({
      id: schema.customerDiary.id,
      whatTheyWant: schema.customerDiary.whatTheyWant,
      status: schema.customerDiary.status,
      priority: schema.customerDiary.priority,
      isPaid: schema.customerDiary.isPaid,
      isOrdered: schema.customerDiary.isOrdered,
      subtotal: schema.customerDiary.subtotal,
      total: schema.customerDiary.total,
      createdAt: schema.customerDiary.createdAt,

      // customer
      customerName: schema.customers.name,
      customerPhone: schema.customers.phone,
      customerEmail: schema.customers.email,
      customerAccountNo: schema.customers.accountNo,

      // staff
      createdByCode: schema.customerDiary.createdByCode,
      creatorCode: creator.staffCode,
      creatorName: creator.fullName,
      assigneeCode: assignee.staffCode,
      assigneeName: assignee.fullName,
    })
    .from(schema.customerDiary)
    .leftJoin(
      schema.customers,
      eq(schema.customers.id, schema.customerDiary.customerId)
    )
    .leftJoin(creator, eq(creator.id, schema.customerDiary.createdBy))
    .leftJoin(assignee, eq(assignee.id, schema.customerDiary.assignedTo))
    .where(eq(schema.customerDiary.id, id))
    .limit(1);

  if (!base) return <div>Not found</div>;

  // Products
  const products = await db
    .select({
      id: schema.diaryProducts.id,
      upc: schema.diaryProducts.upc,
      name: schema.diaryProducts.name,
      qty: schema.diaryProducts.qty,
      unitPrice: schema.diaryProducts.unitPrice,
      lineTotal: schema.diaryProducts.lineTotal,
    })
    .from(schema.diaryProducts)
    .where(eq(schema.diaryProducts.diaryId, id));

  // Followups
  const followups = await db
    .select({
      id: schema.diaryFollowups.id,
      entryType: schema.diaryFollowups.entryType,
      message: schema.diaryFollowups.message,
      staffCode: schema.diaryFollowups.staffCode,
      createdAt: schema.diaryFollowups.createdAt,
    })
    .from(schema.diaryFollowups)
    .where(eq(schema.diaryFollowups.diaryId, id))
    .orderBy(desc(schema.diaryFollowups.createdAt));

  const created = new Date(String(base.createdAt));
  const shortId = String(base.id).slice(0, 8);

  return (
    <div>
      <style>{`
        @media print { @page { size: A4; margin: 12mm; } }
        :root { color-scheme: light; }
        body { font-family: ui-sans-serif, system-ui; color: #111827; }

        .doc { max-width: 800px; margin: 0 auto; }
        .hdr {
          display:flex; align-items: baseline; justify-content: space-between;
          border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px;
        }
        .brand { font-weight: 800; letter-spacing: 0.4px; font-size: 18px; }
        .title { font-weight: 700; font-size: 18px; }
        .muted { color: #6b7280; }

        .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        table { width:100%; border-collapse: collapse; }
        th, td { border:1px solid #e5e7eb; padding:6px; font-size:12px; }
        tfoot td { font-weight: 600; }

        .badge {
          display:inline-block; padding: 2px 8px; border-radius: 9999px;
          border: 1px solid #d1d5db; font-size: 11px; font-weight: 600;
        }
      `}</style>

      <div className="doc">
        <div className="hdr">
          <div className="brand">Customer Order / Diary</div>
          <div className="muted">#{shortId}</div>
        </div>

        <div className="grid">
          <div>
            <p>
              <b>Customer:</b> {base.customerName ?? "-"}
            </p>
            <p>
              <b>Phone:</b> {base.customerPhone ?? "-"} &nbsp; <b>Email:</b>{" "}
              {base.customerEmail ?? "-"}
            </p>
            <p>
              <b>Account #:</b> {base.customerAccountNo ?? "-"}
            </p>
          </div>
          <div>
            <p>
              <b>Status:</b> <span className="badge">{base.status}</span> &nbsp;{" "}
              <b>Priority:</b> <span className="badge">{base.priority}</span>
            </p>
            <p>
              <b>Paid:</b> {base.isPaid ? "Yes" : "No"} &nbsp; <b>Ordered:</b>{" "}
              {base.isOrdered ? "Yes" : "No"}
            </p>
            <p>
              <b>Created:</b> {created.toLocaleString()}
            </p>
          </div>
        </div>

        <p style={{ marginTop: 6 }}>
          <b>Request:</b> {base.whatTheyWant}
        </p>

        <div style={{ marginTop: 8, marginBottom: 8 }}>
          <b>Staff</b>
          <div className="grid" style={{ marginTop: 4 }}>
            <div>
              <div>
                <b>Created by:</b>{" "}
                {base.createdByCode ?? base.creatorCode ?? "-"}{" "}
                {base.creatorName ? `— ${base.creatorName}` : ""}
              </div>
            </div>
            <div>
              <div>
                <b>Assigned to:</b> {base.assigneeCode ?? "-"}{" "}
                {base.assigneeName ? `— ${base.assigneeName}` : ""}
              </div>
            </div>
          </div>
        </div>

        <h3>Products</h3>
        <table>
          <thead>
            <tr>
              <th>UPC</th>
              <th>Name</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={String(p.id)}>
                <td>{p.upc ?? ""}</td>
                <td>{p.name}</td>
                <td>{p.qty}</td>
                <td>{p.unitPrice}</td>
                <td>{p.lineTotal}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{ textAlign: "right" }}>
                Subtotal
              </td>
              <td>{base.subtotal}</td>
            </tr>
            <tr>
              <td colSpan={4} style={{ textAlign: "right" }}>
                <b>Total</b>
              </td>
              <td>
                <b>{base.total}</b>
              </td>
            </tr>
          </tfoot>
        </table>

        <h3 style={{ marginTop: 12 }}>Follow-ups</h3>
        <ul>
          {followups.map((f) => (
            <li key={String(f.id)}>
              [{new Date(String(f.createdAt)).toLocaleString()}]{" "}
              <b>{f.staffCode}</b> ({f.entryType}) – {f.message}
            </li>
          ))}
        </ul>

        <p style={{ marginTop: 24 }}>
          <i>
            Signature: ______________________ &nbsp;&nbsp; Date: ____________
          </i>
        </p>
      </div>
    </div>
  );
}
