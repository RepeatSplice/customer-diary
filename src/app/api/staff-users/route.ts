// src/app/api/staff-users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { and, eq, ilike, or, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function assertManager() {
  const session = await requireSession().catch(() => null);
  if (!session) return null;
  if (session.user.role !== "manager") return null;
  return session;
}

// GET: list staff users with search and pagination
export async function GET(req: NextRequest) {
  const session = await assertManager();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";
  const role = searchParams.get("role") || "all";
  const limit = Number(searchParams.get("limit") || 25);
  const offset = Number(searchParams.get("offset") || 0);

  try {
    // Build where clause
    let where = undefined;
    if (query || role !== "all") {
      const conditions = [];
      if (query) {
        conditions.push(
          or(
            ilike(schema.staffUsers.fullName, `%${query}%`),
            ilike(schema.staffUsers.staffCode, `%${query}%`)
          )
        );
      }
      if (role !== "all") {
        conditions.push(
          eq(schema.staffUsers.role, role as "staff" | "manager")
        );
      }
      where = and(...conditions);
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.staffUsers)
      .where(where);

    // Get paginated results
    const items = await db
      .select({
        id: schema.staffUsers.id,
        fullName: schema.staffUsers.fullName,
        staffCode: schema.staffUsers.staffCode,
        role: schema.staffUsers.role,
        createdAt: schema.staffUsers.createdAt,
      })
      .from(schema.staffUsers)
      .where(where)
      .orderBy(schema.staffUsers.createdAt)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      items,
      total: Number(count),
      page: Math.floor(offset / limit),
      totalPages: Math.ceil(Number(count) / limit),
    });
  } catch (error) {
    console.error("Error fetching staff users:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff users" },
      { status: 500 }
    );
  }
}

// POST: create new staff user
export async function POST(req: NextRequest) {
  const session = await assertManager();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { fullName, staffCode, role, pin } = body;

    // Validate required fields
    if (!fullName || !staffCode || !role || !pin) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if staff code already exists
    const existing = await db
      .select({ id: schema.staffUsers.id })
      .from(schema.staffUsers)
      .where(eq(schema.staffUsers.staffCode, staffCode))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Staff code already exists" },
        { status: 409 }
      );
    }

    // Create new staff user
    const [newUser] = await db
      .insert(schema.staffUsers)
      .values({
        fullName,
        staffCode: staffCode.toUpperCase(),
        role,
        pinHash: String(pin), // Note: In production, this should be hashed
      })
      .returning();

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Error creating staff user:", error);
    return NextResponse.json(
      { error: "Failed to create staff user" },
      { status: 500 }
    );
  }
}
