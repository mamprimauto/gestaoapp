"use client"
import { Inter } from 'next/font/google'
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Bell } from 'lucide-react'
import { getSupabaseClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
const inter = Inter({ subsets: ["latin"], display: "swap" })
export default function PremiumLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data: u } = await supabase.auth.getUser()
        if (!u.user) return
        const { data: prof } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", u.user.id)
          .maybeSingle()
        if (active) setAvatarUrl((prof as any)?.avatar_url || null)
      } catch {
        // ignore
      }
    })()
    return () => { active = false }
  }, [])
  async function handleSignOut() {
    try {
      const supabase = await getSupabaseClient()
      await supabase.auth.signOut()
    } catch (e) {
    } finally {
      router.replace("/login")
    }
  }
  return (
    <div className={`${inter.className} min-h-svh w-full text-[#F2F2F7] p-4 lg:p-8`}>
      <header className="flex items-center justify-between mb-6">
        <div></div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white hover:bg-white/5"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            className="text-white/80 hover:text-white hover:bg-white/5"
            onClick={handleSignOut}
          >
            Sair
          </Button>
          <button
            onClick={() => router.push("/perfil")}
            className="h-8 w-8 rounded-full overflow-hidden ring-1 ring-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 hover:ring-white/30 transition-all"
            aria-label="Abrir perfil"
            title="Abrir perfil"
          >
            <img
              src={avatarUrl || "/minimal-avatar.png"}
              alt="Seu avatar"
              className="h-8 w-8 object-cover"
              referrerPolicy="no-referrer"
            />
          </button>
        </div>
      </header>
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  )
}
