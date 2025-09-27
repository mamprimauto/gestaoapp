"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Target, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Circle, 
  Users, 
  Flag,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTaskData } from "./task-data"

// Types
interface Task {
  id: string
  title: string
  completed: boolean
  assigneeId: string
}

interface KeyResult {
  id: string
  title: string
  target: number
  current: number
  priority: "high" | "medium" | "low"
  assignees: string[]
  tasks: Task[]
}

interface OKR {
  id: string
  week: number
  title: string
  weekPeriod: string
  focus: string
  status: "completed" | "current" | "planned"
  keyResults: KeyResult[]
}

// Role-based color mapping
const getRoleColor = (member: any) => {
  const role = member.role || 'editor'
  switch (role.toLowerCase()) {
    case 'admin': return 'bg-yellow-500'
    case 'editor': return 'bg-blue-500'
    case 'copywriter': return 'bg-purple-500'
    case 'gestor_trafego': return 'bg-green-500'
    case 'minerador': return 'bg-gray-500'
    default: return 'bg-blue-500'
  }
}

// Get member initials
const getMemberInitials = (member: any) => {
  if (member.name) {
    return member.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
  }
  if (member.email) {
    return member.email[0].toUpperCase()
  }
  return 'U'
}

// Sample OKR data for multiple weeks
const initialOKRs: OKR[] = [
  // Week 32 - Past Week (Completed)
  {
    id: "week-32-2025",
    week: 32,
    title: "Escalar campanhas e validar conceitos",
    weekPeriod: "11-17 Agosto, 2025",
    focus: "Escalabilidade + Validação de conceitos",
    status: "completed",
    keyResults: [
      {
        id: "kr32-1",
        title: "Testar 35 criativos na semana",
        target: 35,
        current: 35,
        priority: "high",
        assignees: ["f3f3ebbe-b466-4afd-afef-0339ab05bc22", "4684659c-87df-4391-8481-2fd0134611a5"],
        tasks: [
          { id: "t32-1", title: "Criar 12 criativos produto A", completed: true, assigneeId: "f3f3ebbe-b466-4afd-afef-0339ab05bc22" },
          { id: "t32-2", title: "Testar 18 criativos Facebook", completed: true, assigneeId: "4684659c-87df-4391-8481-2fd0134611a5" },
          { id: "t32-3", title: "Analisar performance criativos", completed: true, assigneeId: "f3f3ebbe-b466-4afd-afef-0339ab05bc22" },
          { id: "t32-4", title: "Criar 5 variações top performers", completed: true, assigneeId: "4684659c-87df-4391-8481-2fd0134611a5" },
        ]
      },
      {
        id: "kr32-2", 
        title: "Gerar 12 leads qualificados",
        target: 12,
        current: 14,
        priority: "high",
        assignees: ["c9e6de2d-a0e9-48b9-8880-694b77bba330", "1513f72a-f259-42ca-9624-2436bae7d188"],
        tasks: [
          { id: "t32-5", title: "Otimizar landing page", completed: true, assigneeId: "c9e6de2d-a0e9-48b9-8880-694b77bba330" },
          { id: "t32-6", title: "Configurar tracking", completed: true, assigneeId: "1513f72a-f259-42ca-9624-2436bae7d188" },
          { id: "t32-7", title: "Qualificar leads", completed: true, assigneeId: "1513f72a-f259-42ca-9624-2436bae7d188" },
        ]
      },
    ]
  },
  // Week 33 - Current Week (In Progress)
  {
    id: "week-33-2025",
    week: 33,
    title: "Acelerar testes e otimizar funis",
    weekPeriod: "18-24 Agosto, 2025",
    focus: "Volume de testes + Qualidade dos leads",
    status: "current",
    keyResults: [
      {
        id: "kr33-1",
        title: "Testar 42 criativos na semana",
        target: 42,
        current: 28,
        priority: "high",
        assignees: ["f3f3ebbe-b466-4afd-afef-0339ab05bc22", "4684659c-87df-4391-8481-2fd0134611a5"],
        tasks: [
          { id: "t33-1", title: "Criar 15 criativos produto A", completed: true, assigneeId: "f3f3ebbe-b466-4afd-afef-0339ab05bc22" },
          { id: "t33-2", title: "Testar 20 criativos Facebook", completed: true, assigneeId: "4684659c-87df-4391-8481-2fd0134611a5" },
          { id: "t33-3", title: "Analisar performance criativos", completed: false, assigneeId: "f3f3ebbe-b466-4afd-afef-0339ab05bc22" },
          { id: "t33-4", title: "Criar 7 variações top performers", completed: false, assigneeId: "4684659c-87df-4391-8481-2fd0134611a5" },
          { id: "t33-5", title: "Setup testes Instagram Stories", completed: false, assigneeId: "f3f3ebbe-b466-4afd-afef-0339ab05bc22" },
        ]
      },
      {
        id: "kr33-2", 
        title: "Gerar 15 leads qualificados",
        target: 15,
        current: 9,
        priority: "high",
        assignees: ["c9e6de2d-a0e9-48b9-8880-694b77bba330", "1513f72a-f259-42ca-9624-2436bae7d188"],
        tasks: [
          { id: "t33-6", title: "Otimizar landing page principal", completed: true, assigneeId: "c9e6de2d-a0e9-48b9-8880-694b77bba330" },
          { id: "t33-7", title: "Configurar pixel de conversão", completed: true, assigneeId: "1513f72a-f259-42ca-9624-2436bae7d188" },
          { id: "t33-8", title: "A/B test headlines LP", completed: true, assigneeId: "c9e6de2d-a0e9-48b9-8880-694b77bba330" },
          { id: "t33-9", title: "Qualificar leads por telefone", completed: false, assigneeId: "1513f72a-f259-42ca-9624-2436bae7d188" },
          { id: "t33-10", title: "Setup automação email", completed: false, assigneeId: "c9e6de2d-a0e9-48b9-8880-694b77bba330" },
        ]
      },
      {
        id: "kr33-3",
        title: "Otimizar 3 funis de conversão", 
        target: 3,
        current: 1,
        priority: "medium",
        assignees: ["4684659c-87df-4391-8481-2fd0134611a5", "c9e6de2d-a0e9-48b9-8880-694b77bba330"],
        tasks: [
          { id: "t33-11", title: "Mapear jornada completa funil 1", completed: true, assigneeId: "4684659c-87df-4391-8481-2fd0134611a5" },
          { id: "t33-12", title: "Identificar pontos de vazamento", completed: false, assigneeId: "1513f72a-f259-42ca-9624-2436bae7d188" },
          { id: "t33-13", title: "Implementar melhorias funil 1", completed: false, assigneeId: "4684659c-87df-4391-8481-2fd0134611a5" },
          { id: "t33-14", title: "Analisar funil 2 e 3", completed: false, assigneeId: "1513f72a-f259-42ca-9624-2436bae7d188" },
        ]
      },
    ]
  },
  // Week 34 - Next Week (Planned)
  {
    id: "week-34-2025",
    week: 34,
    title: "Expansão e automação de processos",
    weekPeriod: "25-31 Agosto, 2025", 
    focus: "Automação + Expansão para novos canais",
    status: "planned",
    keyResults: [
      {
        id: "kr34-1",
        title: "Implementar 3 automações de marketing",
        target: 3,
        current: 0,
        priority: "high",
        assignees: ["c9e6de2d-a0e9-48b9-8880-694b77bba330", "f3f3ebbe-b466-4afd-afef-0339ab05bc22"],
        tasks: [
          { id: "t34-1", title: "Setup automação WhatsApp", completed: false, assigneeId: "c9e6de2d-a0e9-48b9-8880-694b77bba330" },
          { id: "t34-2", title: "Criar sequência email leads", completed: false, assigneeId: "4684659c-87df-4391-8481-2fd0134611a5" },
          { id: "t34-3", title: "Automação retargeting", completed: false, assigneeId: "c9e6de2d-a0e9-48b9-8880-694b77bba330" },
        ]
      },
      {
        id: "kr34-2",
        title: "Expandir para 2 novos canais",
        target: 2,
        current: 0,
        priority: "medium",
        assignees: ["f3f3ebbe-b466-4afd-afef-0339ab05bc22", "1513f72a-f259-42ca-9624-2436bae7d188"],
        tasks: [
          { id: "t34-4", title: "Pesquisar TikTok Ads", completed: false, assigneeId: "f3f3ebbe-b466-4afd-afef-0339ab05bc22" },
          { id: "t34-5", title: "Testar YouTube Ads", completed: false, assigneeId: "1513f72a-f259-42ca-9624-2436bae7d188" },
          { id: "t34-6", title: "Criar criativos para novos canais", completed: false, assigneeId: "f3f3ebbe-b466-4afd-afef-0339ab05bc22" },
        ]
      },
    ]
  }
]

