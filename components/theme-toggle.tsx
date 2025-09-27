"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from "react"

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Alternar tema" className="text-foreground/70">
        <Moon className="h-5 w-5" />
      </Button>
    )
  }
  const isDark = (theme || resolvedTheme) === "dark"
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      className="text-foreground/70 hover:text-foreground hover:bg-foreground/5"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}
