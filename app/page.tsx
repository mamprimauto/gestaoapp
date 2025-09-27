"use client"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { useTaskData } from "@/components/task-data"
import WorkspaceSelector from "@/components/workspace-selector"
import KanbanBoard from "@/components/kanban-board"
import { getSupabaseClient } from '@/lib/supabase/client'

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
  }
]

export default function HomePage() {
  const router = useRouter()
  const { tasks } = useTaskData()
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [hasAutoRedirected, setHasAutoRedirected] = useState(false)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  // Verificar autenticação e atualizar last_seen
  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/login?redirect=/')
        } else {

        }
      } catch (error) {

      } finally {
        setCheckingAuth(false)
      }
    }
    
    checkAuth()
  }, [router])

  // Verificar parâmetros da URL (workspace e openTask)
  useEffect(() => {
    if (!checkingAuth && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const workspaceParam = urlParams.get('workspace')
      const openTaskParam = urlParams.get('openTask')
      
      if (workspaceParam && workspaces.some(w => w.id === workspaceParam)) {
        setSelectedWorkspace(workspaceParam)
        setHasAutoRedirected(true)
      }
      
      if (openTaskParam) {
        setOpenTaskId(openTaskParam)
      }
    }
  }, [checkingAuth])

  // Verificar workspace favorito e redirecionar automaticamente apenas na primeira carga (só se não há workspace na URL)
  useEffect(() => {
    if (!checkingAuth && !hasAutoRedirected && !selectedWorkspace && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const workspaceParam = urlParams.get('workspace')
      
      // Só usar favorito se não há workspace especificado na URL
      if (!workspaceParam) {
        const favoriteWorkspace = localStorage.getItem('favoriteWorkspace')
        if (favoriteWorkspace) {
          // Verificar se o workspace favorito existe na lista de workspaces
          const workspaceExists = workspaces.some(w => w.id === favoriteWorkspace)
          if (workspaceExists) {
            setSelectedWorkspace(favoriteWorkspace)
            setHasAutoRedirected(true)
          } else {
            // Se o workspace favorito não existe mais, remover do localStorage
            localStorage.removeItem('favoriteWorkspace')
          }
        }
      }
    }
  }, [checkingAuth, hasAutoRedirected, selectedWorkspace])

  const handleWorkspaceSelect = (workspaceId: string) => {
    setSelectedWorkspace(workspaceId)
  }

  const handleBackToWorkspaces = () => {
    setSelectedWorkspace(null)
  }

  const selectedWorkspaceData = selectedWorkspace 
    ? workspaces.find(w => w.id === selectedWorkspace)
    : null

  // Mostrar loading enquanto verifica autenticação
  if (checkingAuth) {
    return (
      <div className="p-4 sm:p-6 min-h-screen bg-gradient-to-br from-[#0F1419] to-[#1A1A1A] flex items-center justify-center">
        <div className="text-white/60">Verificando autenticação...</div>
      </div>
    )
  }

  return (
    <div className="p-8 sm:p-12 min-h-screen bg-gradient-to-br from-[#0F1419] to-[#1A1A1A]">
        {selectedWorkspace && selectedWorkspaceData ? (
          <KanbanBoard 
            workspace={selectedWorkspaceData}
            onBack={handleBackToWorkspaces}
            openTaskId={openTaskId}
            onTaskOpened={() => setOpenTaskId(null)}
          />
        ) : (
          <WorkspaceSelector 
            workspaces={workspaces}
            onWorkspaceSelect={handleWorkspaceSelect}
          />
        )}
    </div>
  )
}