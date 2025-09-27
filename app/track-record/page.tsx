"use client"

import { useState, useEffect } from "react"
import { Plus, Calendar, Clock, Users, ArrowRight, UserCheck, Edit3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CleanupDailysButton } from "@/components/cleanup-dailys-button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Daily {
  id: string
  date: string
  start_time?: string
  end_time?: string
  duration_minutes?: number
  attendance: Array<{name: string, entry_time: string}>
  company_focus?: string
  next_steps?: string
  challenges?: string
  individual_priorities: Record<string, string>
  is_active: boolean
  daily_type: 'copy_gestor' | 'editores'
  created_at: string
}

export default function DailysPage() {
  const router = useRouter()
  const [dailys, setDailys] = useState<Daily[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetchDailys()
  }, [])

  const fetchDailys = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        toast.error("Usuário não autenticado")
        return
      }

      // Get user data to check role
      const { data: userData } = await supabase.auth.getUser(token)
      if (userData?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*') // Get all fields to see what's available
          .eq('id', userData.user.id)
          .single()

        if (profileData) {
          setUserRole(profileData.role)

          // Force admin for Igor
          if (profileData.email === 'igorzimpel@gmail.com' || profileData.id === 'f3f3ebbe-b466-4afd-afef-0339ab05bc22') {
            setIsAdmin(true)
          } else {
            // Check for admin following the same pattern as the rest of the app
            const isAdminUser =
              (profileData.role === 'admin' || profileData.role === 'administrador') &&
              profileData.approved === true
            setIsAdmin(isAdminUser)
          }
        }
      }

      const response = await fetch("/api/track-record", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDailys(data.dailys || [])
      } else {
        throw new Error("Erro ao buscar dailys")
      }
    } catch (error) {
      console.error("Error fetching dailys:", error)
      toast.error("Erro ao carregar dailys")
    } finally {
      setLoading(false)
    }
  }

  const openTypeModal = () => {
    // If user is editor, directly create editores daily
    if (userRole === 'editor') {
      createNewDaily('editores')
    } else {
      setShowTypeModal(true)
    }
  }

  const createNewDaily = async (dailyType: 'copy_gestor' | 'editores') => {
    setCreating(true)
    setShowTypeModal(false)
    try {
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        toast.error("Usuário não autenticado")
        return
      }

      // Use Brazilian timezone (UTC-3)
      const now = new Date()
      const brazilTime = new Date(now.getTime() - (3 * 60 * 60 * 1000)) // UTC-3
      const today = brazilTime.toISOString().split('T')[0]
      const todayFormatted = brazilTime.toLocaleDateString('pt-BR')

      const response = await fetch("/api/track-record", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          date: today,
          company_focus: "",
          next_steps: "",
          challenges: "",
          individual_priorities: {},
          daily_type: dailyType
        })
      })

      if (response.ok) {
        const data = await response.json()
        const typeName = dailyType === 'copy_gestor' ? 'Daily Copy & Gestor' : 'Weekly Editores'
        toast.success(`${typeName} - ${todayFormatted} criado com sucesso`)
        router.push(`/track-record/${data.daily.id}`)
      } else {
        const error = await response.json()
        throw new Error(error.error || "Erro ao criar daily")
      }
    } catch (error) {
      console.error("Error creating daily:", error)
      toast.error("Erro ao criar daily")
    } finally {
      setCreating(false)
    }
  }

  const formatDate = (dateString: string) => {
    // Parse the date string and format in Brazilian timezone
    const date = new Date(dateString + 'T00:00:00-03:00') // Force Brazilian timezone
    return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return "--:--:--"
    return timeString.slice(0, 8) // Keep HH:MM:SS format
  }

  const getDuration = (daily: Daily) => {
    if (daily.duration_minutes) {
      const hours = Math.floor(daily.duration_minutes / 60)
      const minutes = daily.duration_minutes % 60
      return `${hours}h ${minutes}m`
    }
    return "Não finalizada"
  }

  const getNextCopyGestorDaily = () => {
    const now = new Date()
    // Convert to Brazil timezone
    const brazilTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
    const currentDay = brazilTime.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const currentHour = brazilTime.getHours()
    const currentMinute = brazilTime.getMinutes()
    const currentTime = currentHour * 60 + currentMinute // Convert to minutes
    const dailyTime = 14 * 60 // 14:00 in minutes

    // Monday to Friday (1-5)
    if (currentDay >= 1 && currentDay <= 5) {
      // If it's a weekday and before 14:00, daily is today
      if (currentTime < dailyTime) {
        return "Hoje às 14:00"
      }
      // If it's a weekday and after 14:00, daily is tomorrow (or next Monday if Friday)
      else {
        if (currentDay === 5) { // Friday
          return "Segunda-feira às 14:00"
        } else {
          return "Amanhã às 14:00"
        }
      }
    }
    // Saturday (6)
    else if (currentDay === 6) {
      return "Segunda-feira às 14:00"
    }
    // Sunday (0)
    else {
      return "Amanhã às 14:00" // Monday
    }
  }

  const getNextEditoresDaily = () => {
    const now = new Date()
    // Convert to Brazil timezone
    const brazilTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
    const currentDay = brazilTime.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const currentHour = brazilTime.getHours()
    const currentMinute = brazilTime.getMinutes()
    const currentTime = currentHour * 60 + currentMinute // Convert to minutes
    const dailyTime = 14 * 60 + 30 // 14:30 in minutes

    // Wednesday (3)
    if (currentDay === 3) {
      // If it's Wednesday and before 14:30, daily is today
      if (currentTime < dailyTime) {
        return "Hoje às 14:30"
      }
      // If it's Wednesday and after 14:30, daily is next Wednesday
      else {
        return "Próxima quarta-feira às 14:30"
      }
    }
    // Thursday to Tuesday (calculate days until next Wednesday)
    else {
      const daysUntilWednesday = (3 - currentDay + 7) % 7
      if (daysUntilWednesday === 0) {
        return "Próxima quarta-feira às 14:30"
      } else if (daysUntilWednesday === 1) {
        return "Amanhã às 14:30"
      } else if (daysUntilWednesday === 6) {
        return "Quarta-feira às 14:30"
      } else {
        return "Quarta-feira às 14:30"
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1b23] via-[#1e1f2a] to-[#16171e] text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-64 mb-8"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-48 bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1b23] via-[#1e1f2a] to-[#16171e] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-500" />
              Dailys
            </h1>
            <p className="text-gray-400 mt-1">
              Acompanhe suas reuniões diárias e progresso da equipe
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <CleanupDailysButton />
              </>
            )}
            <Button
              onClick={openTypeModal}
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              {creating ? "Criando..." : "Nova Sessão"}
            </Button>
          </div>
        </div>

        {/* Calendar Schedule Panel */}
        <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 backdrop-blur-sm shadow-2xl shadow-blue-500/5 mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30">
                <Calendar className="h-5 w-5 text-blue-400" />
              </div>
              Cronograma de Dailys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-gray-400">
                <span className="font-medium text-green-400">Daily Copy & Gestor:</span>
                <div className="text-white mt-1">{getNextCopyGestorDaily()}</div>
              </div>
              <div className="text-gray-400">
                <span className="font-medium text-purple-400">Weekly Editores:</span>
                <div className="text-white mt-1">{getNextEditoresDaily()}</div>
              </div>
              <div className="text-gray-400">
                <span className="font-medium">Fuso horário:</span>
                <div className="text-white mt-1">Brasília (UTC-3)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dailys Grid */}
        {dailys.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-300 mb-2">
              Nenhum registro criado
            </h3>
            <p className="text-gray-500 mb-6">
              Comece criando seu primeiro registro de hoje
            </p>
            <Button
              onClick={openTypeModal}
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              {creating ? "Criando..." : "Criar Primeiro Registro"}
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {dailys.map((daily) => (
              <Card 
                key={daily.id} 
                className="group bg-gray-800/30 border-gray-700 hover:border-blue-500/50 transition-all duration-300 cursor-pointer"
                onClick={() => router.push(`/track-record/${daily.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white text-lg">
                        {daily.daily_type === 'editores' ? 'Weekly Editores' : 'Daily Copy & Gestor'} - {formatDate(daily.date)}
                      </CardTitle>
                      <div className="mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          daily.daily_type === 'editores' 
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                            : 'bg-green-500/20 text-green-400 border border-green-500/30'
                        }`}>
                          {daily.daily_type === 'editores' ? 'Editores' : 'Copy & Gestor'}
                        </span>
                      </div>
                    </div>
                    {daily.is_active && (
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-400">Ativa</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-blue-400">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(daily.start_time)} - {formatTime(daily.end_time)}</span>
                      </div>
                      <span className="text-gray-400">{getDuration(daily)}</span>
                    </div>
                    
                    {daily.attendance.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-purple-400">
                        <Users className="h-4 w-4" />
                        <span>{daily.attendance.length} participantes</span>
                      </div>
                    )}

                    {daily.company_focus && (
                      <div className="text-sm text-gray-300 line-clamp-2">
                        <strong>Foco:</strong> {daily.company_focus}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-gray-500">
                        {new Date(daily.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      <ArrowRight className="h-4 w-4 text-gray-600 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Daily Type Selection Modal */}
        <Dialog open={showTypeModal} onOpenChange={setShowTypeModal}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">Selecionar Tipo de Daily</DialogTitle>
              <DialogDescription className="text-gray-400">
                Escolha o tipo de daily que deseja criar
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-6">
              {/* Copy & Gestor Option - Hidden for editors */}
              {userRole !== 'editor' && (
                <Button
                  onClick={() => createNewDaily('copy_gestor')}
                  disabled={creating}
                  className="w-full h-auto p-6 bg-gradient-to-r from-green-600/20 to-green-700/20 border border-green-600/30 hover:from-green-600/30 hover:to-green-700/30 hover:border-green-500/50 transition-all duration-300"
                  variant="outline"
                >
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                        <UserCheck className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-white font-semibold text-lg">Copy & Gestor</h3>
                      <p className="text-gray-300 text-sm">Track com Copy, Gestores de Tráfego, Igor e Italo</p>
                      <p className="text-green-400 text-xs mt-1">Segunda a Sexta • 14:00</p>
                    </div>
                  </div>
                </Button>
              )}

              {/* Editores Option */}
              <Button
                onClick={() => createNewDaily('editores')}
                disabled={creating}
                className="w-full h-auto p-6 bg-gradient-to-r from-purple-600/20 to-purple-700/20 border border-purple-600/30 hover:from-purple-600/30 hover:to-purple-700/30 hover:border-purple-500/50 transition-all duration-300"
                variant="outline"
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Edit3 className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-white font-semibold text-lg">Editores</h3>
                    <p className="text-gray-300 text-sm">Weekly com Danilo e Clelio</p>
                    <p className="text-purple-400 text-xs mt-1">Quarta-feira • 14:30</p>
                  </div>
                </div>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}