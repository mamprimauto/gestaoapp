"use client"

import { useEffect, useState } from "react"
import PremiumLayout from "@/components/premium-layout"
import AuthGuard from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, ExternalLink } from "lucide-react"

type EnvResp = { url: string; anon: string }
type State = { ok: true; url: string; anon: string; projectRef: string | null } | { ok: false; error: string }

export default function Page() {
  return (
    <PremiumLayout>
      <AuthGuard>
        <SupabaseDebug />
      </AuthGuard>
    </PremiumLayout>
  )
}

function mask(key: string, start = 6, end = 4) {
  if (!key) return "—"
  if (key.length <= start + end) return key
  return `${key.slice(0, start)}••••••••••${key.slice(-end)}`
}

function extractProjectRef(url: string): string | null {
  try {
    const u = new URL(url)
    // Ex.: https://abc123.supabase.co -> "abc123"
    const [sub] = u.hostname.split(".")
    return sub || null
  } catch {
    return null
  }
}

function SupabaseDebug() {
  const [state, setState] = useState<State>({ ok: false, error: "Carregando..." })

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        // 1) Tenta via API do servidor (usa envs do server)
        const res = await fetch("/api/public-env", { cache: "no-store" })
        if (res.ok) {
          const json = (await res.json()) as EnvResp
          if (!active) return
          setState({ ok: true, url: json.url, anon: json.anon, projectRef: extractProjectRef(json.url) })
          return
        }
        // 2) Fallback: variáveis injetadas no window
        const env: any = (window as any).__PUBLIC_ENV__ || {}
        const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || ""
        const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ""
        if (url && anon) {
          if (!active) return
          setState({ ok: true, url, anon, projectRef: extractProjectRef(url) })
          return
        }
        if (!active) return
        setState({ ok: false, error: "Variáveis do Supabase não encontradas no app." })
      } catch (e: any) {
        if (!active) return
        setState({ ok: false, error: e?.message || "Falha ao ler envs" })
      }
    })()
    return () => {
      active = false
    }
  }, [])

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
  }

  const ok = state.ok
  const projectUrl = ok ? state.url : ""
  const anon = ok ? state.anon : ""
  const ref = ok ? state.projectRef : null
  const dashboardLink = ref ? `https://supabase.com/dashboard/project/${ref}` : null

  return (
    <main className="grid gap-6">
      <Card className="rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E]">
        <CardHeader>
          <CardTitle className="text-[#F2F2F7]">Supabase conectado</CardTitle>
          <CardDescription className="text-white/70">
            Veja o Project URL, a chave anon e o project-ref atualmente usados pelo app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!ok ? (
            <div className="text-sm text-white/70">{state.error}</div>
          ) : (
            <>
              <div className="grid gap-2 max-w-2xl">
                <label className="text-xs text-white/60">Project URL</label>
                <div className="flex gap-2">
                  <Input readOnly value={projectUrl} className="bg-[#2A2A2C] border-[#3A3A3C] text-white" />
                  <Button
                    type="button"
                    onClick={() => copy(projectUrl)}
                    className="bg-[#3A3A3C] hover:bg-[#3A3A3C]/80 text-white"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 max-w-2xl">
                <label className="text-xs text-white/60">Anon key (mascarada)</label>
                <div className="flex gap-2">
                  <Input readOnly value={mask(anon)} className="bg-[#2A2A2C] border-[#3A3A3C] text-white" />
                  <Button
                    type="button"
                    onClick={() => copy(anon)}
                    className="bg-[#3A3A3C] hover:bg-[#3A3A3C]/80 text-white"
                    title="Copiar valor completo"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 max-w-2xl">
                <label className="text-xs text-white/60">Project ref</label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={ref || "—"} className="bg-[#2A2A2C] border-[#3A3A3C] text-white" />
                  {dashboardLink && (
                    <Button
                      asChild
                      className="bg-[#FFD60A] text-black hover:bg-[#ffd60a]/90 rounded-xl"
                      title="Abrir no Dashboard do Supabase (precisa estar autenticado)"
                    >
                      <a href={dashboardLink} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir no Dashboard
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <div className="text-xs text-white/60">
                Dica: você também encontra o Project URL e a anon key em Settings → API do seu projeto no Supabase
                Dashboard [^2]. Se o Dashboard não carregar, tente limpar cache/cookies ou abrir em janela anônima [^1].
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
