// src/app/api/export/csv/route.ts
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireSession, assertManager } from "@/lib/auth";
import { desc, eq, isNull } from "drizzle-orm";

export const runtime = "nodejs";

type Status =
  | "Pending"
  | "Ordered"
  | "ReadyForPickup"
  | "Collected"
  | "Cancelled";
type Priority = "Low" | "Normal" | "High" | "Urgent";

type Row = {
  id: string;
  createdAt: Date;
  status: Status;
  priority: Priority;
  isPaid: boolean;
  total: string | number; // numeric often arrives as string from Postgres
  customerName: string | null;
  phone: string | null;
  email: string | null;
  accountNo: string | null;
};

const HEADERS: (keyof Row)[] = [
  "id",
  "createdAt",
  "status",
  "priority",
  "isPaid",
  "total",
  "customerName",
  "phone",
  "email",
  "accountNo",
];

function csvCell(v: unknown): string {
  if (v == null) return '""';
  const s =
    v instanceof Date
      ? v.toISOString()
      : typeof v === "boolean"
      ? v
        ? "true"
        : "false"
      : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = await requireSession();
  assertManager(session.user.role);

  const rows: Row[] = await db
    .select({
      id: schema.customerDiary.id,
      createdAt: schema.customerDiary.createdAt,
      status: schema.customerDiary.status,
      priority: schema.customerDiary.priority,
      isPaid: schema.customerDiary.isPaid,
      total: schema.customerDiary.total,
      customerName: schema.customers.name,
      phone: schema.customers.phone,
      email: schema.customers.email,
      accountNo: schema.customers.accountNo,
    })
    .from(schema.customerDiary)
    .leftJoin(
      schema.customers,
      eq(schema.customerDiary.customerId, schema.customers.id)
    )
    .where(isNull(schema.customerDiary.archivedAt))
    .orderBy(desc(schema.customerDiary.createdAt))
    .limit(5000);

  const headerLine = HEADERS.join(",");
  const dataLines = rows.map((r) =>
    HEADERS.map((k) => csvCell(r[k])).join(",")
  );

  const csv = [headerLine, ...dataLines].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="customer-diaries.csv"',
      "Cache-Control": "no-store",
    },
  });
}
