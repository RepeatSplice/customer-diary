"use client";

import { useEffect, useState } from "react";

export default function Label({ params }: { params: Promise<{ id: string }> }) {
  const [row, setRow] = useState<{
    id: string;
    createdAt: string;
    status: string;
    priority: string;
    isPaid: boolean;
    isOrdered: boolean;
    hasTextedCustomer: boolean;
    dueDate: string | null;
    whatTheyWant: string;
    total: string;
    amountPaid: string;
    supplier: string | null;
    orderNo: string | null;
    etaDate: string | null;
    orderStatus: string | null;
    customer: {
      id: string;
      name: string | null;
      email: string | null;
      phone: string | null;
      accountNo: string | null;
      createdAt: string;
    } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { id } = await params;
        const response = await fetch(`/api/diaries/${id}`);
        if (response.ok) {
          const data = await response.json();
          setRow(data);
        }
      } catch (error) {
        console.error("Error fetching diary:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!row) {
    return <div>Diary not found</div>;
  }

  const shortId = row.id.slice(-6);
  const created = new Date(row.createdAt);
  const balance = Number(row.total || 0) - Number(row.amountPaid || 0);

  return (
    <div className="label-container">
      <style>{`
        .label-container {
          width: 210mm;
          height: 297mm;
          padding: 10mm;
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.3;
          background: white;
          color: black;
        }

        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }

        .title {
          font-size: 18px;
          font-weight: bold;
          margin: 0 0 4px 0;
        }

        .subtitle {
          font-size: 12px;
          margin: 0;
          color: #666;
        }

        .main-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }

        .info-section {
          border: 1px solid #ccc;
          padding: 8px;
          border-radius: 4px;
        }

        .info-section h3 {
          margin: 0 0 6px 0;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          color: #333;
          border-bottom: 1px solid #eee;
          padding-bottom: 2px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
          font-size: 10px;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-bottom: 12px;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 6px;
          background: #f5f5f5;
          border-radius: 3px;
          font-size: 9px;
        }

        .badge {
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 8px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .badge.pending {
          background: #fef3c7;
          color: #92400e;
        }
        .badge.in-progress {
          background: #dbeafe;
          color: #1e40af;
        }
        .badge.completed {
          background: #d1fae5;
          color: #065f46;
        }
        .badge.cancelled {
          background: #fee2e2;
          color: #991b1b;
        }

        .badge.low {
          background: #f3f4f6;
          color: #374151;
        }
        .badge.medium {
          background: #fef3c7;
          color: #92400e;
        }
        .badge.high {
          background: #fee2e2;
          color: #991b1b;
        }
        .badge.urgent {
          background: #fecaca;
          color: #7f1d1d;
        }

        .request-box {
          border: 1px solid #ccc;
          padding: 8px;
          border-radius: 4px;
          background: #f9f9f9;
          margin-bottom: 12px;
          font-size: 10px;
          min-height: 40px;
        }

        .checkboxes {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 12px;
        }

        .checkbox-item {
          display: flex;
          align-items: center;
          font-size: 9px;
        }

        .checkbox-item input[type="checkbox"] {
          margin-right: 4px;
          transform: scale(0.8);
        }

        .footer {
          text-align: center;
          font-size: 8px;
          color: #666;
          border-top: 1px solid #ccc;
          padding-top: 8px;
          margin-top: 12px;
        }

        .qr-placeholder {
          width: 60px;
          height: 60px;
          border: 1px dashed #ccc;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          color: #999;
          margin: 8px auto;
        }

        .icon {
          display: inline-block;
          width: 10px;
          height: 10px;
          margin-right: 3px;
          vertical-align: middle;
          border-radius: 50%;
        }
        .icon-check { background: #10b981; }
        .icon-x { background: #ef4444; }
        .icon-clock { background: #f59e0b; }

        @media print {
          .label-container {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 10mm;
          }
        }
      `}</style>

      <div className="header">
        <h1 className="title">CUSTOMER ORDER</h1>
        <p className="subtitle">
          #{shortId} • {created.toLocaleDateString()}
        </p>
      </div>

      <div className="main-info">
        <div className="info-section">
          <h3>Customer Details</h3>
          <div className="info-row">
            <b>Name:</b>
            <span>{row.customer?.name ?? "-"}</span>
          </div>
          <div className="info-row">
            <b>Phone:</b>
            <span>{row.customer?.phone ?? "-"}</span>
          </div>
          <div className="info-row">
            <b>Account:</b>
            <span>{row.customer?.accountNo ?? "-"}</span>
          </div>
        </div>

        <div className="info-section">
          <h3>Order Details</h3>
          <div className="info-row">
            <b>Status:</b>
            <span className={`badge ${row.status.toLowerCase()}`}>
              {row.status}
            </span>
          </div>
          <div className="info-row">
            <b>Priority:</b>
            <span className={`badge ${row.priority.toLowerCase()}`}>
              {row.priority}
            </span>
          </div>
          <div className="info-row">
            <b>Total:</b>
            <span>${row.total || "0.00"}</span>
          </div>
          <div className="info-row">
            <b>Paid:</b>
            <span>
              <span
                className={`icon ${row.isPaid ? "icon-check" : "icon-x"}`}
              ></span>
              {row.isPaid ? "Yes" : "No"}
            </span>
          </div>
          {!row.isPaid && balance > 0 && (
            <div className="info-row">
              <b>Balance:</b>
              <span>${balance.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="status-grid">
        <div className="status-item">
          <span>
            <b>Ordered:</b>
          </span>
          <span>
            <span
              className={`icon ${row.isOrdered ? "icon-check" : "icon-x"}`}
            ></span>
            {row.isOrdered ? "Yes" : "No"}
          </span>
        </div>
        <div className="status-item">
          <span>
            <b>Texted:</b>
          </span>
          <span>
            <span
              className={`icon ${
                row.hasTextedCustomer ? "icon-check" : "icon-x"
              }`}
            ></span>
            {row.hasTextedCustomer ? "Yes" : "No"}
          </span>
        </div>
        <div className="status-item">
          <span>
            <b>Due:</b>
          </span>
          <span>
            {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "-"}
          </span>
        </div>
      </div>

      {row.supplier && (
        <div className="info-section">
          <h3>Order Information</h3>
          <div className="info-row">
            <b>Supplier:</b>
            <span>{row.supplier}</span>
          </div>
          {row.orderNo && (
            <div className="info-row">
              <b>Order #:</b>
              <span>{row.orderNo}</span>
            </div>
          )}
          {row.orderStatus && (
            <div className="info-row">
              <b>Status:</b>
              <span>{row.orderStatus}</span>
            </div>
          )}
          {row.etaDate && (
            <div className="info-row">
              <b>ETA:</b>
              <span>{new Date(row.etaDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      )}

      <div className="request-box">
        <strong>Customer Request:</strong>
        <br />
        {row.whatTheyWant}
      </div>

      <div className="checkboxes">
        <div className="checkbox-item">
          <input type="checkbox" id="paid" checked={row.isPaid} readOnly />
          <label htmlFor="paid">Paid</label>
        </div>
        <div className="checkbox-item">
          <input
            type="checkbox"
            id="ordered"
            checked={row.isOrdered}
            readOnly
          />
          <label htmlFor="ordered">Ordered</label>
        </div>
        <div className="checkbox-item">
          <input
            type="checkbox"
            id="texted"
            checked={row.hasTextedCustomer}
            readOnly
          />
          <label htmlFor="texted">Customer Texted</label>
        </div>
        <div className="checkbox-item">
          <input type="checkbox" id="collected" />
          <label htmlFor="collected">Customer Collected</label>
        </div>
      </div>

      <div className="qr-placeholder">QR Code</div>

      <div className="footer">
        <p>
          <strong>Customer Diary System</strong> • Print Date:{" "}
          {new Date().toLocaleString()}
        </p>
        <p>Keep this label with the customer&apos;s item in the back room</p>
      </div>
    </div>
  );
}
