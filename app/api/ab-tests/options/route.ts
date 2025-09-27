import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request) {
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
    // Buscar opções com filtro por tipo (query parameter)
    const { searchParams } = new URL(req.url)
    const optionType = searchParams.get('type') // 'test_type' ou 'channel'

    let query = admin
      .from("ab_test_options")
      .select("*")
      .order("sort_order", { ascending: true })

    if (optionType) {
      query = query.eq("option_type", optionType)
    }

    const { data: options, error: optionsErr } = await query

    if (optionsErr) return NextResponse.json({ error: optionsErr.message }, { status: 500 })

    return NextResponse.json({ options: options || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
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
    const body = await req.json()
    const { option_type, value, label } = body

    // Validações
    if (!option_type || !value || !label) {
      return NextResponse.json({ error: "Missing required fields: option_type, value, label" }, { status: 400 })
    }

    if (typeof option_type !== 'string' || typeof value !== 'string' || typeof label !== 'string') {
      return NextResponse.json({ error: "All fields must be strings" }, { status: 400 })
    }

    if (!['test_type', 'channel'].includes(option_type)) {
      return NextResponse.json({ error: "Invalid option_type. Must be 'test_type' or 'channel'" }, { status: 400 })
    }

    // Validar tamanhos máximos
    if (value.trim().length > 50) {
      return NextResponse.json({ error: "Value cannot exceed 50 characters" }, { status: 400 })
    }

    if (label.trim().length > 100) {
      return NextResponse.json({ error: "Label cannot exceed 100 characters" }, { status: 400 })
    }

    // Sanitizar entrada
    const cleanValue = value.trim().replace(/[^\w\s-]/g, '')
    const cleanLabel = label.trim().replace(/[<>]/g, '')

    if (cleanValue.length === 0 || cleanLabel.length === 0) {
      return NextResponse.json({ error: "Value and label cannot be empty after sanitization" }, { status: 400 })
    }

    // Verificar se value já existe para este tipo
    const { data: existing } = await admin
      .from("ab_test_options")
      .select("id")
      .eq("option_type", option_type)
      .eq("value", cleanValue)
      .single()

    if (existing) {
      return NextResponse.json({ error: "Option with this value already exists" }, { status: 400 })
    }

    // Obter próxima ordem (maior + 1)
    const { data: maxOrder } = await admin
      .from("ab_test_options")
      .select("sort_order")
      .eq("option_type", option_type)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxOrder?.sort_order || 0) + 1

    // Criar nova opção
    const { data: option, error: optionErr } = await admin
      .from("ab_test_options")
      .insert({
        option_type,
        value: cleanValue,
        label: cleanLabel,
        sort_order: nextOrder,
        is_active: true
      })
      .select()
      .single()

    if (optionErr) return NextResponse.json({ error: optionErr.message }, { status: 500 })

    return NextResponse.json({ option })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}