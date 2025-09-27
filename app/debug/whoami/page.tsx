"use client"

import { useEffect, useState } from "react"
import PremiumLayout from "@/components/premium-layout"
import AuthGuard from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Copy } from "lucide-react"

type Who = {
  id: string
  email: string | null
  provider?: string | null
  created_at?: string | null
  last_sign_in_at?: string | null
}

export default function Page() {
  return (
    <PremiumLayout>
      <AuthGuard>
        <WhoAmI />
      </AuthGuard>
    </PremiumLayout>
  )
}

function WhoAmI() {
  const [u, setU] = useState<Who | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data } = await supabase.auth.getUser()
        if (!active) return
        const user = data?.user
        setU(
          user
            ? {
                id: user.id,
                email: user.email ?? null,
                provider: (user.app_metadata?.provider as string) ?? null,
                created_at: (user.created_at as string) ?? null,
                last_sign_in_at: (user.user_metadata?.last_sign_in_at as string) ?? null,
              }
            : null,
        )
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
  }

  return (
    <main className="grid gap-6">
      <Card className="rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E]">
        <CardHeader>
          <CardTitle className="text-[#F2F2F7]">Quem está logado</CardTitle>
          <CardDescription className="text-white/70">
            Use isto para descobrir o e-mail da sessão atual do Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-sm text-white/70">Carregando...</div>
          ) : u ? (
            <>
              <div className="grid gap-2 max-w-xl">
                <label className="text-xs text-white/60">E-mail</label>
                <div className="flex gap-2">
                  <Input readOnly value={u.email || "—"} className="bg-[#2A2A2C] border-[#3A3A3C] text-white" />
                  {u.email && (
                    <Button
                      type="button"
                      onClick={() => copy(u.email!)}
                      className="bg-[#3A3A3C] hover:bg-[#3A3A3C]/80 text-white"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-2 max-w-xl">
                <label className="text-xs text-white/60">User ID</label>
                <div className="flex gap-2">
                  <Input readOnly value={u.id} className="bg-[#2A2A2C] border-[#3A3A3C] text-white" />
                  <Button
                    type="button"
                    onClick={() => copy(u.id)}
                    className="bg-[#3A3A3C] hover:bg-[#3A3A3C]/80 text-white"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 max-w-3xl">
                <Info label="Provider" value={u.provider || "—"} />
                <Info label="Criado em" value={u.created_at ? new Date(u.created_at).toLocaleString("pt-BR") : "—"} />
                <Info
                  label="Último login"
                  value={u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "—"}
                />
              </div>

              <div className="text-xs text-white/60">Dica: você também pode ver o e-mail em /perfil.</div>
            </>
          ) : (
            <div className="text-sm text-white/70">Nenhuma sessão encontrada. Acesse sua conta em /login.</div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#3A3A3C] bg-[#232325] p-3">
      <div className="text-[11px] text-white/60">{label}</div>
      <div className="text-sm text-white/90 mt-0.5">{value}</div>
    </div>
  )
}
