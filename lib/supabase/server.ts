import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export function getSupabaseServer() {
  const url = process.env.SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY

  if (!url || !anon) {
    throw new Error("Defina SUPABASE_URL e SUPABASE_ANON_KEY no servidor.")
  }

  return createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function getSupabaseServerWithSession() {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  return { supabase, user, error }
}
