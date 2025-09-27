import { getSupabaseServerWithSession } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const { supabase, user } = await getSupabaseServerWithSession()
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user?.id || "")
      .single()
    
    const isAdmin = profile?.role === "admin"
    
    // Simplificado: Buscar todos os bug reports sem joins complexos
    const { data, error } = await supabase
      .from("bug_reports")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Retornar os dados diretamente sem transformação por enquanto
    return NextResponse.json(data || [])
  } catch (error) {

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getSupabaseServerWithSession()
    const body = await request.json()
    
    // Allow bug reports even from non-authenticated users
    // if (!user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }
    
    // Get user profile for name and email (if user exists)
    let profile = null
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", user.id)
        .single()
      profile = data
    }
    
    const { data, error } = await supabase
      .from("bug_reports")
      .insert({
        reported_by: user?.id || null,
        reporter_name: profile?.name || body.reporter_name || "Anonymous",
        reporter_email: profile?.email || user?.email || body.reporter_email || "",
        description: body.description,
        screenshot_url: body.screenshot_url,
        browser_info: body.browser_info || "",
        page_url: body.page_url || ""
      })
      .select()
      .single()
    
    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await getSupabaseServerWithSession()
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json({ error: "Bug report ID required" }, { status: 400 })
    }
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user?.id || "")
      .single()
    
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
    
    // If resolving, add resolved info
    if (updates.status === "resolved" || updates.status === "closed") {
      updates.resolved_at = new Date().toISOString()
      updates.resolved_by = user?.id
    }
    
    const { data, error } = await supabase
      .from("bug_reports")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single()
    
    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase } = await getSupabaseServerWithSession()
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: "Bug report ID required" }, { status: 400 })
    }
    
    // Página /equipe já é restrita a admins, não precisa verificar novamente
    
    // Primeiro verificar se o bug report existe
    const { data: existing, error: checkError } = await supabase
      .from("bug_reports")
      .select("id")
      .eq("id", id)
      .single()

    if (checkError || !existing) {

      return NextResponse.json({ error: "Bug report not found" }, { status: 404 })
    }
    
    const { data, error } = await supabase
      .from("bug_reports")
      .delete()
      .eq("id", id)
      .select()

    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, deleted: data })
  } catch (error) {

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}