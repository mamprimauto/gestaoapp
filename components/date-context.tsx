"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type DateContextType = {
  selectedDate: string
  setSelectedDate: (date: string) => void
  isToday: boolean
  formatDisplayDate: (date: string) => string
}

const DateContext = createContext<DateContextType | null>(null)

export function DateProvider({ children }: { children: React.ReactNode }) {
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDateState] = useState<string>(today)

  // Carregar data salva do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("selected-date")
      if (saved) {
        setSelectedDateState(saved)
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  const setSelectedDate = (date: string) => {
    setSelectedDateState(date)
    try {
      localStorage.setItem("selected-date", date)
    } catch {
      // Ignore localStorage errors
    }
  }

  const isToday = selectedDate === today

  const formatDisplayDate = (date: string) => {
    try {
      const d = new Date(date + "T00:00:00")
      return d.toLocaleDateString("pt-BR", { 
        day: "2-digit", 
        month: "2-digit", 
        year: "numeric" 
      })
    } catch {
      return date
    }
  }

  const value: DateContextType = {
    selectedDate,
    setSelectedDate,
    isToday,
    formatDisplayDate,
  }

  return <DateContext.Provider value={value}>{children}</DateContext.Provider>
}

export function useSelectedDate() {
  const ctx = useContext(DateContext)
  if (!ctx) throw new Error("useSelectedDate must be used within DateProvider")
  return ctx
}