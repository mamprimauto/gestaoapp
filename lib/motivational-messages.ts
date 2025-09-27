// Sistema de mensagens motivacionais para conclusão de tarefas

export interface MotivationalMessage {
  text: string
  emoji: string
  type: 'standard' | 'streak' | 'time_based' | 'special'
}

// Mensagens padrão
const standardMessages: MotivationalMessage[] = [
  { text: "Arrasou! Mais uma tarefa concluída!", emoji: "🔥", type: "standard" },
  { text: "Você está voando hoje!", emoji: "⚡", type: "standard" },
  { text: "Imparável! Continue assim!", emoji: "🚀", type: "standard" },
  { text: "Excelente trabalho!", emoji: "💪", type: "standard" },
  { text: "Brilhando como sempre!", emoji: "🌟", type: "standard" },
  { text: "Na mosca! Tarefa finalizada!", emoji: "🎯", type: "standard" },
  { text: "Campeão de produtividade!", emoji: "🏆", type: "standard" },
  { text: "Mais uma vitória!", emoji: "✨", type: "standard" },
  { text: "Foco total! Parabéns!", emoji: "🎪", type: "standard" },
  { text: "Nível profissional!", emoji: "⭐", type: "standard" },
  { text: "Mandou bem demais!", emoji: "🎊", type: "standard" },
  { text: "Produtividade em alta!", emoji: "📈", type: "standard" },
  { text: "Tarefa dominada!", emoji: "👑", type: "standard" },
  { text: "Show de eficiência!", emoji: "⚡", type: "standard" },
  { text: "Trabalho impecável!", emoji: "💯", type: "standard" }
]

// Mensagens para sequências (streak)
const streakMessages: MotivationalMessage[] = [
  { text: "2 em sequência! Está pegando fogo!", emoji: "🔥🔥", type: "streak" },
  { text: "3 seguidas! Modo turbo ativado!", emoji: "⚡⚡⚡", type: "streak" },
  { text: "4 tarefas! Você é imparável!", emoji: "🚀🚀🚀🚀", type: "streak" },
  { text: "5 consecutivas! Lenda da produtividade!", emoji: "🏆🏆🏆🏆🏆", type: "streak" },
  { text: "Sequência incrível! Está on fire!", emoji: "🔥⚡🔥⚡", type: "streak" },
  { text: "Combo devastador! Continue!", emoji: "💥💥💥", type: "streak" }
]

// Mensagens baseadas no horário
const timeBasedMessages: MotivationalMessage[] = [
  { text: "Começando bem o dia! Energia total!", emoji: "🌅", type: "time_based" }, // Manhã
  { text: "Produtividade matinal! Excelente!", emoji: "☀️", type: "time_based" }, // Manhã
  { text: "Meio do dia, pique total!", emoji: "🔥", type: "time_based" }, // Tarde
  { text: "Tarde produtiva! Continue assim!", emoji: "⚡", type: "time_based" }, // Tarde
  { text: "Finalizando com chave de ouro!", emoji: "🌟", type: "time_based" }, // Noite
  { text: "Noite produtiva! Dedicação máxima!", emoji: "🌙", type: "time_based" } // Noite
]

// Mensagens especiais (fins de semana, feriados, etc)
const specialMessages: MotivationalMessage[] = [
  { text: "Fim de semana produtivo! Impressionante!", emoji: "🎉", type: "special" },
  { text: "Dedicação total! Você é incrível!", emoji: "🌟", type: "special" },
  { text: "Comprometimento exemplar!", emoji: "👏", type: "special" },
  { text: "Esforço reconhecido! Parabéns!", emoji: "🏅", type: "special" }
]

// Função para pegar uma mensagem aleatória baseada no contexto
export function getMotivationalMessage(
  streak: number = 0,
  userName?: string,
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night',
  isWeekend: boolean = false
): MotivationalMessage {
  let selectedMessage: MotivationalMessage

  // Prioridade: streak > timeOfDay > special > standard
  if (streak >= 2 && streak <= 6) {
    const streakIndex = Math.min(streak - 2, streakMessages.length - 1)
    selectedMessage = streakMessages[streakIndex] || streakMessages[0]
  } else if (timeOfDay && !isWeekend) {
    const timeMessages = timeBasedMessages.filter(msg => {
      if (timeOfDay === 'morning') return msg.text.includes('dia') || msg.text.includes('matinal')
      if (timeOfDay === 'afternoon') return msg.text.includes('meio') || msg.text.includes('tarde')
      if (timeOfDay === 'evening' || timeOfDay === 'night') return msg.text.includes('noite') || msg.text.includes('finalizando')
      return false
    })
    selectedMessage = timeMessages[Math.floor(Math.random() * timeMessages.length)] || standardMessages[0]
  } else if (isWeekend) {
    selectedMessage = specialMessages[Math.floor(Math.random() * specialMessages.length)]
  } else {
    selectedMessage = standardMessages[Math.floor(Math.random() * standardMessages.length)]
  }

  // Personalizar com nome do usuário se fornecido
  if (userName && Math.random() > 0.5) { // 50% chance de personalizar
    selectedMessage = {
      ...selectedMessage,
      text: `${selectedMessage.text.replace('Você', userName).replace('você', userName)}`
    }
  }

  return selectedMessage
}

// Função para detectar horário do dia
export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours()
  
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night'
}

// Função para verificar se é fim de semana
export function isWeekend(): boolean {
  const day = new Date().getDay()
  return day === 0 || day === 6 // Domingo ou Sábado
}