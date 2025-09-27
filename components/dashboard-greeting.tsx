"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Sparkles } from 'lucide-react'

type Props = { name?: string }

function formatDateParts(date: Date) {
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" })
  const fullDate = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
  return { weekday, fullDate }
}

function formatTime(date: Date) {
  const h = String(date.getHours()).padStart(2, "0")
  const m = String(date.getMinutes()).padStart(2, "0")
  const s = String(date.getSeconds()).padStart(2, "0")
  return `${h}:${m}:${s}`
}

function toFirstName(raw: string) {
  const n = (raw || "").trim()
  if (!n) return "Usuário"
  const first = n.split(/\s+/)[0]
  const lower = first.toLocaleLowerCase("pt-BR")
  return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1)
}

export default function DashboardGreeting({ name = "Usuário" }: Props) {
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const { weekday, fullDate } = useMemo(() => formatDateParts(now), [now])
  const time = useMemo(() => formatTime(now), [now])
  const displayName = useMemo(() => toFirstName(name || "Usuário"), [name])

  return (
    <section
      className="rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E] p-4 sm:p-6 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.01em] text-[#F2F2F7]">
            Bem-vindo de volta, {displayName}! <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-sm text-white/70">
            Aqui está o resumo das suas atividades de hoje.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#3A3A3C] bg-[#3A3A3C] px-3 py-2">
          <CalendarDays className="h-5 w-5 text-white/80" />
          <div className="text-right">
            <div className="text-sm font-medium text-[#F2F2F7]">{time}</div>
            <div className="text-xs text-white/70">
              {weekday}, {fullDate}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-white/70">
        <Sparkles className="h-4 w-4" style={{ color: "#FFD60A" }} />
        Dica: mantenha o foco nas pendências de alto impacto primeiro.
      </div>
    </section>
  )
}
