"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Bug, 
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Globe,
  Trash2
} from "lucide-react"

interface BugReport {
  id: string
  reported_by: string
  reporter_name: string
  reporter_email: string
  reporter_avatar?: string
  description: string
  screenshot_url?: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  browser_info?: string
  page_url?: string
  created_at: string
  updated_at: string
  resolved_at?: string
  resolver_name?: string
  notes?: string
}

export function BugReportsAdmin() {
  const { toast } = useToast()
  const [bugReports, setBugReports] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null)
  const [updating, setUpdating] = useState(false)
  const [expandedBugs, setExpandedBugs] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [bugToDelete, setBugToDelete] = useState<BugReport | null>(null)

  useEffect(() => {
    loadBugReports()
  }, [])

  const loadBugReports = async () => {
    try {
      const response = await fetch("/api/bug-reports")
      
      if (!response.ok) {
        const errorText = await response.text()

        throw new Error("Failed to load bug reports")
      }
      
      const data = await response.json()
      setBugReports(data)
    } catch (error: any) {

      toast({
        title: "Erro ao carregar relatórios",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateBugReport = async (id: string, updates: Partial<BugReport>) => {
    setUpdating(true)
    try {
      const response = await fetch("/api/bug-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      })
      
      if (!response.ok) throw new Error("Failed to update bug report")
      
      toast({
        title: "Bug atualizado",
        description: "Status do bug foi atualizado com sucesso.",
      })
      
      // Reload reports
      await loadBugReports()
      setSelectedBug(null)
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const deleteBugReport = async () => {
    if (!bugToDelete) return

    setDeletingId(bugToDelete.id)
    try {
      const response = await fetch("/api/bug-reports", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bugToDelete.id }),
      })
      
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete bug report")
      }
      
      toast({
        title: "Bug excluído",
        description: "O relatório de bug foi excluído com sucesso.",
      })
      
      // Reload reports
      await loadBugReports()
      setShowDeleteDialog(false)
      setBugToDelete(null)
    } catch (error: any) {

      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const confirmDelete = (report: BugReport) => {
    setBugToDelete(report)
    setShowDeleteDialog(true)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'closed':
        return <XCircle className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Aberto'
      case 'in_progress': return 'Em Progresso'
      case 'resolved': return 'Resolvido'
      case 'closed': return 'Fechado'
      default: return status
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-600'
      case 'high': return 'bg-orange-600'
      case 'medium': return 'bg-yellow-600'
      case 'low': return 'bg-blue-600'
      default: return 'bg-gray-600'
    }
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedBugs)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedBugs(newExpanded)
  }

  const filteredReports = bugReports.filter(report => 
    filter === 'all' || report.status === filter
  )

  const statusCounts = {
    open: bugReports.filter(r => r.status === 'open').length,
    in_progress: bugReports.filter(r => r.status === 'in_progress').length,
    resolved: bugReports.filter(r => r.status === 'resolved').length,
    closed: bugReports.filter(r => r.status === 'closed').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bug className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-bold text-white">Bugs Reportados</h2>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            className={filter === 'all' ? 'bg-blue-600 text-white' : 'text-white'}
          >
            Todos ({bugReports.length})
          </Button>
          <Button
            onClick={() => setFilter('open')}
            variant={filter === 'open' ? 'default' : 'outline'}
            size="sm"
            className={filter === 'open' ? 'bg-red-600' : ''}
          >
            Abertos ({statusCounts.open})
          </Button>
          <Button
            onClick={() => setFilter('in_progress')}
            variant={filter === 'in_progress' ? 'default' : 'outline'}
            size="sm"
            className={filter === 'in_progress' ? 'bg-yellow-600' : ''}
          >
            Em Progresso ({statusCounts.in_progress})
          </Button>
          <Button
            onClick={() => setFilter('resolved')}
            variant={filter === 'resolved' ? 'default' : 'outline'}
            size="sm"
            className={filter === 'resolved' ? 'bg-green-600' : ''}
          >
            Resolvidos ({statusCounts.resolved})
          </Button>
        </div>
      </div>

      {/* Bug Reports List */}
      <div className="space-y-3">
        {filteredReports.length === 0 ? (
          <div className="text-center py-12 bg-[#2C2C2E] rounded-lg">
            <Bug className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <p className="text-white/60">Nenhum bug reportado ainda</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg overflow-hidden"
            >
              {/* Bug Header */}
              <div
                className="p-4 cursor-pointer hover:bg-[#3A3A3C] transition-colors"
                onClick={() => toggleExpanded(report.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Reporter Avatar */}
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={report.reporter_avatar} />
                      <AvatarFallback className="bg-[#3A3A3C] text-xs">
                        {report.reporter_name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-1">
                      {/* Title and Status */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-white">
                          {report.reporter_name || report.reporter_email}
                        </span>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(report.status)}
                          <span className="text-xs text-white/60">
                            {getStatusLabel(report.status)}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            getPriorityColor(report.priority),
                            "text-white border-none"
                          )}
                        >
                          {report.priority}
                        </Badge>
                      </div>

                      {/* Description Preview */}
                      <p className="text-sm text-white/70 line-clamp-2">
                        {report.description}
                      </p>

                      {/* Meta Info */}
                      <div className="flex items-center gap-4 text-xs text-white/50">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(report.created_at), "dd MMM yyyy", { locale: ptBR })}
                        </div>
                        {report.page_url && (
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {new URL(report.page_url).pathname}
                          </div>
                        )}
                        {report.screenshot_url && (
                          <div className="flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            Screenshot
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expand/Collapse Icon */}
                  <div className="ml-4">
                    {expandedBugs.has(report.id) ? (
                      <ChevronUp className="h-5 w-5 text-white/60" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-white/60" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedBugs.has(report.id) && (
                <div className="border-t border-[#3A3A3C] p-4 space-y-4 bg-[#1F1F1F]">
                  {/* Full Description */}
                  <div>
                    <Label className="text-white/60 text-xs mb-1">Descrição Completa</Label>
                    <p className="text-sm text-white whitespace-pre-wrap">
                      {report.description}
                    </p>
                  </div>

                  {/* Screenshot */}
                  {report.screenshot_url && (
                    <div>
                      <Label className="text-white/60 text-xs mb-1">Screenshot</Label>
                      <div className="space-y-2">
                        <a
                          href={report.screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={report.screenshot_url}
                            alt="Screenshot do bug"
                            className="rounded-lg border border-[#3A3A3C] max-w-md cursor-pointer hover:opacity-80 transition-opacity"
                            loading="lazy"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement
                              // Se falhar, tentar construir a URL manualmente
                              if (!img.dataset.retried) {
                                img.dataset.retried = 'true'
                                // Extrair apenas o nome do arquivo da URL
                                const fileName = report.screenshot_url.split('/').pop()
                                if (fileName) {
                                  // Reconstruir a URL com o formato correto
                                  img.src = `https://dpajrkohmqdbskqbimqf.supabase.co/storage/v1/object/public/bug-reports/${fileName}`
                                  return
                                }
                              }
                              // Se ainda falhar, mostrar placeholder
                              img.style.display = 'none'
                              const placeholder = document.createElement('div')
                              placeholder.className = 'p-8 bg-[#2C2C2E] rounded-lg text-center'
                              placeholder.innerHTML = `
                                <svg class="w-12 h-12 mx-auto mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                                <p class="text-sm text-gray-400">Screenshot não disponível</p>
                                <p class="text-xs text-gray-500 mt-1">Clique para abrir link</p>
                              `
                              img.parentElement?.appendChild(placeholder)
                            }}
                          />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Browser Info */}
                  {report.browser_info && (
                    <div>
                      <Label className="text-white/60 text-xs mb-1">Navegador</Label>
                      <p className="text-xs text-white/50 font-mono">
                        {report.browser_info}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      onClick={() => setSelectedBug(report)}
                      variant="outline"
                      size="sm"
                      className="bg-[#2C2C2E] border-[#3A3A3C]"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Gerenciar
                    </Button>
                    
                    {report.page_url && (
                      <Button
                        onClick={() => window.open(report.page_url, '_blank')}
                        variant="outline"
                        size="sm"
                        className="bg-[#2C2C2E] border-[#3A3A3C]"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver Página
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => confirmDelete(report)}
                      variant="outline"
                      size="sm"
                      disabled={deletingId === report.id}
                      className="bg-[#2C2C2E] border-[#3A3A3C] hover:bg-red-600/20 hover:border-red-600"
                    >
                      {deletingId === report.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!selectedBug} onOpenChange={(open) => !open && setSelectedBug(null)}>
        <DialogContent className="bg-[#1F1F1F] border-[#3A3A3C] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerenciar Bug Report</DialogTitle>
          </DialogHeader>

          {selectedBug && (
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={selectedBug.status}
                  onValueChange={(value) => 
                    setSelectedBug({ ...selectedBug, status: value as any })
                  }
                >
                  <SelectTrigger className="bg-[#2C2C2E] border-[#3A3A3C]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aberto</SelectItem>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="resolved">Resolvido</SelectItem>
                    <SelectItem value="closed">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prioridade</Label>
                <Select
                  value={selectedBug.priority}
                  onValueChange={(value) => 
                    setSelectedBug({ ...selectedBug, priority: value as any })
                  }
                >
                  <SelectTrigger className="bg-[#2C2C2E] border-[#3A3A3C]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notas Internas</Label>
                <Textarea
                  value={selectedBug.notes || ''}
                  onChange={(e) => 
                    setSelectedBug({ ...selectedBug, notes: e.target.value })
                  }
                  placeholder="Adicione notas sobre o bug..."
                  className="bg-[#2C2C2E] border-[#3A3A3C] text-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedBug(null)}
                  disabled={updating}
                  className="bg-[#2C2C2E] border-[#3A3A3C]"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => updateBugReport(selectedBug.id, {
                    status: selectedBug.status,
                    priority: selectedBug.priority,
                    notes: selectedBug.notes,
                  })}
                  disabled={updating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#1F1F1F] border-[#3A3A3C]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Tem certeza que deseja excluir este relatório de bug? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-[#2C2C2E] border-[#3A3A3C] text-white hover:bg-[#3A3A3C]"
              onClick={() => setBugToDelete(null)}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={deleteBugReport}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}