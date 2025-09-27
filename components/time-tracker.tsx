"use client"

import { Play, Pause, Square, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTimeTracker } from "@/hooks/useTimeTracker"
import { useTimeSync } from "@/hooks/use-time-sync"

interface TimeTrackerProps {
  taskId: string | null
  className?: string
}

export default function TimeTracker({ taskId, className }: TimeTrackerProps) {
  const {
    state,
    formattedTime,
    formattedTotalTime,
    totalTime,
    isLoading,
    start,
    pause,
    stop
  } = useTimeTracker(taskId)
  
  const { triggerUpdate } = useTimeSync()
  
  if (!taskId) return null
  
  const getStateColor = () => {
    switch (state) {
      case 'running':
        return 'text-green-400'
      case 'paused':
        return 'text-yellow-400'
      case 'stopped':
        return 'text-white/60'
      default:
        return 'text-white/60'
    }
  }
  
  const getButtonIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" />
    }
    
    switch (state) {
      case 'running':
        return <Pause className="h-4 w-4" />
      case 'paused':
      case 'stopped':
        return <Play className="h-4 w-4" />
      default:
        return <Play className="h-4 w-4" />
    }
  }
  
  const handleButtonClick = async () => {
    if (isLoading) return
    
    switch (state) {
      case 'stopped':
      case 'paused':
        await start()
        triggerUpdate() // Notifica outras instâncias para atualizar
        break
      case 'running':
        await pause()
        triggerUpdate() // Notifica outras instâncias para atualizar
        break
    }
  }
  
  const handleStopClick = async () => {
    if (isLoading || state === 'stopped') return
    await stop()
    triggerUpdate() // Notifica outras instâncias para atualizar
  }
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Display do tempo */}
      <div className="flex items-center gap-2 min-w-0">
        <Clock className="h-4 w-4 text-white/50 shrink-0" />
        <div className="flex flex-col min-w-0">
          {/* Tempo atual da sessão */}
          <div className={cn("font-mono text-sm font-medium transition-colors", getStateColor())}>
            {formattedTime}
          </div>
          {/* Tempo total acumulado (se houver) */}
          {totalTime > 0 && (
            <div className="font-mono text-xs text-white/40">
              Total: {formattedTotalTime}
            </div>
          )}
        </div>
      </div>
      
      {/* Controles */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Botão Play/Pause */}
        <Button
          type="button"
          onClick={handleButtonClick}
          disabled={isLoading}
          size="sm"
          variant="ghost"
          className={cn(
            "h-8 w-8 p-0 rounded-md transition-colors shrink-0",
            state === 'running' 
              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" 
              : "bg-[#2A2A2C] text-white/80 hover:bg-[#2A2A2C]/80 border border-[#2E2E30]"
          )}
          title={
            isLoading 
              ? "Carregando..." 
              : state === 'running' 
                ? "Pausar cronômetro" 
                : "Iniciar cronômetro"
          }
        >
          {getButtonIcon()}
        </Button>
        
        {/* Botão Stop (apenas quando não está parado) */}
        {state !== 'stopped' && (
          <Button
            type="button"
            onClick={handleStopClick}
            disabled={isLoading}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 rounded-md bg-[#2A2A2C] text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-[#2E2E30] shrink-0"
            title="Parar e resetar cronômetro"
          >
            <Square className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}