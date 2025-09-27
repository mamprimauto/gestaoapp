"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSupabaseClient } from "@/lib/supabase/client"

type ApiValue = { key: string; label: string; value: number }
type ApiResponse = { values: ApiValue[]; max: number; total: number; days: number }

type Props = {
  days?: number
  className?: string
  title?: string
  subtitle?: string
  initial?: ApiResponse | null // allows SSR wrapper to hydrate
}

// Dark card palette to match other blocks
const CARD_CLASSES = "rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E] text-[#F2F2F7]"
const GRID_STROKE = "rgba(255,255,255,0.14)"
const AXIS_LABEL = "rgba(255,255,255,0.65)"
const LINE_COLOR = "#7C8CF8"
const AREA_TOP = "#7C8CF8"
const AREA_BOTTOM = "#A78BFA"

function niceStep(max: number, ticks = 4) {
  if (max <= 0) return 1
  const rough = max / ticks
  const pow10 = Math.pow(10, Math.floor(Math.log10(rough)))
  const base = rough / pow10
  let stepBase = 1
  if (base > 5) stepBase = 10
  else if (base > 2) stepBase = 5
  else if (base > 1) stepBase = 2
  return stepBase * pow10
}

function buildSmoothPath(points: { x: number; y: number }[], tension = 0.22) {
  if (points.length <= 1) return ""
  const d: string[] = [`M ${points[0].x} ${points[0].y}`]
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const cp1x = p1.x + (p2.x - p0.x) * tension
    const cp1y = p1.y + (p2.y - p0.y) * tension
    const cp2x = p2.x - (p3.x - p1.x) * tension
    const cp2y = p2.y - (p3.y - p1.y) * tension
    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`)
  }
  return d.join(" ")
}

export default function TasksCompletionChart({
  days = 7,
  className,
  title = "Tarefas concluídas",
  subtitle = "Últimos dias",
  initial = null,
}: Props) {
  // Range selector with SSR-friendly initial
  const [range, setRange] = useState<number>(days)
  const [data, setData] = useState<ApiResponse | null>(initial && initial.days === days ? initial : null)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const PAD = { top: 24, right: 16, bottom: 30, left: 40 }
  const H = 160
  const GAP = 56

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Fetch data when range changes (client-side)
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setError(null)
        
        // Get auth token
        const supabase = await getSupabaseClient()
        const { data: sess } = await supabase.auth.getSession()
        const jwt = sess.session?.access_token
        
        if (!jwt) {
          throw new Error("Usuário não autenticado")
        }

        const res = await fetch(`/api/charts/completed?days=${range}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`
          }
        })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${res.status}`)
        }
        const json: ApiResponse = await res.json()
        if (!active) return
        setData(json)
      } catch (e: any) {
        if (!active) return
        setError(e?.message || "Erro ao carregar gráfico")
      }
    })()
    return () => {
      active = false
    }
  }, [range])

  const count = data?.values.length ?? range
  const W = PAD.left + (Math.max(1, count) - 1) * GAP + PAD.right
  const SVG_H = PAD.top + H + PAD.bottom

  const yMax = useMemo(() => (data ? Math.max(1, data.max) : 1), [data])
  const step = niceStep(yMax, 4)
  const yTicks = useMemo(() => {
    const arr: number[] = []
    let v = 0
    while (v <= Math.max(yMax, step * 4)) {
      arr.push(v)
      v += step
    }
    return arr
  }, [yMax, step])

  const xAt = (i: number) => PAD.left + i * GAP
  const yAt = (v: number) => PAD.top + (1 - v / (yMax || 1)) * H

  const points = useMemo(() => {
    if (!data) return [] as { x: number; y: number; v: number; label: string; key: string }[]
    return data.values.map((d, i) => ({
      x: xAt(i),
      y: yAt(d.value),
      v: d.value,
      label: d.label,
      key: d.key,
    }))
  }, [data])

  const path = useMemo(() => buildSmoothPath(points, 0.22), [points])

  // Proper hover sync: convert mouse clientX to SVG viewBox coords, then snap to nearest point by distance
  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const scaleX = W / rect.width
    const xSvg = (e.clientX - rect.left) * scaleX

    if (points.length === 0) return
    let best = 0
    let bestDist = Math.abs(xSvg - points[0].x)
    for (let i = 1; i < points.length; i++) {
      const d = Math.abs(xSvg - points[i].x)
      if (d < bestDist) {
        best = i
        bestDist = d
      }
    }
    setHoverIndex(best)
  }
  function onMouseLeave() {
    setHoverIndex(null)
  }

  const hi = hoverIndex ?? (points.length ? points.length - 1 : null)
  const hover = hi != null ? points[hi] : null

  const tooltipStyle = (() => {
    if (!hover) return { opacity: 0 }
    const left = (hover.x / W) * 100
    const top = ((hover.y - 16) / SVG_H) * 100
    return { left: `${left}%`, top: `${top}%`, opacity: 1 }
  })()

  return (
    <Card className={cn(CARD_CLASSES, className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-medium text-white/90">{title}</div>
            <div className="text-[11px] text-white/60">{subtitle}</div>
          </div>

          {/* Interval selector */}
          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-white/60 sm:inline">Intervalo</span>
            <Select value={String(range)} onValueChange={(v) => setRange(Number(v))}>
              <SelectTrigger className="h-8 w-[110px] rounded-md border-white/10 bg-[#1F1F21] text-xs text-white/90">
                <SelectValue placeholder="7 dias" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#2C2C2E] text-white">
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="14">14 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-[11px] text-white/60">Total: {data?.total ?? "—"}</div>

        <div className="relative mt-3 overflow-x-auto">
          <svg
            role="img"
            aria-label="Tarefas concluídas por dia"
            width="100%"
            height={SVG_H}
            viewBox={`0 0 ${W} ${SVG_H}`}
            className="block"
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
          >
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={AREA_TOP} stopOpacity="0.18" />
                <stop offset="100%" stopColor={AREA_BOTTOM} stopOpacity="0.03" />
              </linearGradient>
            </defs>

            {/* Grid + labels */}
            {yTicks.map((v, idx) => {
              const y = yAt(v)
              return (
                <g key={idx}>
                  <line
                    x1={PAD.left}
                    x2={W - PAD.right}
                    y1={y}
                    y2={y}
                    stroke={GRID_STROKE}
                    strokeDasharray="4 6"
                    strokeWidth={1}
                  />
                  <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="10" style={{ fill: AXIS_LABEL }}>
                    {v}
                  </text>
                </g>
              )
            })}

            {/* Base */}
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={PAD.top + H}
              y2={PAD.top + H}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
            />

            {/* Area under curve */}
            {!!points.length && (
              <path
                d={`${path} L ${points.at(-1)!.x} ${PAD.top + H} L ${points[0]!.x} ${PAD.top + H} Z`}
                fill="url(#areaFill)"
                opacity={mounted ? 1 : 0}
                style={{ transition: "opacity 360ms ease" }}
              />
            )}

            {/* Smooth line */}
            {path && (
              <path
                d={path}
                fill="none"
                stroke={LINE_COLOR}
                strokeWidth={2}
                style={{
                  strokeDasharray: W,
                  strokeDashoffset: mounted ? 0 : W,
                  transition: "stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            )}

            {/* Hover guide + active dot */}
            {hover && (
              <>
                <line
                  x1={hover.x}
                  x2={hover.x}
                  y1={PAD.top}
                  y2={PAD.top + H}
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth={1}
                />
                <circle cx={hover.x} cy={hover.y} r={4} fill={LINE_COLOR} stroke="#fff" strokeWidth={1.2} />
              </>
            )}

            {/* X axis labels */}
            {data?.values.map((v, i) => (
              <text
                key={v.key}
                x={xAt(i)}
                y={PAD.top + H + 18}
                textAnchor="middle"
                fontSize="11"
                className={cn(i === data.values.length - 1 && "font-medium")}
                style={{ fill: i === data.values.length - 1 ? LINE_COLOR : AXIS_LABEL }}
              >
                {v.label}
              </text>
            ))}

            {/* Simple loading shimmer rectangles if no data yet */}
            {!data &&
              Array.from({ length: range }).map((_, i) => (
                <rect
                  key={i}
                  x={xAt(i) - 10}
                  y={PAD.top + 30}
                  width={20}
                  height={H - 30}
                  rx={6}
                  fill="rgba(255,255,255,0.06)"
                />
              ))}
          </svg>

          {/* Tooltip */}
          {hover && data && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md bg-black px-2 py-1 text-xs text-white shadow"
              style={tooltipStyle as React.CSSProperties}
              aria-hidden="true"
            >
              {hover.v}
              <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-6 border-t-6 border-x-transparent border-t-black" />
            </div>
          )}
        </div>

        {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
      </CardContent>
    </Card>
  )
}
