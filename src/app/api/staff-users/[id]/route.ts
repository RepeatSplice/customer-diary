// src/app/api/staff-users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function assertManager() {
  const session = await requireSession().catch(() => null);
  if (!session) return null;
  if (session.user.role !== "manager") return null;
  return session;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await assertManager();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Optional: disallow deleting yourself
  // if (session.user.id === id) {
  //   return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  // }

  try {
    // Prevent deleting the last manager
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.staffUsers)
      .where(eq(schema.staffUsers.role, "manager"));

    const managerCount = typeof count === "number" ? count : Number(count || 0);

    // Get role of target
    const [target] = await db
      .select({ role: schema.staffUsers.role })
      .from(schema.staffUsers)
      .where(eq(schema.staffUsers.id, id))
      .limit(1);

    if (!target) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (target.role === "manager" && managerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last manager" },
        { status: 409 }
      );
    }

    await db.delete(schema.staffUsers).where(eq(schema.staffUsers.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting staff user:", error);
    return NextResponse.json(
      { error: "Failed to delete staff user" },
      { status: 500 }
    );
  }
}
