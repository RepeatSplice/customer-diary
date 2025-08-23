import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Label({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const creator = alias(schema.staffUsers, "creator");
  const assignee = alias(schema.staffUsers, "assignee");

  const [row] = await db
    .select({
      id: schema.customerDiary.id,
      createdAt: schema.customerDiary.createdAt,
      status: schema.customerDiary.status,
      // customer
      customerName: schema.customers.name,
      customerPhone: schema.customers.phone,
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

  if (!row) return <div>Not found</div>;

  const created = new Date(String(row.createdAt));
  const shortId = String(row.id).slice(0, 8);

  return (
    <div>
      <style>{`
        /* Print area */
        @media print { @page { size: 80mm 50mm; margin: 4mm; } }
        :root { color-scheme: light; }
        body { font-family: ui-sans-serif, system-ui; }

        .label {
          width: 72mm; /* visible preview width */
          padding: 6mm;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          color: #111827;
        }

        .hdr {
          display: flex; align-items: baseline; justify-content: space-between;
          margin-bottom: 6px;
        }
        .title { font-weight: 700; font-size: 14px; letter-spacing: 0.5px; }
        .id {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-weight: 600; font-size: 12px; color: #374151;
        }

        .row { display:flex; gap: 8px; }
        .col { flex: 1; min-width: 0; }
        .kv { font-size: 12px; margin: 2px 0; }
        .kv b { font-weight: 600; }

        .status { font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 9999px; border: 1px solid #d1d5db; }
      `}</style>

      <div className="label">
        <div className="hdr">
          <div className="title">ON HOLD</div>
          <div className="id">#{shortId}</div>
        </div>

        <div className="row">
          <div className="col">
            <div className="kv">
              <b>Name:</b> {row.customerName ?? "-"}
            </div>
            <div className="kv">
              <b>Phone:</b> {row.customerPhone ?? "-"}
            </div>
          </div>
          <div className="col" style={{ textAlign: "right" }}>
            <div className="kv">
              <b>Date:</b> {created.toLocaleDateString()}
            </div>
            <div className="kv">
              <span className="status">{row.status}</span>
            </div>
          </div>
        </div>

        <hr
          style={{
            border: 0,
            borderTop: "1px dashed #d1d5db",
            margin: "6px 0",
          }}
        />

        <div className="row">
          <div className="col">
            <div className="kv">
              <b>Created by:</b> {row.createdByCode ?? row.creatorCode ?? "-"}{" "}
              {row.creatorName ? `— ${row.creatorName}` : ""}
            </div>
          </div>
          <div className="col" style={{ textAlign: "right" }}>
            <div className="kv">
              <b>Assigned to:</b> {row.assigneeCode ?? "-"}{" "}
              {row.assigneeName ? `— ${row.assigneeName}` : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
