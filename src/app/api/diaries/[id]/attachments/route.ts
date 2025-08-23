import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = process.env.SUPABASE_ATTACHMENTS_BUCKET ?? "attachments";

// Helper: get a server-side Supabase client or null if misconfigured
function getSupabase(): SupabaseClient | null {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    console.error(
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) / SUPABASE_SERVICE_ROLE_KEY"
    );
    return null;
  }
  return createClient(url, key);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSession();
  const { id: diaryId } = await params;

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const blob = file as File;
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeName = blob.name.replace(/\s+/g, "_");
    const key = `diaries/${diaryId}/${Date.now()}-${crypto
      .randomBytes(6)
      .toString("hex")}-${safeName}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(key, buffer, { contentType: blob.type });

    if (upErr) {
      console.error("upload error", upErr);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const [row] = await db
      .insert(schema.attachments)
      .values({
        diaryId,
        fileName: blob.name,
        filePath: key,
        mimeType: blob.type,
        sizeBytes: blob.size,
        uploadedBy: "web",
      })
      .returning();

    return NextResponse.json(row, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSession();
  const { id: diaryId } = await params;

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server." },
      { status: 500 }
    );
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const [row] = await db
      .select()
      .from(schema.attachments)
      .where(
        and(
          eq(schema.attachments.id, id),
          eq(schema.attachments.diaryId, diaryId)
        )
      )
      .limit(1);

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { error: rmErr } = await supabase.storage
      .from(BUCKET)
      .remove([row.filePath]);
    if (rmErr) console.warn("storage remove error", rmErr);

    await db
      .delete(schema.attachments)
      .where(
        and(
          eq(schema.attachments.id, id),
          eq(schema.attachments.diaryId, diaryId)
        )
      );

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
