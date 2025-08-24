import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

// Use the same bucket as the upload API
const BUCKET = process.env.SUPABASE_ATTACHMENTS_BUCKET ?? "attachments";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await requireSession();

  try {
    const a = await db
      .select()
      .from(schema.attachments)
      .where(eq(schema.attachments.id, id))
      .limit(1);

    if (!a || a.length === 0) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    const attachment = a[0];
    if (!attachment.filePath) {
      return NextResponse.json(
        { error: "No file path found" },
        { status: 400 }
      );
    }

    // Debug logging
    console.log("Attachment found:", {
      id: attachment.id,
      fileName: attachment.fileName,
      filePath: attachment.filePath,
      mimeType: attachment.mimeType,
    });

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(attachment.filePath, 60 * 10);

    if (error) {
      console.error("Supabase storage error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ url: data?.signedUrl });
  } catch (error) {
    console.error("Error fetching attachment URL:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
