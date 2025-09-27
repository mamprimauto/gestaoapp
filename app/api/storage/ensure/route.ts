import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
export async function POST(req: Request) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) {
    return NextResponse.json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 })
  }
  // Allow overriding bucket by body/query, default to "avatars"
  let bucket = "avatars"
  try {
    const body = await req.json().catch(() => null)
    const q = new URL(req.url).searchParams
    bucket = (body?.bucket as string) || q.get("bucket") || "avatars"
  } catch {
    // ignore
  }
  try {
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    // If bucket doesn’t exist, create with appropriate limit
    const { data: existing } = await admin.storage.getBucket(bucket)
    if (!existing) {
      const fileSizeLimit = bucket === "task-files" ? "1GB" : "5MB"
      const isPublic = bucket === "avatars"
      const { error: createErr } = await admin.storage.createBucket(bucket, {
        public: isPublic,
        fileSizeLimit,
      })
      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 })
      }
    } else {
      // Try to enforce 1GB for task-files (best-effort)
      if (bucket === "task-files") {
        const { error: updErr } = await admin.storage.updateBucket(bucket, {
          public: false,
          fileSizeLimit: "1GB",
        })
        if (updErr) {
        }
      }
    }
    return NextResponse.json({ ok: true, bucket }, { headers: { "cache-control": "no-store" } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}
