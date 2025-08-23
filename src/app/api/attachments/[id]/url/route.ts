import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await requireSession();
  const a = await db.query.attachments.findFirst({
    where: eq(schema.attachments.id, id),
  });
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabaseAdmin.storage
    .from("diary-attachments")
    .createSignedUrl(a.filePath as string, 60 * 10);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url: data?.signedUrl });
}
