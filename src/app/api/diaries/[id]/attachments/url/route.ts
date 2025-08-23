// src/app/api/attachments/[id]/url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
const BUCKET = process.env.SUPABASE_ATTACHMENTS_BUCKET ?? "attachments";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [row] = await db
    .select()
    .from(schema.attachments)
    .where(eq(schema.attachments.id, id))
    .limit(1);

  if (!row) return NextResponse.json({ url: null }, { status: 404 });

  const { data, error } = await getSupabaseClient()
    .storage.from(BUCKET)
    .createSignedUrl(row.filePath, 60 * 5); // 5 minutes

  if (error) return NextResponse.json({ url: null }, { status: 500 });

  return NextResponse.json({ url: data?.signedUrl ?? null });
}
