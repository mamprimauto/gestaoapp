"use client"

import { useState } from "react"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useSelectedDate } from "./date-context"

export default function DatePicker() {
  const { selectedDate, setSelectedDate, isToday, formatDisplayDate } = useSelectedDate()
  const [showDateInput, setShowDateInput] = useState(false)

  const goToToday = () => {
    const today = new Date().toISOString().slice(0, 10)
    setSelectedDate(today)
    setShowDateInput(false)
  }

  const goToPrevious = () => {
    const date = new Date(selectedDate + "T00:00:00")
    date.setDate(date.getDate() - 1)
    setSelectedDate(date.toISOString().slice(0, 10))
  }

  const goToNext = () => {
    const date = new Date(selectedDate + "T00:00:00")
    date.setDate(date.getDate() + 1)
    setSelectedDate(date.toISOString().slice(0, 10))
  }

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = event.target.value
    if (newDate) {
      setSelectedDate(newDate)
      setShowDateInput(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Navegação rápida */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPrevious}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={goToNext}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Seletor de data */}
      {showDateInput ? (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            onBlur={() => setShowDateInput(false)}
            autoFocus
            className="h-8 w-40"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            disabled={isToday}
            className="h-8 px-2"
          >
            Hoje
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDateInput(true)}
          className={cn(
            "h-8 justify-start text-left font-normal",
            isToday && "border-blue-500/50 bg-blue-500/10 text-blue-600"
          )}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {isToday ? "Hoje" : formatDisplayDate(selectedDate)}
        </Button>
      )}

      {/* Botão Amanhã para acesso rápido */}
      {!showDateInput && !isToday && (
        <Button
          variant="ghost"
          size="sm"
          onClick={goToToday}
          className="h-8 px-2 text-xs"
        >
          Hoje
        </Button>
      )}
    </div>
  )
}