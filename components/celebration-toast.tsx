"use client"

import React, { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'
import { getMotivationalMessage, getTimeOfDay, isWeekend } from '@/lib/motivational-messages'

interface CelebrationToastProps {
  trigger: boolean
  userName?: string
  streak?: number
  onCelebrationEnd?: () => void
}

// Função para criar confetti personalizado
const createConfetti = () => {
  // Configuração para fogos de artifício coloridos
  const colors = ['#FFD60A', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  
  // Explosão do centro
  confetti({
    particleCount: 50,
    angle: 60,
    spread: 55,
    origin: { x: 0.5, y: 0.7 },
    colors: colors,
    gravity: 0.8,
    decay: 0.9,
    scalar: 1.2
  })
  
  confetti({
    particleCount: 50,
    angle: 120,
    spread: 55,
    origin: { x: 0.5, y: 0.7 },
    colors: colors,
    gravity: 0.8,
    decay: 0.9,
    scalar: 1.2
  })

  // Chuva de confetti adicional
  setTimeout(() => {
    confetti({
      particleCount: 30,
      angle: 90,
      spread: 100,
      origin: { x: 0.5, y: 0.3 },
      colors: colors,
      gravity: 0.6,
      decay: 0.8,
      scalar: 0.8,
      shapes: ['star', 'circle']
    })
  }, 200)
}

// Função para criar mini-confetti (para streaks menores)
const createMiniConfetti = () => {
  const colors = ['#FFD60A', '#FF6B6B', '#4ECDC4']
  
  confetti({
    particleCount: 25,
    angle: 90,
    spread: 45,
    origin: { x: 0.5, y: 0.6 },
    colors: colors,
    gravity: 0.7,
    decay: 0.85,
    scalar: 0.8
  })
}

export function CelebrationToast({ trigger, userName, streak = 0, onCelebrationEnd }: CelebrationToastProps) {
  useEffect(() => {
    if (!trigger) return

    // Gerar mensagem motivacional
    const message = getMotivationalMessage(
      streak,
      userName,
      getTimeOfDay(),
      isWeekend()
    )

    // Escolher tipo de confetti baseado no streak
    if (streak >= 3) {
      createConfetti() // Confetti completo
    } else {
      createMiniConfetti() // Mini confetti
    }

    // Mostrar toast com a mensagem
    toast.success(message.text, {
      description: streak > 1 ? `${streak} tarefas seguidas! Continue assim! 🔥` : undefined,
      duration: 3000,
      icon: message.emoji,
      style: {
        background: 'linear-gradient(135deg, #FFD60A, #FF6B6B)',
        border: 'none',
        color: 'white',
        fontWeight: '600'
      },
      className: 'celebration-toast'
    })

    // Callback opcional para reset do trigger
    if (onCelebrationEnd) {
      setTimeout(onCelebrationEnd, 3000)
    }

  }, [trigger, userName, streak, onCelebrationEnd])

  return null // Este componente não renderiza nada visualmente
}

// Hook personalizado para facilitar o uso
export function useCelebration() {
  const [celebrationTrigger, setCelebrationTrigger] = React.useState(false)
  const [streak, setStreak] = React.useState(0)

  const celebrate = (userName?: string, taskStreak?: number) => {
    if (taskStreak !== undefined) {
      setStreak(taskStreak)
    }
    setCelebrationTrigger(true)
  }

  const resetCelebration = () => {
    setCelebrationTrigger(false)
  }

  return {
    celebrate,
    resetCelebration,
    celebrationTrigger,
    streak
  }
}

// Componente wrapper para facilitar integração
interface CelebrationWrapperProps {
  children: React.ReactNode
  userName?: string
}

export function CelebrationWrapper({ children, userName }: CelebrationWrapperProps) {
  const { celebrate, resetCelebration, celebrationTrigger, streak } = useCelebration()

  return (
    <>
      {children}
      <CelebrationToast 
        trigger={celebrationTrigger}
        userName={userName}
        streak={streak}
        onCelebrationEnd={resetCelebration}
      />
    </>
  )
}