export default function OKRDashboard() {
  const { members } = useTaskData()
  const [okrs, setOkrs] = useState<OKR[]>(initialOKRs)
  const [currentWeek, setCurrentWeek] = useState<number>(33) // Current week
  const [selectedTask, setSelectedTask] = useState<{krId: string, taskId: string} | null>(null)
  const [isAssigneeModalOpen, setIsAssigneeModalOpen] = useState(false)

  // Get current OKR based on selected week
  const currentOKR = useMemo(() => {
    return okrs.find(okr => okr.week === currentWeek) || okrs[1] // Default to current week
  }, [okrs, currentWeek])

  // Fallback team members if real members are not loaded yet
  const fallbackMembers = [
    { 
      id: 'f3f3ebbe-b466-4afd-afef-0339ab05bc22',
      name: 'IGOR ZIMPEL',
      email: 'igorzimpel@gmail.com',
      avatar_url: null,
      role: 'admin'
    },
    { 
      id: '4684659c-87df-4391-8481-2fd0134611a5',
      name: 'Demo TrafficPro',
      email: 'demo@trafficpro.local',
      avatar_url: null,
      role: 'editor'
    },
    { 
      id: 'c9e6de2d-a0e9-48b9-8880-694b77bba330',
      name: 'Spectrum Digital',
      email: 'spectrumdigitalbr@gmail.com',
      avatar_url: null,
      role: 'editor'
    },
    { 
      id: '1513f72a-f259-42ca-9624-2436bae7d188',
      name: 'Igor Xiles',
      email: 'igorxiles@gmail.com',
      avatar_url: null,
      role: 'editor'
    }
  ]

  // Enhanced team member data with role colors
  const enhancedMembers = useMemo(() => {
    const membersToUse = members.length > 0 ? members : fallbackMembers
    return membersToUse.map(member => ({
      ...member,
      initial: getMemberInitials(member),
      color: getRoleColor(member)
    }))
  }, [members])

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (!currentOKR) return 0
    const totalTasks = currentOKR.keyResults.reduce((sum, kr) => sum + kr.tasks.length, 0)
    const completedTasks = currentOKR.keyResults.reduce(
      (sum, kr) => sum + kr.tasks.filter(t => t.completed).length, 
      0
    )
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  }, [currentOKR])

  // Get team member by ID
  const getTeamMember = (id: string) => enhancedMembers.find(m => m.id === id)

  // Toggle task completion
  const toggleTask = (krId: string, taskId: string) => {
    setOkrs(prev => prev.map(okr => 
      okr.week === currentWeek
        ? {
            ...okr,
            keyResults: okr.keyResults.map(kr => 
              kr.id === krId 
                ? {
                    ...kr,
                    tasks: kr.tasks.map(task => 
                      task.id === taskId 
                        ? { ...task, completed: !task.completed }
                        : task
                    )
                  }
                : kr
            )
          }
        : okr
    ))
  }

  // Change task assignee
  const changeTaskAssignee = (krId: string, taskId: string, newAssigneeId: string) => {
    setOkrs(prev => prev.map(okr => 
      okr.week === currentWeek
        ? {
            ...okr,
            keyResults: okr.keyResults.map(kr => 
              kr.id === krId 
                ? {
                    ...kr,
                    tasks: kr.tasks.map(task => 
                      task.id === taskId 
                        ? { ...task, assigneeId: newAssigneeId }
                        : task
                    )
                  }
                : kr
            )
          }
        : okr
    ))
    setIsAssigneeModalOpen(false)
    setSelectedTask(null)
  }

  const openAssigneeModal = (krId: string, taskId: string) => {
    setSelectedTask({ krId, taskId })
    setIsAssigneeModalOpen(true)
  }

  // Week navigation functions
  const goToPreviousWeek = () => {
    const prevWeek = currentWeek - 1
    if (okrs.find(okr => okr.week === prevWeek)) {
      setCurrentWeek(prevWeek)
    }
  }

  const goToNextWeek = () => {
    const nextWeek = currentWeek + 1
    if (okrs.find(okr => okr.week === nextWeek)) {
      setCurrentWeek(nextWeek)
    }
  }

  const goToCurrentWeek = () => {
    setCurrentWeek(33) // Current week
  }

  // Get status badge for current week
  const getWeekStatusBadge = (status: OKR["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/15 border-green-500 text-green-500">Concluída</Badge>
      case "current":
        return <Badge className="bg-blue-500/15 border-blue-500 text-blue-500">Semana Atual</Badge>
      case "planned":
        return <Badge className="bg-orange-500/15 border-orange-500 text-orange-500">Planejada</Badge>
      default:
        return null
    }
  }

  const getPriorityColor = (priority: KeyResult["priority"]) => {
    switch (priority) {
      case "high": return "bg-red-500"
      case "medium": return "bg-yellow-500"  
      case "low": return "bg-green-500"
      default: return "bg-gray-500"
    }
  }

  const getPriorityLabel = (priority: KeyResult["priority"]) => {
    switch (priority) {
      case "high": return "Alta"
      case "medium": return "Média"
      case "low": return "Baixa"
      default: return ""
    }
  }

  // Show loading if no enhanced members yet
  if (enhancedMembers.length === 0) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFD60A] mx-auto mb-4"></div>
          <p className="text-white/70">Carregando equipe...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white p-6">
      {/* Header */}
      <div className="mb-8">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousWeek}
              disabled={!okrs.find(okr => okr.week === currentWeek - 1)}
              className="border-[#3A3A3C] hover:bg-[#3A3A3C]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Select value={currentWeek.toString()} onValueChange={(value) => setCurrentWeek(parseInt(value))}>
              <SelectTrigger className="w-[200px] bg-[#2C2C2E] border-[#3A3A3C]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {okrs.map((okr) => (
                  <SelectItem key={okr.week} value={okr.week.toString()}>
                    Semana {okr.week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNextWeek}
              disabled={!okrs.find(okr => okr.week === currentWeek + 1)}
              className="border-[#3A3A3C] hover:bg-[#3A3A3C]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {currentWeek !== 33 && (
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentWeek}
                className="border-[#3A3A3C] hover:bg-[#3A3A3C] text-[#FFD60A] border-[#FFD60A]"
              >
                <Clock className="h-4 w-4 mr-2" />
                Ir para Semana Atual
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentOKR && getWeekStatusBadge(currentOKR.status)}
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
              <Target className="h-8 w-8 text-[#FFD60A]" />
              OKR Operacional - Semana {currentWeek}
            </h1>
            <div className="flex items-center gap-4 text-white/70">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{currentOKR?.weekPeriod}</span>
              </div>
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4" />
                <span>Foco: {currentOKR?.focus}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/70 mb-1">Progresso Geral</div>
            <div className="text-4xl font-bold text-[#30D158]">{overallProgress}%</div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <Card className="bg-[#2C2C2E] border-[#3A3A3C] mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#30D158]" />
                <span className="font-medium">{currentOKR?.title}</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="border-[#30D158] text-[#30D158]">
                  Semana {currentWeek}/52
                </Badge>
                <div className="text-sm text-white/70">
                  {currentOKR?.keyResults.reduce((sum, kr) => sum + kr.tasks.filter(t => t.completed).length, 0) || 0} / {currentOKR?.keyResults.reduce((sum, kr) => sum + kr.tasks.length, 0) || 0} tarefas
                </div>
              </div>
            </div>
            <Progress value={overallProgress} className="h-3 bg-[#1A1A1A]" />
          </CardContent>
        </Card>
      </div>

      {/* Key Results Grid */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {currentOKR?.keyResults.map((kr) => {
          const completedTasks = kr.tasks.filter(t => t.completed).length
          const progress = kr.tasks.length > 0 ? Math.round((completedTasks / kr.tasks.length) * 100) : 0
          
          return (
            <Card key={kr.id} className="bg-[#2C2C2E] border-[#3A3A3C] hover:border-[#4A4A4C] transition-colors">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-white mb-2 leading-tight">
                      {kr.title}
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <Badge 
                        className={cn(
                          "text-white text-xs px-2 py-1",
                          getPriorityColor(kr.priority)
                        )}
                      >
                        {getPriorityLabel(kr.priority)}
                      </Badge>
                      <div className="text-2xl font-bold text-[#FFD60A]">
                        {kr.current}/{kr.target}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Assignees */}
                <div className="flex items-center gap-2 mt-3">
                  <Users className="h-4 w-4 text-white/60" />
                  <div className="flex -space-x-2">
                    {kr.assignees.map(assigneeId => {
                      const member = getTeamMember(assigneeId)
                      return member ? (
                        <Avatar key={assigneeId} className="h-8 w-8 border-2 border-[#2C2C2E]">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className={cn("text-white font-semibold text-sm", member.color)}>
                            {member.initial}
                          </AvatarFallback>
                        </Avatar>
                      ) : null
                    })}
                  </div>
                  <span className="text-sm text-white/60 ml-2">
                    {kr.assignees.map(id => getTeamMember(id)?.name || getTeamMember(id)?.email).join(", ")}
                  </span>
                </div>

                {/* Progress */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white/70">Progresso</span>
                    <span className="text-sm font-medium text-white">{progress}%</span>
                  </div>
                  <Progress 
                    value={progress} 
                    className="h-2 bg-[#1A1A1A]"
                  />
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Tasks */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-white/60 mb-3">
                    <BarChart3 className="h-4 w-4" />
                    <span>Tarefas ({completedTasks}/{kr.tasks.length})</span>
                  </div>
                  
                  {kr.tasks.map((task) => {
                    const assignee = getTeamMember(task.assigneeId)
                    return (
                      <div 
                        key={task.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-[#1A1A1A] hover:bg-[#252527] transition-colors group"
                      >
                        <button
                          onClick={() => toggleTask(kr.id, task.id)}
                          className="flex-shrink-0"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-[#30D158]" />
                          ) : (
                            <Circle className="h-5 w-5 text-white/40 hover:text-white/60" />
                          )}
                        </button>
                        
                        <div className={cn(
                          "flex-1 text-sm transition-colors",
                          task.completed 
                            ? "text-white/60 line-through" 
                            : "text-white/90"
                        )}>
                          {task.title}
                        </div>
                        
                        <button
                          onClick={() => openAssigneeModal(kr.id, task.id)}
                          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                          title={`Clique para trocar responsável (atual: ${assignee?.name})`}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={assignee?.avatar_url || undefined} />
                            <AvatarFallback className={cn(
                              "text-white font-semibold text-xs",
                              assignee?.color || "bg-gray-500"
                            )}>
                              {assignee?.initial || "?"}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Assignee Change Modal */}
      <Dialog open={isAssigneeModalOpen} onOpenChange={setIsAssigneeModalOpen}>
        <DialogContent className="bg-[#2C2C2E] border-[#3A3A3C] text-white">
          <DialogHeader>
            <DialogTitle>Trocar Responsável</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {enhancedMembers.map((member) => (
              <Button
                key={member.id}
                variant="outline"
                className="justify-start gap-3 h-12 bg-[#1A1A1A] border-[#3A3A3C] hover:bg-[#3A3A3C] hover:border-[#4A4A4C]"
                onClick={() => {
                  if (selectedTask) {
                    changeTaskAssignee(selectedTask.krId, selectedTask.taskId, member.id)
                  }
                }}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback className={cn("text-white font-semibold", member.color)}>
                    {member.initial}
                  </AvatarFallback>
                </Avatar>
                <span>{member.name || member.email}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}