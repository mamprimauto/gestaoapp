import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

  try {
    const { id } = params
    const body = await req.json()
    const { value, label, is_active, sort_order } = body

    // Build update object with only provided fields
    const updateData: any = {}
    if (value !== undefined) updateData.value = value.trim()
    if (label !== undefined) updateData.label = label.trim()
    if (is_active !== undefined) updateData.is_active = is_active
    if (sort_order !== undefined) updateData.sort_order = sort_order

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    // Get current option to validate constraints
    const { data: current, error: currentErr } = await admin
      .from("ab_test_options")
      .select("*")
      .eq("id", id)
      .single()

    if (currentErr || !current) {
      return NextResponse.json({ error: "Option not found" }, { status: 404 })
    }

    // If updating value, check for duplicates
    if (updateData.value && updateData.value !== current.value) {
      const { data: existing } = await admin
        .from("ab_test_options")
        .select("id")
        .eq("option_type", current.option_type)
        .eq("value", updateData.value)
        .neq("id", id)
        .single()

      if (existing) {
        return NextResponse.json({ error: "Option with this value already exists" }, { status: 400 })
      }
    }

    // Update the option
    const { data: option, error: optionErr } = await admin
      .from("ab_test_options")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (optionErr) return NextResponse.json({ error: optionErr.message }, { status: 500 })

    return NextResponse.json({ option })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) return NextResponse.json({ error: "Missing Supabase envs" }, { status: 500 })

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

  try {
    const { id } = params

    // Check if option exists
    const { data: existing, error: existsErr } = await admin
      .from("ab_test_options")
      .select("id")
      .eq("id", id)
      .single()

    if (existsErr || !existing) {
      return NextResponse.json({ error: "Option not found" }, { status: 404 })
    }

    // Delete the option
    const { error: deleteErr } = await admin
      .from("ab_test_options")
      .delete()
      .eq("id", id)

    if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}