export type Workspace = {
  id: string
  name: string
  color: string
  icon: string
  description: string
}

export const workspaces: Workspace[] = [
  { 
    id: 'copy', 
    name: 'Copy', 
    color: '#FF6B6B', 
    icon: '✍️',
    description: 'Criação de textos e conteúdo persuasivo'
  },
  { 
    id: 'edicao', 
    name: 'Edição de Vídeos', 
    color: '#4ECDC4', 
    icon: '🎬',
    description: 'Edição e produção audiovisual'
  },
  { 
    id: 'trafego', 
    name: 'Tráfego Pago', 
    color: '#45B7D1', 
    icon: '📊',
    description: 'Campanhas e otimização de anúncios'
  },
  { 
    id: 'igor', 
    name: 'Área do Igor', 
    color: '#96CEB4', 
    icon: '👤',
    description: 'Projetos e tarefas específicas do Igor'
  },
  { 
    id: 'italo', 
    name: 'Área do Italo', 
    color: '#FFEAA7', 
    icon: '👤',
    description: 'Projetos e tarefas específicas do Italo'
  },
  { 
    id: 'particular', 
    name: 'Particular', 
    color: '#F39C12', 
    icon: '🏠',
    description: 'Tarefas pessoais e privadas'
  }
]