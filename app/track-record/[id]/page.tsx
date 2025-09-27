"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ArrowLeft, Save, Play, Pause, Clock, Users, Plus, Trash2, UserCheck, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Attendee {
  name: string
  entry_time: string
  avatar_url?: string
  user_id?: string
}

interface UserProfile {
  id: string
  email: string
  name: string | null
  full_name: string | null
  approved: boolean | null
}

interface DailyData {
  id: string
  date: string
  start_time?: string
  end_time?: string
  duration_minutes?: number
  attendance: Attendee[]
  company_focus: string
  next_steps: string
  challenges: string
  individual_priorities: Record<string, string>
  ai_summary: string
  is_active: boolean
  daily_type: 'copy_gestor' | 'editores'
  timer_start_time?: string
  created_at: string
  updated_at: string
}

export default function DailyPage({ 
  params 
}: { 
  params: { id: string }
}) {
  const router = useRouter()
  const [daily, setDaily] = useState<DailyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newAttendee, setNewAttendee] = useState("")
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isAdmin, setIsAdmin] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)


  useEffect(() => {
    fetchDaily()
    checkAdminStatus()
    
    // Set up real-time subscription only for attendance updates
    const setupRealtimeSubscription = async () => {
      try {
        const supabase = await getSupabaseClient()
        
        const subscription = supabase
          .channel(`daily-attendance-${params.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'dailys',
              filter: `id=eq.${params.id}`
            },
            (payload) => {
              const newDaily = payload.new as DailyData
              
              // Only update attendance and timer-related fields
              setDaily(prev => prev ? {
                ...prev,
                attendance: newDaily.attendance,
                is_active: newDaily.is_active,
                timer_start_time: newDaily.timer_start_time,
                start_time: newDaily.start_time,
                end_time: newDaily.end_time,
                duration_minutes: newDaily.duration_minutes
              } : newDaily)
            }
          )
          .subscribe()
        
        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        return () => {}
      }
    }
    
    const unsubscribe = setupRealtimeSubscription()
    
    return () => {
      unsubscribe.then(cleanup => cleanup && cleanup())
    }
  }, [params.id])

  useEffect(() => {
    // Update current time every second for timer display
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Auto-resize all textareas when daily data loads
    if (daily) {
      const textareas = document.querySelectorAll('textarea')
      textareas.forEach(textarea => {
        textarea.style.height = 'auto'
        textarea.style.height = textarea.scrollHeight + 'px'
      })
    }
  }, [daily])

  const fetchDaily = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        toast.error("Usuário não autenticado")
        return
      }

      const response = await fetch(`/api/track-record/${params.id}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDaily(data)
      } else {
        throw new Error("Erro ao buscar daily")
      }
    } catch (error) {
      console.error("Error fetching daily:", error)
      toast.error("Erro ao carregar track record")
      router.push("/track-record")
    } finally {
      setLoading(false)
    }
  }

  const updateDaily = async (updates: Partial<DailyData>) => {
    if (!daily) return

    try {
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        toast.error("Usuário não autenticado")
        return
      }

      const response = await fetch(`/api/track-record/${params.id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const data = await response.json()
        setDaily(data.daily)
        return data.daily
      } else {
        throw new Error("Erro ao atualizar daily")
      }
    } catch (error) {
      console.error("Error updating daily:", error)
      toast.error("Erro ao atualizar track record")
    }
  }

  const startTimer = async () => {
    if (!daily) return

    // Check if daily was already started (has start_time but is not currently active)
    if (daily.start_time && !daily.is_active) {
      toast.error("Esta sessão já foi iniciada anteriormente")
      return
    }

    // Confirmation dialog
    if (!confirm("Tem certeza que deseja começar a sessão?")) {
      return
    }

    const now = new Date()
    const startTime = now.toTimeString().slice(0, 8) // HH:MM:SS format
    
    // Prepare attendance update - add current user if not already present
    let updatedAttendance = [...daily.attendance]
    
    if (currentUser && currentUserId) {
      const isAlreadyPresent = updatedAttendance.some(attendee => attendee.user_id === currentUserId)
      
      if (!isAlreadyPresent) {
        const newAttendeeObj = {
          name: currentUser.full_name || currentUser.name || currentUser.email || 'Usuário',
          entry_time: startTime,
          avatar_url: currentUser.avatar_url || undefined,
          user_id: currentUserId
        }
        updatedAttendance.push(newAttendeeObj)
      }
    }
    
    const updates = {
      is_active: true,
      timer_start_time: now.toISOString(),
      start_time: daily.start_time || startTime,
      attendance: updatedAttendance
    }

    const updatedDaily = await updateDaily(updates)
    if (updatedDaily) {
      toast.success("Sessão iniciada! Sua presença foi confirmada automaticamente.")
    }
  }

  const pauseTimer = async () => {
    if (!daily || !daily.timer_start_time) return

    // Confirmation dialog
    if (!confirm("Tem certeza que deseja finalizar a sessão?")) {
      return
    }

    const now = new Date()
    const endTime = now.toTimeString().slice(0, 8) // HH:MM:SS format

    // Calculate duration based on actual start_time, not timer_start_time
    let durationMinutes = 0
    if (daily.start_time && endTime) {
      // Parse times (HH:MM:SS)
      const parseTime = (timeStr: string) => {
        const parts = timeStr.split(':').map(Number)
        return {
          hours: parts[0] || 0,
          minutes: parts[1] || 0,
          seconds: parts[2] || 0
        }
      }

      const start = parseTime(daily.start_time)
      const end = parseTime(endTime)

      // Convert to total minutes for better precision
      const startTotalMinutes = start.hours * 60 + start.minutes + start.seconds / 60
      const endTotalMinutes = end.hours * 60 + end.minutes + end.seconds / 60

      // Calculate difference in minutes
      let diffMinutes = endTotalMinutes - startTotalMinutes

      // Handle day rollover (if end time is before start time)
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60 // Add 24 hours in minutes
      }

      durationMinutes = Math.round(diffMinutes)
    } else {
      // Fallback to timer_start_time calculation
      const startDateTime = new Date(daily.timer_start_time)
      const durationMs = now.getTime() - startDateTime.getTime()
      durationMinutes = Math.round(durationMs / (1000 * 60))
    }

    // Save all current field values before finishing
    const updates = {
      is_active: false,
      timer_start_time: null,
      end_time: endTime,
      duration_minutes: durationMinutes,
      company_focus: daily.company_focus,
      next_steps: daily.next_steps,
      challenges: daily.challenges,
      individual_priorities: daily.individual_priorities,
      ai_summary: daily.ai_summary
    }

    const updatedDaily = await updateDaily(updates)
    if (updatedDaily) {
      toast.success(`Sessão finalizada! Duração: ${durationMinutes} minutos`)
    }
  }

  const getCurrentUser = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) return
      
      setCurrentUserId(user.id)
      
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, name, full_name, avatar_url, approved")
        .eq("id", user.id)
        .single()
      
      if (profileError || !profileData) return
      
      const profile = Array.isArray(profileData) ? profileData[0] : profileData
      setCurrentUser(profile)
    } catch (error) {
      console.error('Error getting current user:', error)
    }
  }

  const checkAdminStatus = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) return
      
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, name, full_name, role, approved")
        .eq("id", user.id)
        .single()
      
      if (profileError || !profileData) return
      
      const profile = Array.isArray(profileData) ? profileData[0] : profileData
      setUserProfile(profile)
      
      const isAdminRole = (profile.role === 'admin' || profile.role === 'administrador') && profile.approved
      setIsAdmin(isAdminRole)
      
      getCurrentUser()
    } catch (error) {
      console.error('Error checking admin status:', error)
    }
  }

  const confirmPresence = async () => {
    if (!daily || !currentUser || !currentUserId) {
      toast.error("Erro ao confirmar presença. Tente recarregar a página.")
      return
    }
    
    if (saving) return
    
    setSaving(true)
    
    try {
      const isAlreadyPresent = daily.attendance.some(attendee => attendee.user_id === currentUserId)
      if (isAlreadyPresent) {
        toast.error("Você já confirmou sua presença nesta sessão")
        return
      }

      const now = new Date()
      const entryTime = now.toTimeString().slice(0, 8)
      
      const newAttendeeObj: Attendee = {
        name: currentUser.full_name || currentUser.name || currentUser.email || 'Usuário',
        entry_time: entryTime,
        avatar_url: currentUser.avatar_url || undefined,
        user_id: currentUserId
      }

      const updatedAttendance = [...daily.attendance, newAttendeeObj]
      const updates = { attendance: updatedAttendance }
      const updatedDaily = await updateDaily(updates)
      
      if (updatedDaily) {
        toast.success("Presença confirmada com sucesso!")
      }
    } catch (error) {
      console.error("Error confirming presence:", error)
      toast.error("Erro ao confirmar presença")
    } finally {
      setSaving(false)
    }
  }
  
  const addManualAttendee = async () => {
    if (!daily || !newAttendee.trim()) return

    const now = new Date()
    const entryTime = now.toTimeString().slice(0, 8) // HH:MM:SS format
    
    const newAttendeeObj: Attendee = {
      name: newAttendee.trim(),
      entry_time: entryTime
    }

    const updatedAttendance = [...daily.attendance, newAttendeeObj]
    
    const updates = { attendance: updatedAttendance }
    const updatedDaily = await updateDaily(updates)
    
    if (updatedDaily) {
      setNewAttendee("")
      toast.success(`${newAttendeeObj.name} adicionado à lista de presença`)
    }
  }

  const deleteDaily = async () => {
    if (!daily) return
    
    if (!confirm(`Tem certeza que deseja excluir o track record de ${formatDate(daily.date)}? Esta ação não pode ser desfeita.`)) {
      return
    }
    
    try {
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        toast.error("Usuário não autenticado")
        return
      }

      const response = await fetch(`/api/track-record/${params.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        toast.success("Daily excluído com sucesso")
        router.push("/track-record")
      } else {
        throw new Error("Erro ao excluir daily")
      }
    } catch (error) {
      console.error("Error deleting daily:", error)
      toast.error("Erro ao excluir daily")
    }
  }

  const removeAttendee = async (index: number) => {
    if (!daily) return

    const updatedAttendance = daily.attendance.filter((_, i) => i !== index)
    const updates = { attendance: updatedAttendance }
    
    const updatedDaily = await updateDaily(updates)
    if (updatedDaily) {
      toast.success("Participante removido da lista")
    }
  }

  const saveField = async (field: keyof DailyData, value: any) => {
    const updates = { [field]: value }
    const result = await updateDaily(updates)
    if (result) {
      // Success messages for each field
      const fieldNames = {
        company_focus: "Foco da Empresa",
        next_steps: "Próximos Passos", 
        challenges: "Desafios",
        individual_priorities: "Prioridades Individuais",
        ai_summary: "Resumo I.A"
      }
      const fieldName = fieldNames[field as keyof typeof fieldNames] || "Campo"
      toast.success(`${fieldName} salvo com sucesso!`)
    }
  }

  const saveAllFields = async () => {
    if (!daily) return
    
    const updates = {
      company_focus: daily.company_focus,
      next_steps: daily.next_steps,
      challenges: daily.challenges,
      ai_summary: daily.ai_summary,
      individual_priorities: daily.individual_priorities
    }
    
    const result = await updateDaily(updates)
    if (result) {
      toast.success("Dados salvos com sucesso!")
    }
  }

  const formatDate = (dateString: string) => {
    // Parse the date string and format in Brazilian timezone
    const date = new Date(dateString + 'T00:00:00-03:00') // Force Brazilian timezone
    return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  }

  const getCurrentDuration = () => {
    if (!daily?.timer_start_time) return 0
    
    const startTime = new Date(daily.timer_start_time)
    const diffMs = currentTime.getTime() - startTime.getTime()
    return Math.round(diffMs / (1000 * 60))
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1b23] text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-700 rounded w-64"></div>
            <div className="h-32 bg-gray-700 rounded"></div>
            <div className="h-96 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!daily) {
    return (
      <div className="min-h-screen bg-[#1a1b23] text-white p-6">
        <div className="max-w-4xl mx-auto text-center py-16">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Daily não encontrado</h1>
          <Button onClick={() => router.push("/track-record")} variant="outline">
            Voltar para Dailys
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1b23] via-[#1e1f2a] to-[#16171e] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="relative mb-12">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-green-500/10 rounded-2xl blur-xl -z-10"></div>
          
          <div className="relative bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/track-record')}
                  className="border-gray-600/50 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500 transition-all duration-300"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                    {daily.daily_type === 'editores' ? 'Weekly Editores' : 'Daily Copy & Gestor'} - {formatDate(daily.date)}
                  </h1>
                  <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-2"></div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deleteDaily}
                    className="text-red-400 hover:text-red-300 hover:bg-red-600/20 transition-all duration-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Timer Controls */}
              <div className="flex items-center gap-3">
                {daily.is_active && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl backdrop-blur-sm">
                    <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                    <span className="text-green-300 font-semibold">
                      {formatDuration(getCurrentDuration())}
                    </span>
                  </div>
                )}
                
                {!daily.is_active ? (
                  <Button
                    onClick={startTimer}
                    disabled={daily.start_time && !daily.is_active}
                    className={`transition-all duration-300 ${
                      daily.start_time && !daily.is_active 
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed" 
                        : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg shadow-green-600/30 hover:shadow-green-500/40 transform hover:scale-105"
                    }`}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {daily.start_time && !daily.is_active ? "Sessão Já Iniciada" : "Começar Sessão"}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Timer & Time Info */}
          <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 backdrop-blur-sm shadow-2xl shadow-blue-500/5 hover:shadow-blue-500/10 transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-white flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30">
                  <Clock className="h-5 w-5 text-blue-400" />
                </div>
                Informações de Tempo & Presença
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 border border-gray-600/30 rounded-xl p-4 hover:border-gray-500/50 transition-all duration-300">
                  <Label className="text-gray-300 text-sm font-medium flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                    Horário de Início
                  </Label>
                  <div className="text-xl font-semibold text-white mt-2">
                    {daily.start_time || "Não iniciada"}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 border border-gray-600/30 rounded-xl p-4 hover:border-gray-500/50 transition-all duration-300">
                  <Label className="text-gray-300 text-sm font-medium flex items-center gap-2">
                    <div className="h-2 w-2 bg-red-400 rounded-full"></div>
                    Horário de Término
                  </Label>
                  <div className="text-xl font-semibold text-white mt-2">
                    {daily.end_time || "Não finalizada"}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 border border-gray-600/30 rounded-xl p-4 hover:border-gray-500/50 transition-all duration-300">
                  <Label className="text-gray-300 text-sm font-medium flex items-center gap-2">
                    <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                    Duração Total
                  </Label>
                  <div className="text-xl font-semibold text-white mt-2">
                    {daily.is_active 
                      ? formatDuration(getCurrentDuration())
                      : daily.duration_minutes 
                        ? formatDuration(daily.duration_minutes)
                        : daily.start_time
                          ? "Finalizada"
                          : "Não iniciada"
                    }
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-600/30 pt-6">
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
                  <Label className="text-gray-300 font-medium flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-400" />
                    Confirmar Sua Presença
                  </Label>
                  <div className="mt-3">
                    <Button 
                      onClick={confirmPresence} 
                      disabled={saving || !currentUser || daily.attendance.some(a => a.user_id === currentUserId)}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white disabled:bg-gray-600 disabled:text-gray-400 shadow-lg shadow-green-600/20 hover:shadow-green-500/30 transform hover:scale-105 transition-all duration-300"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      {saving ? "Confirmando..." : daily.attendance.some(a => a.user_id === currentUserId) ? "Presença Já Confirmada" : "Confirmar Presença"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance */}
          <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 backdrop-blur-sm shadow-2xl shadow-purple-500/5 hover:shadow-purple-500/10 transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-white flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
                Lista de Presença
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {daily.attendance.map((attendee, index) => (
                  <div key={index} className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-700/30 to-gray-800/30 border border-gray-600/30 rounded-xl hover:border-gray-500/50 hover:from-gray-600/30 hover:to-gray-700/30 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="relative h-10 w-10 rounded-full overflow-hidden flex items-center justify-center">
                        {attendee.avatar_url ? (
                          <img
                            src={attendee.avatar_url}
                            alt={attendee.name}
                            className="h-10 w-10 object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-lg">
                            {attendee.name ? attendee.name.charAt(0).toUpperCase() : '?'}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-400 border-2 border-gray-800 rounded-full"></div>
                      </div>
                      <div>
                        <div className="text-white font-semibold">{attendee.name || 'Usuário'}</div>
                        <div className="text-gray-300 text-sm flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Entrou às {attendee.entry_time}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {daily.attendance.length === 0 && (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-600/20 to-gray-700/20 rounded-full flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-gray-500" />
                    </div>
                    <div className="text-gray-400 font-medium">Nenhuma presença confirmada ainda</div>
                    <div className="text-gray-500 text-sm mt-1">Os participantes aparecerão aqui quando confirmarem presença</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Host Recommendation Notice */}
          <Card className="bg-gradient-to-br from-amber-800/40 to-amber-900/40 border-amber-700/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 shrink-0">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-amber-200/90 text-sm leading-snug">
                  Recomendamos que apenas o <span className="font-medium text-amber-100">Host da daily</span> preencha as informações. 
                  O restante deve apenas <span className="font-medium text-amber-100">"Confirmar Presença"</span>.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Content Fields */}
          <div className="space-y-8">
            {/* Company Focus */}
            <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 backdrop-blur-sm shadow-2xl shadow-orange-500/5 hover:shadow-orange-500/10 transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30">
                    <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  O que estamos fazendo?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={daily.company_focus || ''}
                  onChange={(e) => {
                    setDaily(prev => prev ? {...prev, company_focus: e.target.value} : null)
                    // Auto-resize textarea
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                  }}
                  placeholder="Qual o foco principal da empresa no momento? 😊"
                  className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 border-gray-600/50 text-white resize-none overflow-hidden focus:border-orange-500/50 focus:ring-orange-500/20 transition-all duration-300"
                  style={{ minHeight: '120px' }}
                  autoComplete="off"
                  spellCheck="false"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={saveAllFields}
                    disabled={saving}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg shadow-green-600/20 hover:shadow-green-500/30 transition-all duration-300"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 backdrop-blur-sm shadow-2xl shadow-green-500/5 hover:shadow-green-500/10 transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
                    <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  O que precisamos fazer?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={daily.next_steps || ''}
                  onChange={(e) => {
                    setDaily(prev => prev ? {...prev, next_steps: e.target.value} : null)
                    // Auto-resize textarea
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                  }}
                  placeholder="Quais são os próximos passos e ações? ✅"
                  className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 border-gray-600/50 text-white resize-none overflow-hidden focus:border-green-500/50 focus:ring-green-500/20 transition-all duration-300"
                  style={{ minHeight: '120px' }}
                  autoComplete="off"
                  spellCheck="false"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={saveAllFields}
                    disabled={saving}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg shadow-green-600/20 hover:shadow-green-500/30 transition-all duration-300"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Challenges */}
            <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 backdrop-blur-sm shadow-2xl shadow-red-500/5 hover:shadow-red-500/10 transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30">
                    <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  Desafios & Gargalos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={daily.challenges || ''}
                  onChange={(e) => {
                    setDaily(prev => prev ? {...prev, challenges: e.target.value} : null)
                    // Auto-resize textarea
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                  }}
                  placeholder="Quais são os principais desafios e gargalos? ⚠️"
                  className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 border-gray-600/50 text-white resize-none overflow-hidden focus:border-red-500/50 focus:ring-red-500/20 transition-all duration-300"
                  style={{ minHeight: '120px' }}
                  autoComplete="off"
                  spellCheck="false"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={saveAllFields}
                    disabled={saving}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg shadow-green-600/20 hover:shadow-green-500/30 transition-all duration-300"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Individual Priorities */}
            <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 backdrop-blur-sm shadow-2xl shadow-indigo-500/5 hover:shadow-indigo-500/10 transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 border border-indigo-500/30">
                    <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  Próximas Prioridades Individuais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {(() => {
                  // Define different priority fields based on daily type
                  const priorityFields = daily.daily_type === 'editores' 
                    ? [
                        { key: 'danilo', label: 'Danilo', color: 'from-purple-500/20 to-purple-600/20 border-purple-500/30', focusColor: 'purple' },
                        { key: 'clelio', label: 'Clelio', color: 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/30', focusColor: 'indigo' }
                      ]
                    : [
                        { key: 'copy', label: 'Copy', color: 'from-pink-500/20 to-pink-600/20 border-pink-500/30', focusColor: 'pink' },
                        { key: 'gestor_trafego', label: 'Gestor de Tráfego', color: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30', focusColor: 'yellow' },
                        { key: 'igor', label: 'Igor', color: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30', focusColor: 'emerald' },
                        { key: 'italo', label: 'Italo', color: 'from-violet-500/20 to-violet-600/20 border-violet-500/30', focusColor: 'violet' }
                      ]

                  return priorityFields.map((person) => (
                    <div key={person.key} className="space-y-3">
                      <div className={`p-3 rounded-lg bg-gradient-to-r ${person.color} border`}>
                        <Label className="text-white font-semibold text-base">{person.label}</Label>
                      </div>
                      <Textarea
                        value={daily.individual_priorities[person.key] || ''}
                        onChange={(e) => {
                          const newPriorities = { ...daily.individual_priorities, [person.key]: e.target.value }
                          setDaily(prev => prev ? {...prev, individual_priorities: newPriorities} : null)
                          // Auto-resize textarea
                          e.target.style.height = 'auto'
                          e.target.style.height = e.target.scrollHeight + 'px'
                        }}
                        placeholder={`Próximas prioridades do ${person.label}... 🎯`}
                        className={`bg-gradient-to-br from-gray-700/50 to-gray-800/50 border-gray-600/50 text-white resize-none overflow-hidden focus:border-${person.focusColor}-500/50 focus:ring-${person.focusColor}-500/20 transition-all duration-300`}
                        style={{ minHeight: '100px' }}
                        autoComplete="off"
                        spellCheck="false"
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={saveAllFields}
                          disabled={saving}
                          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg shadow-green-600/20 hover:shadow-green-500/30 transition-all duration-300"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {saving ? "Salvando..." : "Salvar"}
                        </Button>
                      </div>
                    </div>
                  ))
                })()}
              </CardContent>
            </Card>

            {/* AI Summary */}
            <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 backdrop-blur-sm shadow-2xl shadow-cyan-500/5 hover:shadow-cyan-500/10 transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30">
                    <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  Resumo I.A
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={daily.ai_summary || ''}
                  onChange={(e) => {
                    setDaily(prev => prev ? {...prev, ai_summary: e.target.value} : null)
                    // Auto-resize textarea
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                  }}
                  placeholder="Resumo gerado por Inteligência Artificial... 🤖"
                  className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 border-gray-600/50 text-white resize-none overflow-hidden focus:border-cyan-500/50 focus:ring-cyan-500/20 transition-all duration-300"
                  style={{ minHeight: '150px' }}
                  autoComplete="off"
                  spellCheck="false"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={saveAllFields}
                    disabled={saving}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg shadow-green-600/20 hover:shadow-green-500/30 transition-all duration-300"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Finalizar Sessão Button */}
          {daily.is_active && (
            <div className="flex justify-center pt-12 pb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-red-600/20 to-red-500/20 rounded-2xl blur-xl"></div>
                <Button
                  onClick={pauseTimer}
                  size="lg"
                  className="relative bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-12 py-4 text-lg font-semibold shadow-2xl shadow-red-600/30 hover:shadow-red-500/40 transform hover:scale-105 transition-all duration-300 rounded-xl"
                >
                  <Pause className="h-6 w-6 mr-3" />
                  Finalizar Sessão
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}