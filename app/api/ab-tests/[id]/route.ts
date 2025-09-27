import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !service) {
    return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 })
  }

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
  
  if (!token) {
    return NextResponse.json({ error: "Unauthorized - Missing token" }, { status: 401 })
  }

  const admin = createClient(url, service, { 
    auth: { persistSession: false, autoRefreshToken: false } 
  })
  
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
  }

  try {
    const { id } = params

    // Verify the test exists before attempting to delete
    const { data: existingTest, error: existsErr } = await admin
      .from("ab_tests")
      .select("id, name")
      .eq("id", id)
      .single()

    if (existsErr || !existingTest) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 })
    }

    // Delete associated data first (comments, etc.)
    // This handles cascade deletes if they're not set up in the database
    await admin
      .from("ab_test_comments")
      .delete()
      .eq("test_id", id)

    // Delete the test
    const { error: deleteErr } = await admin
      .from("ab_tests")
      .delete()
      .eq("id", id)

    if (deleteErr) {

      return NextResponse.json({ error: deleteErr.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Test ${existingTest.name} deleted successfully` 
    })

  } catch (error: any) {

    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const url = process.env.SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !service) {
    return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 })
  }

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || ""
  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
  
  if (!token) {
    return NextResponse.json({ error: "Unauthorized - Missing token" }, { status: 401 })
  }

  const admin = createClient(url, service, { 
    auth: { persistSession: false, autoRefreshToken: false } 
  })
  
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
  }

  try {
    const { id } = params
    const body = await req.json()
    const { hypothesis, test_type, status, start_date, end_date, comments } = body

    // Build update object with only provided fields
    const updateData: any = {}
    if (hypothesis !== undefined) updateData.hypothesis = hypothesis
    if (test_type !== undefined) updateData.test_type = test_type
    if (status !== undefined) updateData.status = status
    if (start_date !== undefined) updateData.start_date = start_date
    if (end_date !== undefined) updateData.end_date = end_date
    if (comments !== undefined) updateData.comments = comments

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    // Update the test
    const { data: updatedTest, error: updateErr } = await admin
      .from("ab_tests")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ test: updatedTest })

  } catch (error: any) {

    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 })
  }
}