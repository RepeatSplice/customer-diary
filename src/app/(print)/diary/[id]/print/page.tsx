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

  // Base diary + customer + staff with all fields
  const [base] = await db
    .select({
      id: schema.customerDiary.id,
      whatTheyWant: schema.customerDiary.whatTheyWant,
      status: schema.customerDiary.status,
      priority: schema.customerDiary.priority,
      isPaid: schema.customerDiary.isPaid,
      isOrdered: schema.customerDiary.isOrdered,
      hasTextedCustomer: schema.customerDiary.hasTextedCustomer,
      adminNotes: schema.customerDiary.adminNotes,
      dueDate: schema.customerDiary.dueDate,
      storeLocation: schema.customerDiary.storeLocation,
      tags: schema.customerDiary.tags,
      subtotal: schema.customerDiary.subtotal,
      total: schema.customerDiary.total,
      createdAt: schema.customerDiary.createdAt,
      updatedAt: schema.customerDiary.updatedAt,

      // Payment fields
      paymentMethod: schema.customerDiary.paymentMethod,
      amountPaid: schema.customerDiary.amountPaid,
      invoicePO: schema.customerDiary.invoicePO,
      paidAt: schema.customerDiary.paidAt,

      // Order fields
      supplier: schema.customerDiary.supplier,
      orderNo: schema.customerDiary.orderNo,
      etaDate: schema.customerDiary.etaDate,
      orderStatus: schema.customerDiary.orderStatus,
      orderNotes: schema.customerDiary.orderNotes,

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

  const shortId = String(base.id).slice(-6);
  const created = new Date(String(base.createdAt));
  const updated = new Date(String(base.updatedAt));

  return (
    <div>
      <style>{`
        @media print { 
          @page { 
            size: A4; 
            margin: 10mm; 
          } 
        }
        :root { color-scheme: light; }
        body { 
          font-family: ui-sans-serif, system-ui; 
          margin: 0;
          padding: 0;
        }

        .print-page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          background: white;
          color: #111827;
          box-sizing: border-box;
          font-size: 11px;
          line-height: 1.3;
        }

        .header {
          text-align: center;
          border-bottom: 3px solid #1f2937;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        .title { 
          font-weight: 800; 
          font-size: 24px; 
          letter-spacing: 1px; 
          color: #1f2937;
          margin: 0;
        }
        .subtitle {
          font-size: 12px;
          color: #6b7280;
          margin: 5px 0 0 0;
        }

        .main-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }

        .section {
          border: 2px solid #d1d5db;
          border-radius: 6px;
          padding: 10px;
          background-color: #f9fafb;
        }
        .section h3 {
          margin: 0 0 8px 0;
          font-size: 12px;
          color: #374151;
          border-bottom: 1px solid #d1d5db;
          padding-bottom: 3px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 10px;
        }
        .info-row b {
          color: #374151;
          min-width: 80px;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin: 8px 0;
        }
        .status-item {
          display: flex;
          justify-content: space-between;
          padding: 3px 6px;
          background-color: white;
          border-radius: 3px;
          border: 1px solid #e5e7eb;
          font-size: 9px;
        }

        .badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 8px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .badge.pending { background-color: #fef3c7; color: #92400e; }
        .badge.in-progress { background-color: #dbeafe; color: #1e40af; }
        .badge.completed { background-color: #dcfce7; color: #166534; }
        .badge.collected { background-color: #d1fae5; color: #065f46; }
        .badge.cancelled { background-color: #fee2e2; color: #991b1b; }
        
        .badge.low { background-color: #f3f4f6; color: #374151; }
        .badge.medium { background-color: #dbeafe; color: #1e40af; }
        .badge.high { background-color: #fef3c7; color: #92400e; }
        .badge.urgent { background-color: #fee2e2; color: #991b1b; }

        .notes {
          background-color: white;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 8px;
          margin: 5px 0;
          font-size: 10px;
          line-height: 1.4;
          max-height: 80px;
          overflow-y: auto;
        }

        .products-table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
          font-size: 9px;
        }
        .products-table th,
        .products-table td {
          border: 1px solid #d1d5db;
          padding: 4px 6px;
          text-align: left;
        }
        .products-table th {
          background-color: #f3f4f6;
          font-weight: 600;
        }

        .followups {
          max-height: 120px;
          overflow-y: auto;
        }

        .icon {
          display: inline-block;
          width: 12px;
          height: 12px;
          margin-right: 4px;
          vertical-align: middle;
        }
        .icon-check { background: #10b981; border-radius: 50%; }
        .icon-x { background: #ef4444; border-radius: 50%; }
        .icon-clock { background: #f59e0b; border-radius: 50%; }
      `}</style>

      <div className="print-page">
        <div className="header">
          <div className="title">Customer Diary / Order</div>
          <div className="subtitle">
            #{shortId} • {created.toLocaleDateString()}
          </div>
        </div>

        <div className="main-grid">
          <div className="section">
            <h3>Customer Information</h3>
            <div className="info-row">
              <b>Name:</b> <span>{base.customerName ?? "-"}</span>
            </div>
            <div className="info-row">
              <b>Phone:</b> <span>{base.customerPhone ?? "-"}</span>
            </div>
            <div className="info-row">
              <b>Email:</b> <span>{base.customerEmail ?? "-"}</span>
            </div>
            <div className="info-row">
              <b>Account #:</b> <span>{base.customerAccountNo ?? "-"}</span>
            </div>
            <div className="info-row">
              <b>Store Location:</b> <span>{base.storeLocation ?? "-"}</span>
            </div>
            <div className="info-row">
              <b>Tags:</b> <span>{base.tags ?? "-"}</span>
            </div>
          </div>

          <div className="section">
            <h3>Order Status</h3>
            <div className="status-grid">
              <div className="status-item">
                <span>
                  <b>Status:</b>
                </span>
                <span className={`badge ${base.status.toLowerCase()}`}>
                  {base.status}
                </span>
              </div>
              <div className="status-item">
                <span>
                  <b>Priority:</b>
                </span>
                <span className={`badge ${base.priority.toLowerCase()}`}>
                  {base.priority}
                </span>
              </div>
              <div className="status-item">
                <span>
                  <b>Paid:</b>
                </span>
                <span>{base.isPaid ? "Yes" : "No"}</span>
              </div>
              <div className="status-item">
                <span>
                  <b>Ordered:</b>
                </span>
                <span>{base.isOrdered ? "Yes" : "No"}</span>
              </div>
              <div className="status-item">
                <span>
                  <b>Texted Customer:</b>
                </span>
                <span>{base.hasTextedCustomer ? "Yes" : "No"}</span>
              </div>
              <div className="status-item">
                <span>
                  <b>Due Date:</b>
                </span>
                <span>
                  {base.dueDate
                    ? new Date(base.dueDate).toLocaleDateString()
                    : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <h3>Customer Request</h3>
          <div className="notes">{base.whatTheyWant}</div>
        </div>

        <div className="main-grid">
          <div className="section">
            <h3>Payment Details</h3>
            <div className="info-row">
              <b>Payment Method:</b> <span>{base.paymentMethod ?? "-"}</span>
            </div>
            <div className="info-row">
              <b>Amount Paid:</b> <span>${base.amountPaid ?? "0.00"}</span>
            </div>
            <div className="info-row">
              <b>Invoice/PO:</b> <span>{base.invoicePO ?? "-"}</span>
            </div>
            <div className="info-row">
              <b>Paid Date:</b>{" "}
              <span>
                {base.paidAt ? new Date(base.paidAt).toLocaleDateString() : "-"}
              </span>
            </div>
            <div className="info-row">
              <b>Subtotal:</b> <span>${base.subtotal ?? "0.00"}</span>
            </div>
            <div className="info-row">
              <b>Total:</b> <span>${base.total ?? "0.00"}</span>
            </div>
          </div>

          <div className="section">
            <h3>Order Information</h3>
            <div className="info-row">
              <b>Supplier:</b> <span>{base.supplier ?? "-"}</span>
            </div>
            <div className="info-row">
              <b>Order Number:</b> <span>{base.orderNo ?? "-"}</span>
            </div>
            <div className="info-row">
              <b>Order Status:</b> <span>{base.orderStatus ?? "-"}</span>
            </div>
            <div className="info-row">
              <b>ETA Date:</b>{" "}
              <span>
                {base.etaDate
                  ? new Date(base.etaDate).toLocaleDateString()
                  : "-"}
              </span>
            </div>
            <div className="info-row">
              <b>Created:</b> <span>{created.toLocaleString()}</span>
            </div>
            <div className="info-row">
              <b>Last Updated:</b> <span>{updated.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="section">
          <h3>Staff Information</h3>
          <div className="info-row">
            <b>Created by:</b>{" "}
            <span>
              {base.createdByCode ?? base.creatorCode ?? "-"}{" "}
              {base.creatorName ? `— ${base.creatorName}` : ""}
            </span>
          </div>
          <div className="info-row">
            <b>Assigned to:</b>{" "}
            <span>
              {base.assigneeCode ?? "-"}{" "}
              {base.assigneeName ? `— ${base.assigneeName}` : ""}
            </span>
          </div>
        </div>

        {products.length > 0 && (
          <div className="section">
            <h3>Products</h3>
            <table className="products-table">
              <thead>
                <tr>
                  <th>UPC</th>
                  <th>Name</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={String(product.id)}>
                    <td>{product.upc}</td>
                    <td>{product.name}</td>
                    <td>{product.qty}</td>
                    <td>${product.unitPrice}</td>
                    <td>${product.lineTotal}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ textAlign: "right" }}>
                    <b>Subtotal</b>
                  </td>
                  <td>
                    <b>${base.subtotal}</b>
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} style={{ textAlign: "right" }}>
                    <b>Total</b>
                  </td>
                  <td>
                    <b>${base.total}</b>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {base.adminNotes && (
          <div className="section">
            <h3>Admin Notes</h3>
            <div className="notes">{base.adminNotes}</div>
          </div>
        )}

        {followups.length > 0 && (
          <div className="section">
            <h3>Follow-ups</h3>
            <div className="followups">
              {followups.map((f) => (
                <div
                  key={String(f.id)}
                  style={{
                    marginBottom: "6px",
                    padding: "6px",
                    backgroundColor: "#f9fafb",
                    borderRadius: "3px",
                    borderLeft: "3px solid #3b82f6",
                    fontSize: "9px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "8px",
                      color: "#6b7280",
                      marginBottom: "2px",
                    }}
                  >
                    {new Date(String(f.createdAt)).toLocaleString()} •{" "}
                    <b>{f.staffCode}</b> • {f.entryType}
                  </div>
                  <div>{f.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
