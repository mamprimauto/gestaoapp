"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronRight, Plus, Users, Settings, Lock, Star, Clock, Send, UserPlus, HandHeart, Calendar, Flag, Trash2, Folder, Filter, MoreHorizontal, Edit2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useTaskData } from "./task-data"
import { getSupabaseClient } from "@/lib/supabase/client"
import WorkspacePermissionsDialog from "./workspace-permissions-dialog"
import CrossDepartmentModal from "./cross-department-modal"
import KanbanTaskModal from "./kanban-task-modal"
import type { Workspace } from "@/app/tarefas/page"
import { getUserTimeForDate, formatTime } from "@/lib/timer-utils"

interface WorkspaceSelectorProps {
  workspaces: Workspace[]
  onWorkspaceSelect: (workspaceId: string) => void
}

export default function WorkspaceSelector({ workspaces, onWorkspaceSelect }: WorkspaceSelectorProps) {
  const { tasks, updateTask, members, addTask, deleteTask } = useTaskData()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [selectedWorkspaceForPermissions, setSelectedWorkspaceForPermissions] = useState<Workspace | null>(null)
  const [workspacePermissions, setWorkspacePermissions] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [favoriteWorkspace, setFavoriteWorkspace] = useState<string | null>(null)
  const [userTimes, setUserTimes] = useState<Record<string, { today: number; yesterday: number }>>({})
  const [crossDepartmentModalOpen, setCrossDepartmentModalOpen] = useState(false)
  const [delegateModalOpen, setDelegateModalOpen] = useState(false)
  const [taskToDelegate, setTaskToDelegate] = useState<any | null>(null)
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "med" | "high" | null>(null)
  const [newTaskFolder, setNewTaskFolder] = useState("")
  const [taskDetailsModalOpen, setTaskDetailsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string>("all")
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["Geral"]))
  const [renameFolderModalOpen, setRenameFolderModalOpen] = useState(false)
  const [folderToRename, setFolderToRename] = useState<string>("")
  const [newFolderNameForRename, setNewFolderNameForRename] = useState("")
  const [deleteFolderModalOpen, setDeleteFolderModalOpen] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<string>("")
  const [deleteTaskModalOpen, setDeleteTaskModalOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)

  // Carregar role do usuário e permissões
  useEffect(() => {
    async function loadUserAndPermissions() {
      try {
        const supabase = await getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // Fazer as duas consultas em paralelo para acelerar
          const [profileResult, permissionsResult] = await Promise.all([
            supabase
              .from("profiles")
              .select("role, id, email, name")
              .eq("id", user.id)
              .maybeSingle(),
            supabase
              .from("workspace_permissions")
              .select("workspace_id, allowed_roles")
          ])

          const { data: profileData, error: profileError } = profileResult
          const { data: permissions } = permissionsResult

          // Processar profile
          let profile = profileData
          if (Array.isArray(profileData) && profileData.length > 0) {
            profile = profileData[0]

          }
          
          if (profile && profile.role) {
            // Limpar e normalizar o role
            const cleanRole = profile.role.trim().toLowerCase()

            // Se for admin, garantir que está setado corretamente
            if (cleanRole === "admin") {
              setUserRole("admin")
            } else {
              setUserRole(profile.role)
            }
          } else if (!profileError) {
            // Profile não encontrado, mas sem erro - usuário novo
          } else {
            // Erro ao buscar profile
          }

          // Processar permissões
          if (permissions) {
            const permissionsMap: Record<string, string[]> = {}
            permissions.forEach(p => {
              permissionsMap[p.workspace_id] = p.allowed_roles || []
            })
            setWorkspacePermissions(permissionsMap)
          }
        } else {
          // Usuário não logado
        }
      } catch (error) {

      } finally {
        setLoading(false)
      }
    }
    
    loadUserAndPermissions()
  }, [])

  // Função para recarregar apenas permissões
  const reloadPermissions = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: permissions } = await supabase
        .from("workspace_permissions")
        .select("workspace_id, allowed_roles")

      if (permissions) {
        const permissionsMap: Record<string, string[]> = {}
        permissions.forEach(p => {
          permissionsMap[p.workspace_id] = p.allowed_roles || []
        })
        setWorkspacePermissions(permissionsMap)
      }
    } catch (error) {
      console.error('Erro ao recarregar permissões:', error)
    }
  }

  // Carregar workspace favorito do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('favoriteWorkspace')
    if (saved) {
      setFavoriteWorkspace(saved)
    }
  }, [])

  // Carregar tempo trabalhado dos usuários (apenas os que existem)
  useEffect(() => {
    async function loadUserTimes() {
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      try {
        // Emails dos usuários para verificar
        const usersToCheck = [
          { email: 'cleliolucas@gmail.com', name: 'clelio' },
          { email: 'danilo.dlisboa@gmail.com', name: 'danilo' },
          { email: 'artur.diniz1@gmail.com', name: 'artur' },
          { email: 'rluciano158@hotmail.com', name: 'edson' },
          { email: 'igorzimpel@gmail.com', name: 'igor' },
          { email: 'italonsbarrozo@gmail.com', name: 'italo' }
        ]
        
        const userTimesData: Record<string, { today: number; yesterday: number }> = {}
        
        // Verificar cada usuário e só buscar tempo se ele existir
        for (const user of usersToCheck) {
          try {
            const [todayResult, yesterdayResult] = await Promise.all([
              getUserTimeForDate(user.email, today),
              getUserTimeForDate(user.email, yesterday)
            ])
            
            // Se chegou aqui, o usuário existe
            userTimesData[user.name] = {
              today: todayResult.totalSeconds,
              yesterday: yesterdayResult.totalSeconds
            }
          } catch (error) {
            // Usuário não existe, não adicionar aos dados
            console.log(`Usuário ${user.name} (${user.email}) não encontrado no sistema`)
          }
        }
        
        setUserTimes(userTimesData)
      } catch (error) {
        console.error('Erro ao carregar tempos dos usuários:', error)
      }
    }
    
    if (!loading) {
      loadUserTimes()
    }
  }, [loading])

  // Função para alternar favorito
  const toggleFavorite = (workspaceId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    
    if (favoriteWorkspace === workspaceId) {
      // Remover favorito
      setFavoriteWorkspace(null)
      localStorage.removeItem('favoriteWorkspace')
    } else {
      // Definir como favorito
      setFavoriteWorkspace(workspaceId)
      localStorage.setItem('favoriteWorkspace', workspaceId)
    }
  }

  // Contar tarefas por workspace
  const getWorkspaceTaskCount = (workspaceId: string) => {
    return tasks.filter(task => task.tag === `kanban-${workspaceId}`).length
  }

  // Verificar se o usuário tem acesso ao workspace
  const hasAccessToWorkspace = (workspaceId: string) => {
    // Durante o carregamento, não mostrar nenhum workspace
    if (loading) {
      return false
    }
    
    // Admin SEMPRE tem acesso total a TODAS as áreas
    // Verificar tanto string quanto possíveis espaços em branco
    if (userRole && userRole.trim().toLowerCase() === "admin") {
      return true
    }
    
    // Para outros usuários, verificar permissões
    if (!userRole) {
      return false
    }
    
    // Verificar permissões específicas do banco para todos os workspaces
    const permissions = workspacePermissions[workspaceId]
    if (!permissions || permissions.length === 0) {

      return true // Se não há permissões definidas, todos têm acesso
    }
    
    const hasAccess = permissions.includes(userRole)

    return hasAccess
  }

  // Função para verificar se tem acesso à Central de Tarefas
  const hasAccessToCentralTasks = () => {
    if (!userRole) return false
    
    const allowedRoles = ['admin', 'copywriter', 'gestor_trafego']
    const cleanRole = userRole.trim().toLowerCase()
    
    return allowedRoles.includes(cleanRole)
  }

  const handleSettingsClick = (e: React.MouseEvent, workspace: Workspace) => {

    e.stopPropagation()
    e.preventDefault()
    setSelectedWorkspaceForPermissions(workspace)
    setPermissionsDialogOpen(true)

  }

  const handleWorkspaceClick = (workspaceId: string) => {
    if (hasAccessToWorkspace(workspaceId)) {
      onWorkspaceSelect(workspaceId)
    }
  }

  // Obter tarefas da área central (tag especial 'central-tasks')
  const allCentralTasks = tasks.filter(task => task.tag === 'central-tasks')
  
  // Obter pastas únicas das tarefas centrais, garantindo que "Geral" sempre exista
  const uniqueFolders = Array.from(new Set(allCentralTasks.map(task => task.owner || "Geral")))
  const folders = ['Geral', ...uniqueFolders.filter(f => f !== 'Geral').sort()]
  
  // Mostrar todas as tarefas centrais (filtro removido)
  const centralTasks = allCentralTasks

  // Função para delegar tarefa
  const handleDelegateTask = (task: any) => {
    setTaskToDelegate(task)
    setDelegateModalOpen(true)
  }

  // Função para confirmar delegação
  const confirmDelegateTask = async (memberId: string) => {
    if (!taskToDelegate) return

    try {
      const selectedMember = members.find(m => m.id === memberId)
      if (!selectedMember) return

      // Definir workspace baseado no role do membro OU email específico
      let targetWorkspace = 'igor' // fallback
      
      // Verificar primeiro por email específico (mais confiável)
      if (selectedMember.email === 'italonsbarrozo@gmail.com') {
        targetWorkspace = 'italo'
      } else if (selectedMember.email === 'igorzimpel@gmail.com') {
        targetWorkspace = 'igor'
      } else if (selectedMember.email === 'cleliolucas@gmail.com' || selectedMember.email === 'danilo.dlisboa@gmail.com') {
        targetWorkspace = 'edicao'
      } else if (selectedMember.email === 'artur.diniz1@gmail.com') {
        targetWorkspace = 'trafego'
      } else if (selectedMember.email === 'rluciano158@hotmail.com') {
        targetWorkspace = 'copy'
      } else {
        // Mapear roles para workspaces
        const roleToWorkspace: Record<string, string> = {
          'copywriter': 'copy',
          'copy': 'copy',
          'editor': 'edicao',
          'edicao': 'edicao',
          'trafego': 'trafego',
          'admin': 'igor',
          'italo': 'italo'
        }

        if (selectedMember.role) {
          const memberRole = selectedMember.role.toLowerCase().trim()
          targetWorkspace = roleToWorkspace[memberRole] || 'igor'
        }
      }
      
      console.log('DEBUG - selectedMember:', selectedMember)
      console.log('DEBUG - targetWorkspace:', targetWorkspace)

      // Atualizar tarefa
      console.log('DEBUG - Updating task with:', {
        assignee_id: memberId,
        tag: `kanban-${targetWorkspace}`,
        kanban_column: 'todo'
      })
      
      await updateTask(taskToDelegate.id, {
        assignee_id: memberId,
        tag: `kanban-${targetWorkspace}`,
        kanban_column: 'todo'
      })

      setDelegateModalOpen(false)
      setTaskToDelegate(null)
    } catch (error) {
      console.error('Erro ao delegar tarefa:', error)
    }
  }

  // Função para pegar tarefa
  const handleTakeTask = async (task: any) => {
    try {
      // Obter ID do usuário atual
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Usar workspace favorito ou 'igor' como fallback
      const targetWorkspace = favoriteWorkspace || 'igor'

      // Atualizar tarefa
      await updateTask(task.id, {
        assignee_id: user.id,
        tag: `kanban-${targetWorkspace}`,
        kanban_column: 'todo'
      })
    } catch (error) {
      console.error('Erro ao pegar tarefa:', error)
    }
  }

  // Função para criar tarefa central
  const handleCreateCentralTask = async () => {
    if (!newTaskTitle.trim()) return

    try {
      await addTask({
        title: newTaskTitle,
        tag: 'central-tasks',
        status: 'pending',
        priority: newTaskPriority,
        owner: "Geral" // Sempre usar "Geral" como padrão
      })

      // Limpar form e fechar modal
      setNewTaskTitle("")
      setNewTaskPriority(null)
      setCreateTaskModalOpen(false)
    } catch (error) {
      console.error('Erro ao criar tarefa central:', error)
    }
  }

  // Função para abrir modal de deletar tarefa central
  const handleDeleteCentralTask = (taskId: string) => {
    setTaskToDelete(taskId)
    setDeleteTaskModalOpen(true)
  }

  // Função para confirmar exclusão de tarefa
  const confirmDeleteTask = async () => {
    if (!taskToDelete) return
    
    try {
      await deleteTask(taskToDelete)
      setDeleteTaskModalOpen(false)
      setTaskToDelete(null)
    } catch (error) {
      console.error('Erro ao deletar tarefa central:', error)
      alert('Erro ao excluir tarefa. Tente novamente.')
    }
  }

  // Função para criar nova pasta
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    
    // Criar uma tarefa placeholder para criar a pasta
    try {
      await addTask({
        title: `📁 ${newFolderName}`,
        description: "Pasta criada automaticamente",
        tag: 'central-tasks',
        status: 'done', // Marcar como concluída para não aparecer nas contagens
        priority: null,
        owner: newFolderName.trim()
      })

      // Expandir a nova pasta
      setExpandedFolders(prev => new Set([...prev, newFolderName.trim()]))
      
      // Limpar form e fechar modal
      setNewFolderName("")
      setCreateFolderModalOpen(false)
    } catch (error) {
      console.error('Erro ao criar pasta:', error)
    }
  }

  // Função para alternar expansão da pasta
  const toggleFolderExpansion = (folderName: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderName)) {
        newSet.delete(folderName)
      } else {
        newSet.add(folderName)
      }
      return newSet
    })
  }

  // Função para criar tarefa em pasta específica
  const handleCreateTaskInFolder = (folderName: string) => {
    setNewTaskFolder(folderName)
    setCreateTaskModalOpen(true)
  }

  // Função para iniciar rename de pasta
  const handleStartRenameFolder = (folderName: string) => {
    // Impedir renomeação da pasta "Geral"
    if (folderName === "Geral") {
      alert("A pasta 'Geral' não pode ser renomeada pois é uma pasta protegida do sistema.")
      return
    }
    
    setFolderToRename(folderName)
    setNewFolderNameForRename(folderName)
    setRenameFolderModalOpen(true)
  }

  // Função para renomear pasta
  const handleRenameFolder = async () => {
    if (!newFolderNameForRename.trim() || !folderToRename) return
    
    const oldFolderName = folderToRename
    const newFolderName = newFolderNameForRename.trim()
    
    if (oldFolderName === newFolderName) {
      setRenameFolderModalOpen(false)
      return
    }
    
    try {
      // Atualizar todas as tarefas da pasta antiga para o novo nome
      const tasksToUpdate = allCentralTasks.filter(task => (task.owner || "Geral") === oldFolderName)
      
      // Atualizar cada tarefa individualmente
      for (const task of tasksToUpdate) {
        await updateTask(task.id, {
          owner: newFolderName
        })
      }

      // Atualizar estado local de pastas expandidas
      setExpandedFolders(prev => {
        const newSet = new Set(prev)
        if (newSet.has(oldFolderName)) {
          newSet.delete(oldFolderName)
          newSet.add(newFolderName)
        }
        return newSet
      })
      
      // Se a pasta renomeada estava selecionada, atualizar seleção
      if (selectedFolder === oldFolderName) {
        setSelectedFolder(newFolderName)
      }
      
      // Limpar form e fechar modal
      setFolderToRename("")
      setNewFolderNameForRename("")
      setRenameFolderModalOpen(false)
    } catch (error) {
      console.error('Erro ao renomear pasta:', error)
    }
  }

  // Função para abrir modal de exclusão de pasta
  const handleDeleteFolder = (folderName: string) => {
    // Impedir exclusão da pasta "Geral"
    if (folderName === "Geral") {
      alert("A pasta 'Geral' não pode ser excluída pois é uma pasta protegida do sistema.")
      return
    }
    
    setFolderToDelete(folderName)
    setDeleteFolderModalOpen(true)
  }

  // Função para confirmar exclusão de pasta
  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return
    
    try {
      const tasksInFolder = allCentralTasks.filter(task => (task.owner || "Geral") === folderToDelete)
      
      // Excluir todas as tarefas da pasta
      for (const task of tasksInFolder) {
        await deleteTask(task.id)
      }
      
      // Remover pasta dos estados
      setExpandedFolders(prev => {
        const newSet = new Set(prev)
        newSet.delete(folderToDelete)
        return newSet
      })
      
      // Se a pasta excluída estava selecionada, limpar seleção
      if (selectedFolder === folderToDelete) {
        setSelectedFolder("all")
      }

      // Fechar modal e limpar estado
      setDeleteFolderModalOpen(false)
      setFolderToDelete("")
    } catch (error) {
      console.error('Erro ao excluir pasta:', error)
      alert('Erro ao excluir pasta. Tente novamente.')
    }
  }

  // Função para abrir detalhes da tarefa
  const handleTaskClick = (task: any) => {
    setSelectedTask(task)
    setTaskDetailsModalOpen(true)
  }

  return (
    <div className="max-w-6xl mx-auto">

      {/* Seção Central de Tarefas */}
      {!loading && hasAccessToCentralTasks() && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/10">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white tracking-tight">
                    Central de Tarefas
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">
                    Gerencie e distribua tarefas entre departamentos
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setCreateFolderModalOpen(true)}
                variant="outline"
                className="border-white/20 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/30 h-10 px-4"
              >
                <Folder className="h-4 w-4 mr-2" />
                Nova Pasta
              </Button>
            </div>
          </div>
          
          <Card className="border border-white/10 bg-gradient-to-br from-[#1A1A1A]/90 to-[#1F1F23]/90 backdrop-blur-sm shadow-2xl shadow-black/20">
            <CardContent className="p-0">
              {/* Header da tabela */}
              <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3 text-xs font-medium text-white/60 uppercase tracking-wider">
                  <div className="flex-1">Tarefa</div>
                  <div className="w-16 text-center">Data</div>
                  <div className="w-24 text-center">Ações</div>
                </div>
              </div>
              
              {/* Lista de tarefas agrupadas por pasta */}
              <div>
                {folders.map(folder => {
                  const folderTasks = centralTasks
                    .filter(task => (task.owner || "Geral") === folder)
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 20)
                  
                  if (folderTasks.length === 0 && folder !== "Geral") return null
                  
                  const isExpanded = expandedFolders.has(folder)
                  const actualTasks = folderTasks.filter(task => !task.title.startsWith('📁'))
                  
                  return (
                    <div key={folder}>
                      {/* Cabeçalho da pasta */}
                      <div className="group px-4 py-3 bg-white/[0.01] border-b border-white/[0.02] sticky top-0 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => toggleFolderExpansion(folder)}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleFolderExpansion(folder)
                              }}
                              className="h-6 w-6 p-0 hover:bg-white/10"
                            >
                              <ChevronRight className={`h-3 w-3 text-white/60 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </Button>
                            <Folder className={`h-4 w-4 ${isExpanded ? 'text-blue-400' : 'text-white/60'} transition-colors cursor-pointer`} />
                            <h4 className="text-sm font-medium text-white/80 cursor-pointer hover:text-white transition-colors">
                              {folder}
                            </h4>
                            <span className="text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
                              {actualTasks.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCreateTaskInFolder(folder)}
                              className="h-6 w-6 p-0 hover:bg-white/10"
                              title={`Adicionar tarefa em ${folder}`}
                            >
                              <Plus className="h-3 w-3 text-white/60" />
                            </Button>
                            {folder !== "Geral" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-white/10"
                                    title={`Opções para ${folder}`}
                                  >
                                    <MoreHorizontal className="h-3 w-3 text-white/60" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#1C1C1E] border-[#2A2A2C]">
                                  <DropdownMenuItem 
                                    onClick={() => handleStartRenameFolder(folder)}
                                    className="text-white/80 hover:bg-white/10 focus:bg-white/10"
                                  >
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Renomear pasta
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteFolder(folder)}
                                    className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir pasta
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Tarefas da pasta */}
                      {isExpanded && (
                        <div className="relative">
                          {/* Botão Nova Tarefa Contextual - Aparece no início quando a pasta está aberta */}
                          <div className="px-4 py-1.5 border-b border-white/[0.03] animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex justify-start">
                              <Button
                                onClick={() => handleCreateTaskInFolder(folder)}
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[11px] text-white/40 hover:text-white/60 hover:bg-white/[0.02] transition-all duration-300 font-normal"
                              >
                                <Plus className="h-2.5 w-2.5 mr-1" />
                                <span>Nova Tarefa</span>
                              </Button>
                            </div>
                          </div>
                          
                          {/* Lista de tarefas */}
                          {actualTasks.map((task, index) => (
                            <div 
                              key={task.id} 
                              onClick={() => handleTaskClick(task)}
                              className={`group flex items-center gap-3 px-4 py-4 hover:bg-gradient-to-r hover:from-white/[0.02] hover:to-white/[0.01] transition-all duration-200 cursor-pointer ${
                                index !== actualTasks.length - 1 ? 'border-b border-white/[0.03]' : ''
                              }`}
                            >
                              {/* Prioridade + Título */}
                              <div className="flex-1 min-w-0 flex items-center gap-3">
                                <div className="w-4 h-4 flex items-center justify-center">
                                  {task.priority ? (
                                    <div className={`w-3 h-3 rounded-full shadow-sm ${
                                      task.priority === 'high' 
                                        ? 'bg-red-400 shadow-red-400/20'
                                        : task.priority === 'med'
                                        ? 'bg-yellow-400 shadow-yellow-400/20'
                                        : 'bg-blue-400 shadow-blue-400/20'
                                    }`} title={task.priority === 'high' ? 'Prioridade Alta' : task.priority === 'med' ? 'Prioridade Média' : 'Prioridade Baixa'}>
                                    </div>
                                  ) : (
                                    <div className="w-3 h-3 rounded-full bg-white/10" title="Sem prioridade definida"></div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-white/90 truncate text-sm group-hover:text-white transition-colors">
                                    {task.title}
                                  </h3>
                                </div>
                              </div>
                              
                              {/* Data de criação */}
                              <div className="w-16 flex justify-center">
                                <div className="text-xs text-white/50 group-hover:text-white/70 transition-colors font-mono">
                                  {new Date(task.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                </div>
                              </div>
                              
                              {/* Ações */}
                              <div className="w-24 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelegateTask(task)
                                  }}
                                  size="sm"
                                  className="h-7 w-7 p-0 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-400/30 transition-all duration-200"
                                  title="Delegar tarefa"
                                >
                                  <UserPlus className="h-3 w-3" />
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleTakeTask(task)
                                  }}
                                  size="sm" 
                                  className="h-7 w-7 p-0 bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 border border-green-500/20 hover:border-green-400/30 transition-all duration-200"
                                  title="Pegar tarefa"
                                >
                                  <HandHeart className="h-3 w-3" />
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteCentralTask(task.id)
                                  }}
                                  size="sm"
                                  className="h-7 w-7 p-0 bg-gray-500/5 hover:bg-red-500/10 text-gray-400/40 hover:text-red-400/60 border border-gray-500/10 hover:border-red-400/20 transition-all duration-200"
                                  title="Excluir tarefa"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
          
          {allCentralTasks.length > 20 && (
            <div className="text-center mt-4">
              <p className="text-sm text-white/60">
                Mostrando até 20 tarefas por pasta
              </p>
            </div>
          )}
        </div>
      )}

      {/* Grid de Workspaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={`loading-${index}`} className="border border-white/10 bg-[#1A1A1A]/80">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-lg bg-gray-700 animate-pulse" />
                  <div className="h-5 w-5 bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="space-y-3">
                  <div className="h-6 bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4" />
                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-gray-700 animate-pulse" />
                      <div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
                    </div>
                    <div className="h-3 w-12 bg-gray-700 rounded animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            {/* 6º Card - Solicitar Tarefa Cross-Department */}
            <Card 
              className="group relative overflow-hidden border transition-all duration-300 border-white/10 bg-[#1A1A1A]/80 backdrop-blur-sm hover:bg-[#2A2A2A]/80 hover:scale-105 cursor-pointer hover:shadow-2xl hover:border-white/20"
              onClick={() => setCrossDepartmentModalOpen(true)}
            >
              
              {/* Efeito sutil de brilho */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-zinc-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-lg"></div>
              
              {/* Linha superior animada */}
              <div className="absolute top-0 left-0 w-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent group-hover:w-full transition-all duration-1000 rounded-t-lg"></div>
              
              {/* Cantos com glow sutil */}
              <div className="absolute top-0 left-0 w-3 h-3 bg-blue-500/0 group-hover:bg-blue-500/30 rounded-tl-lg transition-all duration-700 blur-sm"></div>
              <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500/0 group-hover:bg-blue-500/30 rounded-tr-lg transition-all duration-700 blur-sm"></div>
              
              <CardContent className="p-7 relative z-10">
                {/* Header minimalista */}
                <div className="flex items-start justify-between mb-6">
                  <div className="relative">
                    <div 
                      className="h-12 w-12 rounded-lg flex items-center justify-center bg-zinc-900/80 border border-zinc-800 group-hover:border-blue-500/40 group-hover:bg-blue-500/10 transition-all duration-500"
                    >
                      <span className="text-lg">📨</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <ChevronRight 
                      className="h-4 w-4 text-zinc-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-500" 
                    />
                  </div>
                </div>

                {/* Conteúdo minimalista */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-100 transition-colors duration-500 tracking-tight">
                      Solicitar Tarefa
                    </h3>
                    <div className="mt-1 h-[1px] w-0 group-hover:w-8 bg-blue-500 transition-all duration-700"></div>
                  </div>
                  
                  <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors duration-500 leading-relaxed">
                    Colaboração entre departamentos com sincronização automática de tarefas.
                  </p>
                  
                  {/* Botão de ação */}
                  <div className="pt-2">
                    <button className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-white hover:text-blue-400 bg-zinc-900/50 hover:bg-blue-500/10 border border-zinc-800 hover:border-blue-500/30 rounded-lg transition-all duration-300 group-hover:border-blue-500/40">
                      <Send className="h-4 w-4" />
                      Criar Solicitação
                    </button>
                  </div>
                  
                </div>
              </CardContent>
            </Card>

            {/* Cards dos Workspaces Existentes */}
            {workspaces
              .filter((workspace) => {
                const hasAccess = hasAccessToWorkspace(workspace.id)
                return hasAccess // Só mostra workspaces que o usuário tem acesso
              })
              .map((workspace) => {
          const taskCount = getWorkspaceTaskCount(workspace.id)
          const hasAccess = true // Sempre true aqui porque já filtramos acima
          const isAdmin = userRole === "admin"
          
          // Calcular progresso das tarefas
          const workspaceTasks = tasks.filter(task => task.tag === `kanban-${workspace.id}`)
          const completedTasks = workspaceTasks.filter(task => task.kanban_column === 'done').length
          const progressPercentage = workspaceTasks.length > 0 ? Math.round((completedTasks / workspaceTasks.length) * 100) : 0
          
          return (
            <Card 
              key={workspace.id}
              className="group relative overflow-hidden border transition-all duration-300 border-white/10 bg-[#1A1A1A]/80 backdrop-blur-sm hover:bg-[#2A2A2A]/80 hover:scale-105 cursor-pointer hover:shadow-2xl hover:border-white/20"
              onClick={() => handleWorkspaceClick(workspace.id)}
            >
              <CardContent className="p-6">
                {/* Header do Card */}
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="h-12 w-12 rounded-lg flex items-center justify-center text-2xl shadow-lg"
                    style={{ 
                      backgroundColor: workspace.color + '20', 
                      borderColor: workspace.color + '40' 
                    }}
                  >
                    <span>{workspace.icon}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Botão de Favorito */}
                    <button
                      onClick={(e) => toggleFavorite(workspace.id, e)}
                      className={`h-8 w-8 flex items-center justify-center rounded-md transition-all duration-200 relative z-[1] ${
                        favoriteWorkspace === workspace.id
                          ? 'text-yellow-400 border border-yellow-400/50 hover:border-yellow-400/80'
                          : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                      }`}
                      title={favoriteWorkspace === workspace.id ? 'Remover dos favoritos' : 'Marcar como favorito'}
                    >
                      <Star 
                        className="h-4 w-4 transition-all duration-200"
                        fill={favoriteWorkspace === workspace.id ? '#facc15' : 'none'}
                        stroke={favoriteWorkspace === workspace.id ? 'none' : 'rgba(255, 255, 255, 0.3)'}
                        strokeWidth={favoriteWorkspace === workspace.id ? '0' : '1.5'}
                        style={{ 
                          stroke: favoriteWorkspace === workspace.id ? 'none' : 'rgba(255, 255, 255, 0.3)',
                          strokeWidth: favoriteWorkspace === workspace.id ? '0' : '1.5'
                        }} 
                      />
                    </button>
                    
                    {isAdmin && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                        }}
                      >
                        <DropdownMenu 
                          open={openDropdown === workspace.id}
                          onOpenChange={(open) => {
                            setOpenDropdown(open ? workspace.id : null)
                          }}
                        >
                          <DropdownMenuTrigger
                            className="h-8 w-8 flex items-center justify-center rounded-md text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors relative z-[1]"
                            onClick={(e) => {
                              e.stopPropagation()
                            }}
                          >
                            <Settings className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            className="bg-[#1C1C1E] border-[#2A2A2C] text-white z-[100]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenuItem 
                              className="hover:bg-white/10 cursor-pointer focus:bg-white/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()

                                setSelectedWorkspaceForPermissions(workspace)
                                setPermissionsDialogOpen(true)
                                setOpenDropdown(null) // Fechar o dropdown
                              }}
                            >
                              Permissões
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                    <ChevronRight 
                      className="h-5 w-5 transition-all duration-200 text-white/40 group-hover:text-white/80 group-hover:translate-x-1" 
                    />
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-white group-hover:text-white/90">
                    {workspace.name}
                  </h3>
                  
                  <p className="text-sm leading-relaxed text-white/60">
                    {workspace.description}
                  </p>

                  {/* Estatísticas */}
                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <div 
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: workspace.color }}
                        />
                        <span>{taskCount} tarefa{taskCount !== 1 ? 's' : ''}</span>
                      </div>
                      
                      <div className="text-xs font-mono text-white/50">
                        {workspace.id.toUpperCase()}
                      </div>
                    </div>
                    
                    {/* Barra de Progresso */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white/60">Progresso</span>
                          <span className="text-xs font-medium text-white/80">{progressPercentage}%</span>
                        </div>
                        <div className="bg-black/20 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="h-full transition-all duration-300 rounded-full bg-green-500"
                            style={{ 
                              width: `${progressPercentage}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Tempo trabalhado - Edição de Vídeos */}
                    {workspace.id === 'edicao' && (
                      <div className="space-y-2 text-xs">
                        {/* Tempo do Clélio - só mostrar se existir */}
                        {userTimes.clelio && (
                          <div className="bg-white/5 rounded-md p-2">
                            <div className="flex items-center gap-1 mb-1">
                              <Clock className="h-3 w-3 text-blue-400" />
                              <span className="font-medium text-white/80">Clélio</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-white/60">Hoje:</span>
                                <span className="font-mono text-blue-400">
                                  {formatTime(userTimes.clelio.today)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/60">Ontem:</span>
                                <span className="font-mono text-white/50">
                                  {formatTime(userTimes.clelio.yesterday)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Tempo do Danilo - só mostrar se existir */}
                        {userTimes.danilo && (
                          <div className="bg-white/5 rounded-md p-2">
                            <div className="flex items-center gap-1 mb-1">
                              <Clock className="h-3 w-3 text-green-400" />
                              <span className="font-medium text-white/80">Danilo</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-white/60">Hoje:</span>
                                <span className="font-mono text-green-400">
                                  {formatTime(userTimes.danilo.today)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/60">Ontem:</span>
                                <span className="font-mono text-white/50">
                                  {formatTime(userTimes.danilo.yesterday)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Mensagem se nenhum usuário existir */}
                        {!userTimes.clelio && !userTimes.danilo && (
                          <div className="bg-white/5 rounded-md p-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="h-3 w-3 animate-spin rounded-full border border-blue-400 border-t-transparent"></div>
                              <span className="text-white/60 text-xs">Carregando...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Tempo trabalhado - Tráfego Pago */}
                    {workspace.id === 'trafego' && (
                      <div className="space-y-2 text-xs">
                        {/* Tempo do Artur - só mostrar se existir */}
                        {userTimes.artur ? (
                          <div className="bg-white/5 rounded-md p-2">
                            <div className="flex items-center gap-1 mb-1">
                              <Clock className="h-3 w-3 text-purple-400" />
                              <span className="font-medium text-white/80">Artur</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-white/60">Hoje:</span>
                                <span className="font-mono text-purple-400">
                                  {formatTime(userTimes.artur.today)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/60">Ontem:</span>
                                <span className="font-mono text-white/50">
                                  {formatTime(userTimes.artur.yesterday)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white/5 rounded-md p-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="h-3 w-3 animate-spin rounded-full border border-purple-400 border-t-transparent"></div>
                              <span className="text-white/60 text-xs">Carregando...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Tempo trabalhado - Copy */}
                    {workspace.id === 'copy' && (
                      <div className="space-y-2 text-xs">
                        {/* Tempo do Edson - só mostrar se existir */}
                        {userTimes.edson ? (
                          <div className="bg-white/5 rounded-md p-2">
                            <div className="flex items-center gap-1 mb-1">
                              <Clock className="h-3 w-3 text-orange-400" />
                              <span className="font-medium text-white/80">Edson</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-white/60">Hoje:</span>
                                <span className="font-mono text-orange-400">
                                  {formatTime(userTimes.edson.today)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/60">Ontem:</span>
                                <span className="font-mono text-white/50">
                                  {formatTime(userTimes.edson.yesterday)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white/5 rounded-md p-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="h-3 w-3 animate-spin rounded-full border border-orange-400 border-t-transparent"></div>
                              <span className="text-white/60 text-xs">Carregando...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Tempo trabalhado - Área do Igor */}
                    {workspace.id === 'igor' && (
                      <div className="space-y-2 text-xs">
                        {/* Tempo do Igor - sempre mostrar pois é o usuário atual */}
                        <div className="bg-white/5 rounded-md p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <Clock className="h-3 w-3 text-cyan-400" />
                            <span className="font-medium text-white/80">Igor</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-white/60">Hoje:</span>
                              <span className="font-mono text-cyan-400">
                                {userTimes.igor ? formatTime(userTimes.igor.today) : '00:00'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/60">Ontem:</span>
                              <span className="font-mono text-white/50">
                                {userTimes.igor ? formatTime(userTimes.igor.yesterday) : '00:00'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Tempo trabalhado - Área do Italo */}
                    {workspace.id === 'italo' && (
                      <div className="space-y-2 text-xs">
                        {/* Tempo do Italo - só mostrar se existir */}
                        {userTimes.italo ? (
                          <div className="bg-white/5 rounded-md p-2">
                            <div className="flex items-center gap-1 mb-1">
                              <Clock className="h-3 w-3 text-amber-400" />
                              <span className="font-medium text-white/80">Italo</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-white/60">Hoje:</span>
                                <span className="font-mono text-amber-400">
                                  {formatTime(userTimes.italo.today)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/60">Ontem:</span>
                                <span className="font-mono text-white/50">
                                  {formatTime(userTimes.italo.yesterday)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white/5 rounded-md p-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="h-3 w-3 animate-spin rounded-full border border-amber-400 border-t-transparent"></div>
                              <span className="text-white/60 text-xs">Carregando...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                {/* Indicador de hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
                  style={{ backgroundColor: workspace.color }}
                />
              </CardContent>
            </Card>
          )
        })}
          </>
        )}
      </div>

      {/* Dialog de Permissões */}
      <WorkspacePermissionsDialog
        workspace={selectedWorkspaceForPermissions}
        isOpen={permissionsDialogOpen}
        userRole={userRole}
        onClose={() => {

          setPermissionsDialogOpen(false)
          setSelectedWorkspaceForPermissions(null)
          // Recarregar apenas as permissões, sem resetar o userRole
          reloadPermissions()
        }}
      />

      {/* Modal Cross-Department */}
      <CrossDepartmentModal
        isOpen={crossDepartmentModalOpen}
        onClose={() => setCrossDepartmentModalOpen(false)}
        workspaces={workspaces}
        currentUserRole={userRole}
      />

      {/* Modal de Delegação */}
      <Dialog open={delegateModalOpen} onOpenChange={setDelegateModalOpen}>
        <DialogContent className="max-w-md bg-[#1C1C1E] text-[#F2F2F7] border border-[#2A2A2C]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-400" />
              Delegar Tarefa
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {taskToDelegate && (
                <>Selecione um membro para delegar a tarefa "<strong>{taskToDelegate.title}</strong>"</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {members?.map(member => (
              <div
                key={member.id}
                onClick={() => confirmDelegateTask(member.id)}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 bg-[#2A2A2C] hover:bg-[#3A3A3C] border border-[#3A3A3C] hover:border-blue-500/50"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar_url || "/minimal-avatar.png"} />
                  <AvatarFallback className="bg-[#3A3A3C] text-white/70">
                    {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <p className="font-medium text-white/90">{member.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white/60">{member.email}</p>
                    {member.role && (
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                        {member.role}
                      </span>
                    )}
                  </div>
                </div>
                
                <ChevronRight className="h-4 w-4 text-white/40" />
              </div>
            ))}
            
            {(!members || members.length === 0) && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-white/20 mx-auto mb-3" />
                <p className="text-sm text-white/50">Nenhum membro disponível</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t border-[#2E2E30]">
            <Button
              variant="ghost"
              onClick={() => setDelegateModalOpen(false)}
              className="text-white/80 hover:bg-white/5"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Criação de Pasta */}
      <Dialog open={createFolderModalOpen} onOpenChange={setCreateFolderModalOpen}>
        <DialogContent className="max-w-md bg-[#1C1C1E] text-[#F2F2F7] border border-[#2A2A2C]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-blue-400" />
              Criar Nova Pasta
            </DialogTitle>
            <DialogDescription>
              Crie uma pasta para organizar suas tarefas centrais
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name" className="text-sm font-medium text-white/80">
                Nome da Pasta
              </Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ex: Bloco A, Campanhas Q1, etc."
                className="mt-1 bg-[#2A2A2C] border border-[#3A3A3C] text-white placeholder:text-white/40"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                    handleCreateFolder()
                  }
                }}
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setCreateFolderModalOpen(false)}
              className="flex-1 border-[#3A3A3C] text-white/70 hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Criar Pasta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Renomear Pasta */}
      <Dialog open={renameFolderModalOpen} onOpenChange={setRenameFolderModalOpen}>
        <DialogContent className="max-w-md bg-[#1C1C1E] text-[#F2F2F7] border border-[#2A2A2C]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-blue-400" />
              Renomear Pasta
            </DialogTitle>
            <DialogDescription>
              Altere o nome da pasta "{folderToRename}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="rename-folder-name" className="text-sm font-medium text-white/80">
                Novo Nome da Pasta
              </Label>
              <Input
                id="rename-folder-name"
                value={newFolderNameForRename}
                onChange={(e) => setNewFolderNameForRename(e.target.value)}
                placeholder="Digite o novo nome da pasta"
                className="mt-1 bg-[#2A2A2C] border border-[#3A3A3C] text-white placeholder:text-white/40"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderNameForRename.trim()) {
                    handleRenameFolder()
                  }
                  if (e.key === 'Escape') {
                    setRenameFolderModalOpen(false)
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setRenameFolderModalOpen(false)}
              className="flex-1 border-[#3A3A3C] text-white/70 hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleRenameFolder}
              disabled={!newFolderNameForRename.trim() || newFolderNameForRename.trim() === folderToRename}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Renomear
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Excluir Pasta */}
      <Dialog open={deleteFolderModalOpen} onOpenChange={setDeleteFolderModalOpen}>
        <DialogContent className="max-w-md bg-[#1C1C1E] text-[#F2F2F7] border border-[#2A2A2C]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-400" />
              Excluir Pasta
            </DialogTitle>
            <DialogDescription>
              {(() => {
                const tasksInFolder = allCentralTasks.filter(task => (task.owner || "Geral") === folderToDelete)
                return tasksInFolder.length > 0 
                  ? `A pasta "${folderToDelete}" contém ${tasksInFolder.length} tarefa(s). Todas as tarefas serão excluídas permanentemente.`
                  : `A pasta "${folderToDelete}" será excluída permanentemente.`
              })()}
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 my-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Trash2 className="h-3 w-3 text-red-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-300 mb-1">Atenção!</h4>
                <p className="text-sm text-red-200/80">
                  Esta ação não pode ser desfeita. {(() => {
                    const tasksInFolder = allCentralTasks.filter(task => (task.owner || "Geral") === folderToDelete)
                    return tasksInFolder.length > 0 
                      ? `Todas as ${tasksInFolder.length} tarefa(s) dentro da pasta também serão excluídas.`
                      : "A pasta será removida permanentemente."
                  })()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteFolderModalOpen(false)
                setFolderToDelete("")
              }}
              className="flex-1 border-[#3A3A3C] text-white/70 hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmDeleteFolder}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Pasta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Excluir Tarefa */}
      <Dialog open={deleteTaskModalOpen} onOpenChange={setDeleteTaskModalOpen}>
        <DialogContent className="max-w-md bg-[#1C1C1E] text-[#F2F2F7] border border-[#2A2A2C]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-400" />
              Excluir Tarefa
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 my-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Trash2 className="h-3 w-3 text-red-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-300 mb-1">Atenção!</h4>
                <p className="text-sm text-red-200/80">
                  A tarefa será removida permanentemente e não poderá ser recuperada.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteTaskModalOpen(false)
                setTaskToDelete(null)
              }}
              className="flex-1 border-[#3A3A3C] text-white/70 hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmDeleteTask}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Tarefa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Criação de Tarefa */}
      <Dialog open={createTaskModalOpen} onOpenChange={setCreateTaskModalOpen}>
        <DialogContent className="max-w-md bg-[#1C1C1E] text-[#F2F2F7] border border-[#2A2A2C]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-400" />
              Criar Tarefa Central
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Crie uma nova tarefa na central de tarefas
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-title" className="text-white/80">
                Título *
              </Label>
              <Input
                id="task-title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Digite o título da tarefa"
                className="mt-1 bg-[#2A2A2C] border-[#3A3A3C] text-white placeholder:text-white/50"
              />
            </div>
            
            <div>
              <Label className="text-white/80">
                Prioridade
              </Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  onClick={() => setNewTaskPriority(newTaskPriority === 'high' ? null : 'high')}
                  className={`h-8 px-3 flex items-center gap-2 text-xs ${
                    newTaskPriority === 'high'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-[#2A2A2C] hover:bg-[#3A3A3C] text-white/70 border border-[#3A3A3C]'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-red-400"></div>
                  Alta
                </Button>
                <Button
                  type="button"
                  onClick={() => setNewTaskPriority(newTaskPriority === 'med' ? null : 'med')}
                  className={`h-8 px-3 flex items-center gap-2 text-xs ${
                    newTaskPriority === 'med'
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-[#2A2A2C] hover:bg-[#3A3A3C] text-white/70 border border-[#3A3A3C]'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                  Média
                </Button>
                <Button
                  type="button"
                  onClick={() => setNewTaskPriority(newTaskPriority === 'low' ? null : 'low')}
                  className={`h-8 px-3 flex items-center gap-2 text-xs ${
                    newTaskPriority === 'low'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-[#2A2A2C] hover:bg-[#3A3A3C] text-white/70 border border-[#3A3A3C]'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  Baixa
                </Button>
              </div>
              {newTaskPriority && (
                <p className="text-xs text-white/50 mt-1">
                  Clique novamente para remover a prioridade
                </p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t border-[#2E2E30]">
            <Button
              variant="ghost"
              onClick={() => {
                setCreateTaskModalOpen(false)
                setNewTaskTitle("")
                setNewTaskPriority(null)
              }}
              className="text-white/80 hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateCentralTask}
              disabled={!newTaskTitle.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white border-0 disabled:opacity-50"
            >
              Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes da Tarefa */}
      {selectedTask && (
        <KanbanTaskModal
          task={selectedTask}
          workspace={{
            id: 'central-tasks',
            name: 'Central de Tarefas',
            color: '#3B82F6',
            icon: '📋',
            description: 'Central de tarefas'
          }}
          members={members}
          isOpen={taskDetailsModalOpen}
          onClose={() => setTaskDetailsModalOpen(false)}
        />
      )}

      {/* Footer */}
      <div className="mt-12 text-center">
        <div className="inline-flex items-center gap-2 text-white/60 text-sm">
          <Users className="h-4 w-4" />
          <span>5 áreas de trabalho • {tasks.length} tarefas totais</span>
        </div>
      </div>
    </div>
  )
}