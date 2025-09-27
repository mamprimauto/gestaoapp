"use client"
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogOverlay,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Image as ImageIcon, Loader2, MessageSquare, User, Users, Clock, Calendar, ChevronDown, ChevronUp, Settings, X, Edit2, Check } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useTaskData } from "./task-data"
import TaskComments from "./task-comments"
import { getProductById, getNextCreativeNumber, WorkflowType, getFormatsByWorkflow, generateCreativeNomenclature, generateLeadNomenclature, generateVslNomenclature } from "@/lib/products-db"
import { getTotalTimeForTask, formatTime, TimerSession } from "@/lib/timer-utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

type CreativeData = {
  hooks?: string[]
  bodies?: string[]
  estrategias?: string[]
  roteiro?: string[]
  checklist: { text: string; completed: boolean }[]
  // Nomenclatura estruturada
  numero_criativo?: number
  numero_lead?: number
  numero_vsl?: number
  prefixo_oferta: string
  numero_clickbait?: number
  numero_hook?: number
  numero_body?: number
  numero_edicao?: number
  iniciais_copy: string
  iniciais_editor: string
  fonte_trafego: string
  // Configurações do anúncio
  proporcao?: string
  formato: string
  texto_anuncio?: string
  headline_anuncio?: string
  avatar?: string
  idioma: string
  // Nomenclatura numérica - for criativos
  numero_avatar?: string
  // Para leads e VSLs
  duracao_estimada?: string
  status_desempenho?: string
}

type TaskRow = {
  id: string
  user_id: string
  title: string
  description: string | null
  tag: string | null
  owner: string | null
  due_date: string | null
  status: "pending" | "in-progress" | "done"
  priority: "low" | "med" | "high" | null
  assignee_id?: string | null
  parent_id?: string | null
  variation_type?: 'hook' | 'body' | 'clickbait' | null
  created_at: string
  updated_at: string
}

export default function CreativeDetailsModal({
  taskId,
  open,
  onOpenChange,
  onAfterSave,
  workflowType = "criativos",
}: {
  taskId: string | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onAfterSave?: () => void
  workflowType?: WorkflowType
}) {
  const { toast } = useToast()
  const { updateTask, members, tasks } = useTaskData()
  const [isModalLoading, setIsModalLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [task, setTask] = useState<TaskRow | null>(null)
  
  // Creative-specific fields - initialize based on workflow type
  const getInitialData = (): CreativeData => {
    const baseData: CreativeData = {
      checklist: [
        { text: "", completed: false }
      ],
      prefixo_oferta: "",
      iniciais_copy: "",
      iniciais_editor: "",
      fonte_trafego: "",
      formato: "",
      idioma: "EN-US",
      status_desempenho: "NAO USADO"
    }
    
    if (workflowType === "criativos") {
      return {
        ...baseData,
        hooks: [""],
        bodies: [""],
        numero_criativo: 1,
        numero_clickbait: 0,
        numero_hook: 1,
        numero_body: 1,
        numero_edicao: 0,
        proporcao: "9:16",
        texto_anuncio: "",
        headline_anuncio: "",
        avatar: "",
        numero_avatar: "",
      }
    } else if (workflowType === "leads") {
      return {
        ...baseData,
        estrategias: [""],
        numero_lead: 1,
        avatar: "",
      }
    } else { // vsl
      return {
        ...baseData,
        roteiro: [""],
        numero_vsl: 1,
        avatar: "",
        duracao_estimada: "",
      }
    }
  }
  
  const [creativeData, setCreativeData] = useState<CreativeData>(getInitialData())
  
  // Comments count
  const [commentsCount, setCommentsCount] = useState(0)
  // Responsible person for the creative
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  // Basic task fields
  const [title, setTitle] = useState("")
  const [due, setDue] = useState<string | null>(null)
  // Collapsible nomenclature state - starts minimized
  const [isNomenclatureExpanded, setIsNomenclatureExpanded] = useState(false)
  // Collapsible title and description state - always starts minimized
  const [isTitleDescExpanded, setIsTitleDescExpanded] = useState(false)
  
  // State to control active tab
  const [activeTab, setActiveTab] = useState<'comments' | 'details'>('comments')
  
  // State para histórico de tempo
  const [timeHistory, setTimeHistory] = useState<{ totalSeconds: number; sessions: TimerSession[] }>({ totalSeconds: 0, sessions: [] })
  const [loadingTimeHistory, setLoadingTimeHistory] = useState(false)
  
  // Estados para gerenciar formatos
  const [showFormatManager, setShowFormatManager] = useState(false)
  const [formats, setFormats] = useState(() => getFormatsByWorkflow(workflowType))
  const [newFormatName, setNewFormatName] = useState("")
  const [editingFormatIndex, setEditingFormatIndex] = useState<number | null>(null)
  const [editingFormatName, setEditingFormatName] = useState("")
  const [formatToDelete, setFormatToDelete] = useState<string | null>(null)

  // Funções para gerenciar formatos
  const handleAddFormat = () => {
    if (newFormatName.trim()) {
      const formatCode = newFormatName.trim().toUpperCase().replace(/\s+/g, '_')
      if (!formats.includes(formatCode)) {
        setFormats([...formats, formatCode])
        setNewFormatName("")
      } else {
        toast({
          title: "Formato já existe",
          description: "Este formato já está na lista.",
          variant: "destructive"
        })
      }
    }
  }
  
  const handleEditFormat = (index: number) => {
    if (editingFormatName.trim()) {
      const formatCode = editingFormatName.trim().toUpperCase().replace(/\s+/g, '_')
      if (!formats.includes(formatCode) || formats[index] === formatCode) {
        const newFormats = [...formats]
        newFormats[index] = formatCode
        setFormats(newFormats)
        setEditingFormatIndex(null)
        setEditingFormatName("")
      } else {
        toast({
          title: "Formato já existe",
          description: "Este formato já está na lista.",
          variant: "destructive"
        })
      }
    }
  }
  
  const handleDeleteFormat = (format: string) => {
    setFormats(formats.filter(f => f !== format))
    setFormatToDelete(null)
  }
  
  const formatDisplayName = (format: string) => {
    return format.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  // Generate nomenclature based on workflow type
  function generateNomenclature(data: any, copyFullName?: string, editorFullName?: string): string {
    if (!task?.owner) return "NOVO ITEM"
    
    if (workflowType === "criativos") {
      return generateCreativeNomenclature(
        task.owner,
        data.numero_criativo,
        data.numero_clickbait,
        data.numero_hook,
        data.numero_body,
        data.numero_edicao,
        data.iniciais_copy,
        data.iniciais_editor,
        data.fonte_trafego,
        copyFullName,
        editorFullName,
        data.proporcao,
        data.formato,
        data.numero_avatar,
        data.idioma
      )
    } else if (workflowType === "leads") {
      return generateLeadNomenclature(
        task.owner,
        data.numero_lead || data.numero_criativo,
        data.iniciais_copy,
        data.iniciais_editor,
        data.fonte_trafego,
        data.idioma,
        data.avatar,
        data.formato,
        copyFullName,
        editorFullName
      )
    } else if (workflowType === "vsl") {
      return generateVslNomenclature(
        task.owner,
        data.numero_vsl || data.numero_criativo,
        data.iniciais_copy,
        data.iniciais_editor,
        data.fonte_trafego,
        data.idioma,
        data.avatar,
        data.formato,
        data.duracao_estimada,
        copyFullName,
        editorFullName
      )
    }
    
    return "NOVO ITEM"
  }

  // Get user initials from name or email
  function getUserInitials(name: string | null, email: string | null): string {
    if (name && name.trim()) {
      return name.trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return "XX"
  }

  // Helper function to get full names for copy and editor
  function getFullNames() {
    let copyFullName = ''
    let editorFullName = ''

    // Buscar o membro do copy pelas iniciais
    if (creativeData.iniciais_copy) {
      const copyMember = members.find(m => 
        getUserInitials(m.name, m.email) === creativeData.iniciais_copy
      )
      if (copyMember) {
        copyFullName = copyMember.name || copyMember.email || ''
      }
    }

    // Buscar o membro do editor pelas iniciais
    if (creativeData.iniciais_editor) {
      const editorMember = members.find(m => 
        getUserInitials(m.name, m.email) === creativeData.iniciais_editor
      )
      if (editorMember) {
        editorFullName = editorMember.name || editorMember.email || ''
      }
    }

    return { copyFullName, editorFullName }
  }

  // Find copy and editor members by role with fallback
  const copywriterMember = useMemo(() => {
    // First try to find members with copy-related keywords
    let copyMember = members.find(m => 
      m.email?.toLowerCase().includes('copy') || 
      m.name?.toLowerCase().includes('copy')
    )
    // If no copy member found, use the first available member as fallback
    if (!copyMember && members.length > 0) {
      copyMember = members[0]
    }
    return copyMember
  }, [members])

  const editorMember = useMemo(() => {
    // First try to find members with editor-related keywords
    let editorMember = members.find(m => 
      m.email?.toLowerCase().includes('edit') || 
      m.name?.toLowerCase().includes('edit') ||
      m.email?.toLowerCase().includes('edicao') || 
      m.name?.toLowerCase().includes('edicao')
    )
    // If no editor member found, use the second available member or first if only one exists
    if (!editorMember && members.length > 0) {
      editorMember = members.length > 1 ? members[1] : members[0]
    }
    return editorMember
  }, [members])

  // Helper function to load creative data
  const loadCreativeData = useCallback((tr: TaskRow) => {
    const product = tr.owner ? getProductById(tr.owner) : null
    const productNomenclature = product?.nomenclature
    
    try {
      if (tr.description && tr.description !== "Descreva o criativo aqui...") {
        const parsed = JSON.parse(tr.description) as any
        
        // Base data comum a todos os tipos
        const baseData: CreativeData = {
          checklist: Array.isArray(parsed.checklist) && parsed.checklist.length > 0
            ? parsed.checklist.map((item: any, index: number) => 
                typeof item === 'object' && item.text 
                  ? item 
                  : { text: `Tarefa ${index + 1}`, completed: typeof item === 'boolean' ? item : false }
              )
            : [
                { text: "", completed: false }
              ],
          prefixo_oferta: parsed.prefixo_oferta || productNomenclature?.prefixo_oferta || "",
          iniciais_copy: parsed.iniciais_copy && parsed.iniciais_copy.trim() ? parsed.iniciais_copy : (copywriterMember ? getUserInitials(copywriterMember.name, copywriterMember.email) : ""),
          iniciais_editor: parsed.iniciais_editor && parsed.iniciais_editor.trim() ? parsed.iniciais_editor : (editorMember ? getUserInitials(editorMember.name, editorMember.email) : ""),
          fonte_trafego: parsed.fonte_trafego || productNomenclature?.fonte_trafego_padrao || "",
          formato: parsed.formato || "",
          idioma: parsed.idioma || "EN-US",
          status_desempenho: parsed.status_desempenho || "NAO USADO",
        }
        
        // Dados específicos por workflow type
        if (workflowType === "criativos") {
          setCreativeData({
            ...baseData,
            hooks: parsed.hooks?.length ? parsed.hooks : [""],
            bodies: parsed.bodies?.length ? parsed.bodies : [""],
            numero_criativo: parsed.numero_criativo || (tr.owner ? getNextCreativeNumber(tasks, tr.owner, workflowType) : 1),
            numero_clickbait: parsed.numero_clickbait || 0,
            numero_hook: parsed.numero_hook || 1,
            numero_body: parsed.numero_body || 1,
            numero_edicao: parsed.numero_edicao || 0,
            proporcao: parsed.proporcao || "9:16",
            texto_anuncio: parsed.texto_anuncio || "",
            headline_anuncio: parsed.headline_anuncio || "",
            avatar: parsed.avatar || "",
            numero_avatar: parsed.numero_avatar || "",
          })
        } else if (workflowType === "leads") {
          setCreativeData({
            ...baseData,
            estrategias: parsed.estrategias?.length ? parsed.estrategias : [""],
            numero_lead: parsed.numero_lead || (tr.owner ? getNextCreativeNumber(tasks, tr.owner, workflowType) : 1),
            avatar: parsed.avatar || "",
          })
        } else { // vsl
          setCreativeData({
            ...baseData,
            roteiro: parsed.roteiro?.length ? parsed.roteiro : [""],
            numero_vsl: parsed.numero_vsl || (tr.owner ? getNextCreativeNumber(tasks, tr.owner, workflowType) : 1),
            avatar: parsed.avatar || "",
            duracao_estimada: parsed.duracao_estimada || "",
          })
        }
      } else {
        // Novo item - usar configuração do produto baseado no workflow
        const defaultInitials = {
          copy: copywriterMember ? getUserInitials(copywriterMember.name, copywriterMember.email) : "",
          editor: editorMember ? getUserInitials(editorMember.name, editorMember.email) : ""
        }
        
        const baseData: CreativeData = {
          checklist: [
            { text: "", completed: false }
          ],
          prefixo_oferta: productNomenclature?.prefixo_oferta || "",
          iniciais_copy: defaultInitials.copy,
          iniciais_editor: defaultInitials.editor,
          fonte_trafego: productNomenclature?.fonte_trafego_padrao || "",
          formato: "",
          idioma: "EN-US",
          status_desempenho: "NAO USADO"
        }
        
        if (workflowType === "criativos") {
          setCreativeData({
            ...baseData,
            hooks: [""],
            bodies: [""],
            numero_criativo: tr.owner ? getNextCreativeNumber(tasks, tr.owner, workflowType) : 1,
            numero_clickbait: 0,
            numero_hook: 1,
            numero_body: 1,
            numero_edicao: 0,
            proporcao: "9:16",
            texto_anuncio: "",
            headline_anuncio: "",
            avatar: "",
            numero_avatar: "",
          })
        } else if (workflowType === "leads") {
          setCreativeData({
            ...baseData,
            estrategias: [""],
            numero_lead: tr.owner ? getNextCreativeNumber(tasks, tr.owner, workflowType) : 1,
                avatar: "",
          })
        } else { // vsl
          setCreativeData({
            ...baseData,
            roteiro: [""],
            numero_vsl: tr.owner ? getNextCreativeNumber(tasks, tr.owner, workflowType) : 1,
                avatar: "",
            duracao_estimada: "",
          })
        }
      }
    } catch (error) {
      // Fallback se não conseguir fazer parse do JSON
      setCreativeData(getInitialData())
    }
  }, [tasks, copywriterMember, editorMember, workflowType])

  // Load comments count
  const loadCommentsCount = useCallback(async (taskId: string) => {
    try {
      const supabase = await getSupabaseClient()
      // Try to refresh the session first
      const { data: refreshData } = await supabase.auth.refreshSession()
      const session = refreshData.session || (await supabase.auth.getSession()).data.session

      if (!session?.access_token) {
        setCommentsCount(0)
        return
      }

      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()

      if (res.ok && data.comments) {
        setCommentsCount(data.comments.length)
      } else {
        setCommentsCount(0)
      }
    } catch (error) {
      setCommentsCount(0)
    }
  }, [])

  // Load task data when modal opens
  useEffect(() => {
    let active = true
    if (!open || !taskId) return

    // Always reset Title/Desc to collapsed when modal opens
    setIsTitleDescExpanded(false)

    // Primeiro, verifica se a task já existe no contexto para acelerar loading
    const existingTask = tasks.find(t => t.id === taskId)
    if (existingTask) {
      // Se a task existe no contexto, carrega dados básicos imediatamente
      const tr = existingTask as TaskRow
      setTask(tr)
      setAssigneeId(tr.assignee_id || null)
      setTitle(tr.title === "Novo Criativo" ? "" : tr.title || "")

      if (!tr.due_date) {
        const now = new Date()
        const brazilNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
        const tomorrow = new Date(brazilNow.getFullYear(), brazilNow.getMonth(), brazilNow.getDate() + 1)
        const tomorrowISO = tomorrow.toISOString().split('T')[0]
        setDue(tomorrowISO)
      } else {
        setDue(tr.due_date)
      }

      // Carrega creative data básico sem aguardar
      loadCreativeData(tr)
      setIsModalLoading(false)

      // Carrega comentários em background
      setTimeout(() => {
        loadCommentsCount(taskId)
      }, 100)
      return
    }

    setIsModalLoading(true)
    ;(async () => {
      try {
        const supabase = await getSupabaseClient()
        // Carregar apenas task data primeiro para acelerar UI
        const { data: t, error: tErr } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle()

        if (tErr) throw new Error(tErr.message || "Falha ao buscar tarefa")
        if (!t) throw new Error("Tarefa não encontrada")
        if (!active) return

        const tr = t as TaskRow
        setTask(tr)
        setAssigneeId(tr.assignee_id || null)
        setTitle(tr.title === "Novo Criativo" ? "" : tr.title || "")

        // Se não tem due_date, definir para amanhã no fuso horário do Brasil
        if (!tr.due_date) {
          const now = new Date()
          const brazilNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
          const tomorrow = new Date(brazilNow.getFullYear(), brazilNow.getMonth(), brazilNow.getDate() + 1)
          const tomorrowISO = tomorrow.toISOString().split('T')[0]
          setDue(tomorrowISO)
        } else {
          setDue(tr.due_date)
        }

        // Usar função auxiliar para carregar creative data
        loadCreativeData(tr)

        // Carregar comentários em background
        setTimeout(() => {
          loadCommentsCount(taskId)
        }, 100)
      } catch (e: any) {
        if (active) {
          toast({
            title: "Erro ao abrir criativo",
            description: e?.message || "Falha inesperada",
            variant: "destructive",
          })
          onOpenChange(false)
        }
      } finally {
        if (active) setIsModalLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [open, taskId, loadCommentsCount])

  // Carregar histórico de tempo quando a aba for selecionada
  const loadTimeHistory = useCallback(async () => {
    if (!task || task.id.toString().startsWith('temp-')) return
    
    setLoadingTimeHistory(true)
    try {
      const result = await getTotalTimeForTask(task.id.toString())
      setTimeHistory(result)
    } catch (error) {
      console.error('Erro ao carregar histórico de tempo:', error)
    } finally {
      setLoadingTimeHistory(false)
    }
  }, [task?.id])

  // Carregar histórico quando a aba details for ativada ou quando o modal abrir
  useEffect(() => {
    if (activeTab === 'details' && task && !task.id.toString().startsWith('temp-')) {
      loadTimeHistory()
    }
  }, [activeTab, loadTimeHistory, task?.id])

  // Atualizar título automaticamente quando as iniciais ou outros campos mudam
  useEffect(() => {
    // Só atualizar se temos os dados necessários
    if (!task || !creativeData.prefixo_oferta) return

    // Gerar novo título com os dados atuais
    const newTitle = generateNomenclature(creativeData)

    // Atualizar o título se mudou
    if (newTitle !== title && creativeData.prefixo_oferta && creativeData.prefixo_oferta.trim()) {
      setTitle(newTitle)
    }
  }, [
    creativeData.iniciais_copy, 
    creativeData.iniciais_editor,
    creativeData.numero_criativo,
    creativeData.numero_lead,
    creativeData.numero_vsl,
    creativeData.numero_clickbait,
    creativeData.numero_hook,
    creativeData.numero_body,
    creativeData.numero_edicao,
    creativeData.fonte_trafego,
    creativeData.prefixo_oferta,
    creativeData.proporcao,
    creativeData.formato,
    creativeData.numero_avatar,
    creativeData.avatar,
    creativeData.idioma,
    creativeData.duracao_estimada
  ])

  // Save shortcut Cmd/Ctrl+S
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s"
      if (isSave) {
        e.preventDefault()
        void saveItem()
      }
    }

    if (open) {
      window.addEventListener("keydown", onKey)
      return () => window.removeEventListener("keydown", onKey)
    }
  }, [open])

  function addHook() {
    // Limit to maximum 1 hook only
    if (creativeData.hooks.length >= 1) return
    setCreativeData(prev => ({
      ...prev,
      hooks: [...prev.hooks, ""]
    }))
  }

  function updateHook(index: number, value: string) {
    setCreativeData(prev => ({
      ...prev,
      hooks: prev.hooks.map((hook, i) => i === index ? value : hook)
    }))
  }

  function removeHook(index: number) {
    // Don't allow removal if only 1 hook remains
    if (creativeData.hooks.length <= 1) return
    setCreativeData(prev => ({
      ...prev,
      hooks: prev.hooks.filter((_, i) => i !== index)
    }))
  }

  function addBody() {
    // Limit to maximum 1 body only
    if (creativeData.bodies.length >= 1) return
    setCreativeData(prev => ({
      ...prev,
      bodies: [...prev.bodies, ""]
    }))
  }

  function updateBody(index: number, value: string) {
    setCreativeData(prev => ({
      ...prev,
      bodies: prev.bodies.map((body, i) => i === index ? value : body)
    }))
  }

  function removeBody(index: number) {
    // Don't allow removal - always maintain exactly 1 body
    return
  }

  function addChecklistItem() {
    const newTaskNumber = creativeData.checklist.length + 1
    setCreativeData(prev => ({
      ...prev,
      checklist: [...prev.checklist, { text: "", completed: false }]
    }))
  }

  function updateChecklistItem(index: number, checked: boolean) {
    setCreativeData(prev => ({
      ...prev,
      checklist: prev.checklist.map((item, i) => i === index ? { ...item, completed: checked } : item)
    }))
  }

  function updateChecklistText(index: number, text: string) {
    setCreativeData(prev => ({
      ...prev,
      checklist: prev.checklist.map((item, i) => i === index ? { ...item, text } : item)
    }))
  }

  function removeChecklistItem(index: number) {
    if (creativeData.checklist.length <= 1) return
    setCreativeData(prev => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== index)
    }))
  }

  async function saveItem() {
    if (!task) return
    
    // Validar campos obrigatórios por workflow type
    if (workflowType === "criativos" && (!creativeData.numero_avatar || creativeData.numero_avatar.trim() === "")) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, insira o nome do avatar antes de salvar.",
        variant: "destructive",
      })
      return
    } else if ((workflowType === "leads" || workflowType === "vsl") && (!creativeData.avatar || creativeData.avatar.trim() === "")) {
      toast({
        title: "Campo obrigatório", 
        description: "Por favor, insira o nome do avatar antes de salvar.",
        variant: "destructive",
      })
      return
    }
    
    setSaving(true)
    
    try {
      // Base data comum para todos os workflows
      const cleanedData: any = {
        checklist: creativeData.checklist,
        prefixo_oferta: creativeData.prefixo_oferta,
        iniciais_copy: creativeData.iniciais_copy,
        iniciais_editor: creativeData.iniciais_editor,
        fonte_trafego: creativeData.fonte_trafego,
        formato: creativeData.formato,
        idioma: creativeData.idioma,
        status_desempenho: creativeData.status_desempenho,
      }
      
      // Dados específicos por workflow type
      if (workflowType === "criativos") {
        cleanedData.hooks = creativeData.hooks?.filter(h => h.trim()) || []
        cleanedData.bodies = creativeData.bodies?.filter(b => b.trim()) || []
        cleanedData.numero_criativo = creativeData.numero_criativo
        cleanedData.numero_clickbait = creativeData.numero_clickbait
        cleanedData.numero_hook = creativeData.numero_hook
        cleanedData.numero_body = creativeData.numero_body
        cleanedData.numero_edicao = creativeData.numero_edicao
        cleanedData.proporcao = creativeData.proporcao
        cleanedData.texto_anuncio = creativeData.texto_anuncio
        cleanedData.headline_anuncio = creativeData.headline_anuncio
        cleanedData.avatar = creativeData.avatar
        cleanedData.numero_avatar = creativeData.numero_avatar
      } else if (workflowType === "leads") {
        cleanedData.estrategias = creativeData.estrategias?.filter(e => e.trim()) || []
        cleanedData.numero_lead = creativeData.numero_lead
        cleanedData.avatar = creativeData.avatar
      } else { // vsl
        cleanedData.roteiro = creativeData.roteiro?.filter(r => r.trim()) || []
        cleanedData.numero_vsl = creativeData.numero_vsl
        cleanedData.avatar = creativeData.avatar
        cleanedData.duracao_estimada = creativeData.duracao_estimada
      }

      // Gerar o código automaticamente se todos os campos obrigatórios estão preenchidos
      // Buscar membros completos para copy e editor baseado nas iniciais
      let copyFullName = ''
      let editorFullName = ''

      // Buscar o membro do copy pelas iniciais
      if (creativeData.iniciais_copy) {
        const copyMember = members.find(m => 
          getUserInitials(m.name, m.email) === creativeData.iniciais_copy
        )
        if (copyMember) {
          copyFullName = copyMember.name || copyMember.email || ''
        }
      }

      // Buscar o ID do membro que corresponde às iniciais do editor para set como assignee
      const editorMember = members.find(m => 
        getUserInitials(m.name, m.email) === creativeData.iniciais_editor
      )
      if (editorMember) {
        editorFullName = editorMember.name || editorMember.email || ''
      }

      // Gerar código com nomes completos
      const generatedCode = generateNomenclature(cleanedData, copyFullName, editorFullName)

      // Sempre usar código gerado se temos prefixo_oferta (mesmo com iniciais vazias)
      const shouldUseGeneratedCode = creativeData.prefixo_oferta && creativeData.prefixo_oferta.trim()
      const finalTitle = shouldUseGeneratedCode ? generatedCode : (title.trim() || "Novo Criativo")

      const updatePayload = {
        title: finalTitle,
        description: JSON.stringify(cleanedData),
        due_date: due,
        assignee_id: editorMember?.id || null,
        owner: task.owner, // Preservar o owner para não perder a associação com o produto
        tag: task.tag, // Preservar a tag também
      }

      const updated = await updateTask(task.id, updatePayload as Partial<TaskRow>)

      if (updated) {
        setTask(updated as any)
      }

      toast({ title: "Criativo atualizado" })

      // Chamar callback após salvar com sucesso
      if (onAfterSave) {
        onAfterSave()
      }
      onOpenChange(false)
    } catch (e: any) {
      toast({
        title: "Erro ao salvar",
        description: e?.message || "Falha inesperada",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-[98vw] sm:max-w-5xl md:max-w-6xl lg:max-w-7xl xl:max-w-[90vw] h-[95vh] bg-[#1C1C1E] text-[#F2F2F7] border-0 rounded-lg p-0 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
          onOpenAutoFocus={(e) => e.preventDefault()}>
          {/* Header */}
          <div className="px-3 py-2 border-b border-[#2E2E30]">
            <DialogHeader>
              <DialogTitle className="text-[#F2F2F7] flex items-center gap-2 text-lg">
                <ImageIcon className="h-5 w-5 text-white/70" />
                Detalhes do Criativo
              </DialogTitle>
              <DialogDescription className="text-white/65 text-sm">
                Configure todos os elementos do seu material criativo e acompanhe os comentários.
              </DialogDescription>
            </DialogHeader>
          </div>

          {isModalLoading || !task ? (
            <div className="flex-1 grid place-items-center py-10 text-white/60">
              <Loader2 className="h-5 w-5 animate-spin mr-2 inline" />
              Carregando...
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Tab Navigation */}
              <div className="flex-shrink-0 px-2 pt-2">
                <div className="flex bg-[#2A2A2C] rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                      activeTab === 'comments'
                        ? "bg-[#3A3A3C] text-white shadow-sm"
                        : "text-white/70 hover:text-white hover:bg-[#3A3A3C]"
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Comentários
                    {commentsCount > 0 && (
                      <span className="text-xs text-white/50">({commentsCount})</span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('details')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                      activeTab === 'details'
                        ? "bg-[#3A3A3C] text-white shadow-sm"
                        : "text-white/70 hover:text-white hover:bg-[#3A3A3C]"
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    Detalhes
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {activeTab === 'comments' ? (
                  <div className="h-full flex flex-col">
                    <div className="bg-[#1E1E20] border border-[#2E2E30] rounded-lg mx-2 mt-2 flex flex-col h-full">
                      <div className="flex-1 overflow-y-auto p-3 min-h-0">
                        <TaskComments taskId={taskId} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto scrollbar-thin scrollbar-track-[#1E1E20] scrollbar-thumb-[#3A3A3C] hover:scrollbar-thumb-[#4A4A4C]">
                    <div className="px-2 py-2">
                      {/* Details Section Content */}
                      <div className="h-full flex flex-col">
                        {/* 2 Column Grid Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3 flex-shrink-0">
                          {/* Left Column */}
                          <div className="space-y-3">
                            {/* Title & Basic Info */}
                            <div className="bg-[#1E1E20] border border-[#2E2E30] rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <ImageIcon className="h-4 w-4 text-[#7C8CF8]" />
                                <label className="text-sm font-medium text-white/90">Nome do Criativo</label>
                              </div>
                              <Input
                                value={title}
                                readOnly
                                placeholder="Gerado automaticamente"
                                className="bg-[#2A2A2C] border-[#3A3A3C] text-white/70 placeholder:text-white/40 h-8 rounded-md cursor-not-allowed text-sm mb-3"
                                tabIndex={-1}
                              />
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-sm text-white/70 mb-1 block">Data de Entrega</label>
                                  <Input
                                    type="date"
                                    value={due || ""}
                                    onChange={(e) => setDue(e.target.value || null)}
                                    className="bg-[#2A2A2C] border-[#3A3A3C] text-white rounded-md text-sm h-8"
                                  />
                                </div>
                                {workflowType === "criativos" ? (
                                  <div>
                                    <label className="text-sm text-white/70 mb-1 block">Avatar</label>
                                    <Input
                                      type="text"
                                      value={creativeData.numero_avatar || ""}
                                      onChange={(e) => setCreativeData(prev => ({ ...prev, numero_avatar: e.target.value }))}
                                      className="bg-[#2A2A2C] border-[#3A3A3C] text-white rounded-md text-sm h-8"
                                      placeholder="Nome do avatar"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <label className="text-sm text-white/70 mb-1 block">Avatar</label>
                                    <Input
                                      type="text"
                                      value={creativeData.avatar || ""}
                                      onChange={(e) => setCreativeData(prev => ({ ...prev, avatar: e.target.value }))}
                                      className="bg-[#2A2A2C] border-[#3A3A3C] text-white rounded-md text-sm h-8"
                                      placeholder="Nome do avatar"
                                    />
                                  </div>
                                )}
                              </div>
                              
                              {/* Duração field only for VSL */}
                              {workflowType === "vsl" && (
                                <div className="mt-3">
                                  <div>
                                    <label className="text-sm text-white/70 mb-1 block">Duração</label>
                                    <Input
                                      type="text"
                                      value={creativeData.duracao_estimada || ""}
                                      onChange={(e) => setCreativeData(prev => ({ ...prev, duracao_estimada: e.target.value }))}
                                      className="bg-[#2A2A2C] border-[#3A3A3C] text-white rounded-md text-sm h-8"
                                      placeholder="Ex: 10min"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Responsáveis */}
                            <div className="bg-[#1E1E20] border border-[#2E2E30] rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-blue-500" />
                                <label className="text-sm font-medium text-white/90">Responsáveis</label>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-sm text-white/70 mb-1 block">Copy</label>
                                  <Select 
                                    value={creativeData.iniciais_copy} 
                                    onValueChange={(value) => setCreativeData(prev => ({ ...prev, iniciais_copy: value }))}
                                  >
                                    <SelectTrigger className="bg-[#2A2A2C] border-[#3A3A3C] text-white rounded-md h-8 text-sm">
                                      <SelectValue placeholder="Selecionar">
                                        {creativeData.iniciais_copy && (() => {
                                          const selectedMember = members.find(m => getUserInitials(m.name, m.email) === creativeData.iniciais_copy)
                                          if (selectedMember) {
                                            const firstName = selectedMember.name ? selectedMember.name.trim().split(' ')[0] : selectedMember.email?.split('@')[0] || 'Usuário'
                                            return (
                                              <div className="flex items-center gap-2">
                                                {selectedMember.avatar_url ? (
                                                  <img 
                                                    src={selectedMember.avatar_url} 
                                                    alt={firstName}
                                                    className="w-4 h-4 rounded-full object-cover"
                                                  />
                                                ) : (
                                                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                                                    {creativeData.iniciais_copy}
                                                  </div>
                                                )}
                                                <span className="text-sm">{firstName}</span>
                                              </div>
                                            )
                                          }
                                          return null
                                        })()}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="z-[9999] bg-zinc-900 border-zinc-800">
                                      {members.map((member) => {
                                        const firstName = member.name ? member.name.trim().split(' ')[0] : member.email?.split('@')[0] || 'Usuário'
                                        const initials = getUserInitials(member.name, member.email)
                                        return (
                                          <SelectItem key={member.id} value={initials}>
                                            <div className="flex items-center gap-2">
                                              {member.avatar_url ? (
                                                <img 
                                                  src={member.avatar_url} 
                                                  alt={firstName}
                                                  className="w-5 h-5 rounded-full object-cover"
                                                />
                                              ) : (
                                                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                                                  {initials}
                                                </div>
                                              )}
                                              <span className="text-sm text-white">{firstName}</span>
                                            </div>
                                          </SelectItem>
                                        )
                                      })}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-sm text-white/70 mb-1 block">Editor</label>
                                  <Select 
                                    value={creativeData.iniciais_editor} 
                                    onValueChange={(value) => setCreativeData(prev => ({ ...prev, iniciais_editor: value }))}
                                  >
                                    <SelectTrigger className="bg-[#2A2A2C] border-[#3A3A3C] text-white rounded-md h-8 text-sm">
                                      <SelectValue placeholder="Selecionar">
                                        {creativeData.iniciais_editor && (() => {
                                          const selectedMember = members.find(m => getUserInitials(m.name, m.email) === creativeData.iniciais_editor)
                                          if (selectedMember) {
                                            const firstName = selectedMember.name ? selectedMember.name.trim().split(' ')[0] : selectedMember.email?.split('@')[0] || 'Usuário'
                                            return (
                                              <div className="flex items-center gap-2">
                                                {selectedMember.avatar_url ? (
                                                  <img 
                                                    src={selectedMember.avatar_url} 
                                                    alt={firstName}
                                                    className="w-4 h-4 rounded-full object-cover"
                                                  />
                                                ) : (
                                                  <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                                                    {creativeData.iniciais_editor}
                                                  </div>
                                                )}
                                                <span className="text-sm">{firstName}</span>
                                              </div>
                                            )
                                          }
                                          return null
                                        })()}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="z-[9999] bg-zinc-900 border-zinc-800">
                                      {members.map((member) => {
                                        const firstName = member.name ? member.name.trim().split(' ')[0] : member.email?.split('@')[0] || 'Usuário'
                                        const initials = getUserInitials(member.name, member.email)
                                        return (
                                          <SelectItem key={member.id} value={initials}>
                                            <div className="flex items-center gap-2">
                                              {member.avatar_url ? (
                                                <img 
                                                  src={member.avatar_url} 
                                                  alt={firstName}
                                                  className="w-5 h-5 rounded-full object-cover"
                                                />
                                              ) : (
                                                <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                                                  {initials}
                                                </div>
                                              )}
                                              <span className="text-sm text-white">{firstName}</span>
                                            </div>
                                          </SelectItem>
                                        )
                                      })}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            {/* Nomenclatura */}
                            <div className="bg-[#1E1E20] border border-[#2E2E30] rounded-lg">
                              <div 
                                className="px-3 py-2 cursor-pointer hover:bg-[#1F1F21] transition-colors flex items-center justify-between"
                                onClick={() => setIsNomenclatureExpanded(!isNomenclatureExpanded)}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-[#007AFF] rounded-full"></div>
                                  <label className="text-sm font-medium text-white/90">Nomenclatura</label>
                                  {!isNomenclatureExpanded && creativeData.prefixo_oferta && (
                                    <span className="text-xs font-mono text-[#007AFF] bg-[#007AFF]/10 px-2 py-0.5 rounded">
                                      {generateNomenclature(creativeData, getFullNames().copyFullName, getFullNames().editorFullName)}
                                    </span>
                                  )}
                                </div>
                                {isNomenclatureExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-white/60" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-white/60" />
                                )}
                              </div>
                              {isNomenclatureExpanded && (
                                <div className="px-3 pb-3 border-t border-[#2E2E30]">
                                  <div className="grid grid-cols-3 gap-2 mt-2">
                                    <div>
                                      <label className="text-xs text-white/70 mb-1 block">Nº</label>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={creativeData.numero_criativo}
                                        onChange={(e) => setCreativeData(prev => ({ ...prev, numero_criativo: parseInt(e.target.value) || 1 }))}
                                        className="bg-[#2A2A2C] border-[#3A3A3C] text-white rounded-md text-sm h-7"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-white/70 mb-1 block">Prefixo</label>
                                      <Input
                                        value={creativeData.prefixo_oferta}
                                        onChange={(e) => setCreativeData(prev => ({ ...prev, prefixo_oferta: e.target.value.toUpperCase() }))}
                                        placeholder="ABC"
                                        className="bg-[#2A2A2C] border-[#3A3A3C] text-white placeholder:text-white/40 rounded-md text-sm h-7"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-white/70 mb-1 block">CB</label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={creativeData.numero_clickbait}
                                        onChange={(e) => setCreativeData(prev => ({ ...prev, numero_clickbait: parseInt(e.target.value) || 0 }))}
                                        className="bg-[#2A2A2C] border-[#3A3A3C] text-white rounded-md text-sm h-7"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-white/70 mb-1 block">H</label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={creativeData.numero_hook}
                                        onChange={(e) => setCreativeData(prev => ({ ...prev, numero_hook: parseInt(e.target.value) || 0 }))}
                                        className="bg-[#2A2A2C] border-[#3A3A3C] text-white rounded-md text-sm h-7"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-white/70 mb-1 block">B</label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={creativeData.numero_body}
                                        onChange={(e) => setCreativeData(prev => ({ ...prev, numero_body: parseInt(e.target.value) || 0 }))}
                                        className="bg-[#2A2A2C] border-[#3A3A3C] text-white rounded-md text-sm h-7"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-white/70 mb-1 block">R</label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={creativeData.numero_edicao}
                                        onChange={(e) => setCreativeData(prev => ({ ...prev, numero_edicao: parseInt(e.target.value) || 0 }))}
                                        className="bg-[#2A2A2C] border-[#3A3A3C] text-white rounded-md text-sm h-7"
                                      />
                                    </div>
                                  </div>
                                  {creativeData.prefixo_oferta && creativeData.iniciais_copy && creativeData.iniciais_editor && creativeData.fonte_trafego && (
                                    <div className="mt-3 p-2 bg-[#007AFF]/10 border border-[#007AFF]/20 rounded-md">
                                      <div className="text-xs text-white/70 mb-1">Código gerado:</div>
                                      <div className="font-mono text-sm text-[#007AFF] font-medium">
                                        {generateNomenclature(creativeData, getFullNames().copyFullName, getFullNames().editorFullName)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Column */}
                          <div className="space-y-3">
                            {/* Configurações */}
                            <div className="bg-[#1E1E20] border border-[#2E2E30] rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 bg-[#9F5AFF] rounded-full"></div>
                                <label className="text-sm font-medium text-white/90">Configurações</label>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                  <label className="text-xs text-white/70 mb-1 block">Proporção</label>
                                  <select 
                                    value={creativeData.proporcao} 
                                    onChange={(e) => setCreativeData(prev => ({ ...prev, proporcao: e.target.value }))}
                                    className="w-full bg-[#2A2A2C] border border-[#3A3A3C] text-white rounded-md h-7 text-sm px-2"
                                  >
                                    <option value="">Selecionar</option>
                                    <option value="9:16">9:16</option>
                                    <option value="1:1">1:1</option>
                                    <option value="4:5">4:5</option>
                                    <option value="16:9">16:9</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-white/70 mb-1 block">Formato</label>
                                  <div className="flex gap-1">
                                    <select 
                                      value={creativeData.formato} 
                                      onChange={(e) => setCreativeData(prev => ({ ...prev, formato: e.target.value }))}
                                      className="flex-1 bg-[#2A2A2C] border border-[#3A3A3C] text-white rounded-md h-7 text-sm px-2 truncate"
                                    >
                                      <option value="">Selecionar</option>
                                      {formats.map(format => (
                                        <option key={format} value={format}>
                                          {formatDisplayName(format)}
                                        </option>
                                      ))}
                                    </select>
                                    <Button
                                      type="button"
                                      onClick={() => setShowFormatManager(true)}
                                      className="h-7 w-7 p-0 bg-[#2A2A2C] border border-[#3A3A3C] hover:bg-[#3A3A3C] flex-shrink-0"
                                      title="Gerenciar"
                                    >
                                      <Settings className="h-3 w-3 text-white/70" />
                                    </Button>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs text-white/70 mb-1 block">Idioma</label>
                                  <select 
                                    value={creativeData.idioma} 
                                    onChange={(e) => setCreativeData(prev => ({ ...prev, idioma: e.target.value }))}
                                    className="w-full bg-[#2A2A2C] border border-[#3A3A3C] text-white rounded-md h-7 text-sm px-2"
                                  >
                                    <option value="">Selecionar</option>
                                    <option value="EN-US">EN-US</option>
                                    <option value="EN-UK">EN-UK</option>
                                    <option value="DE">DE</option>
                                    <option value="FR">FR</option>
                                    <option value="IT">IT</option>
                                    <option value="PT-BR">PT-BR</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-white/70 mb-1 block">Tráfego</label>
                                  <select 
                                    value={creativeData.fonte_trafego} 
                                    onChange={(e) => setCreativeData(prev => ({ ...prev, fonte_trafego: e.target.value }))}
                                    className="w-full bg-[#2A2A2C] border border-[#3A3A3C] text-white rounded-md h-7 text-sm px-2"
                                  >
                                    <option value="">Selecionar</option>
                                    <option value="FB">FB</option>
                                    <option value="TT">TT</option>
                                    <option value="YT">YT</option>
                                  </select>
                                </div>
                              </div>
                              
                              {/* Título e Descrição */}
                              <div 
                                className="border-t border-[#2E2E30] pt-3 cursor-pointer"
                                onClick={() => setIsTitleDescExpanded(!isTitleDescExpanded)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-xs text-white/70">Título/Desc. (FB)</label>
                                  {!isTitleDescExpanded && (creativeData.headline_anuncio || creativeData.texto_anuncio) && (
                                    <span className="text-xs text-white/50">✓</span>
                                  )}
                                  {isTitleDescExpanded ? (
                                    <ChevronUp className="h-3 w-3 text-white/60" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3 text-white/60" />
                                  )}
                                </div>
                                {isTitleDescExpanded && (
                                  <div className="space-y-2">
                                    <Input
                                      value={creativeData.headline_anuncio}
                                      onChange={(e) => setCreativeData(prev => ({ ...prev, headline_anuncio: e.target.value }))}
                                      placeholder="Título do anúncio"
                                      className="bg-[#2A2A2C] border-[#3A3A3C] text-white placeholder:text-white/40 rounded-md text-sm h-7"
                                    />
                                    <Textarea
                                      value={creativeData.texto_anuncio}
                                      onChange={(e) => setCreativeData(prev => ({ ...prev, texto_anuncio: e.target.value }))}
                                      placeholder="Texto do anúncio"
                                      className="bg-[#2A2A2C] border-[#3A3A3C] text-white placeholder:text-white/40 rounded-md text-sm min-h-[60px] resize-none px-3 py-2"
                                      rows={2}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Checklist */}
                            <div className="bg-[#1E1E20] border border-[#2E2E30] rounded-lg">
                              <div className="flex items-center justify-between px-3 py-2 border-b border-[#2E2E30]">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-[#FF9F0A] rounded-full"></div>
                                  <label className="text-sm font-medium text-white/90">Checklist</label>
                                  <span className="text-xs text-white/50">({creativeData.checklist.filter(item => item.completed).length}/{creativeData.checklist.length})</span>
                                </div>
                                <Button
                                  type="button"
                                  onClick={addChecklistItem}
                                  size="sm"
                                  className="h-6 w-6 p-0 rounded-md bg-[#2A2A2C] text-white/80 hover:bg-[#2A2A2C]/80 border border-[#2E2E30]"
                                  variant="ghost"
                                  title="Adicionar item"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="p-2 space-y-1">
                                {creativeData.checklist.map((item, index) => (
                                  <div key={`checklist-${index}`} className="flex items-center gap-2 group">
                                    <input
                                      type="checkbox"
                                      id={`checklist-${index}`}
                                      checked={item.completed}
                                      onChange={(e) => updateChecklistItem(index, e.target.checked)}
                                      className="h-4 w-4 rounded border-[#3A3A3C] bg-[#2A2A2C] text-[#FFD60A] focus:ring-[#FFD60A] focus:ring-1"
                                    />
                                    <Input
                                      value={item.text}
                                      onChange={(e) => updateChecklistText(index, e.target.value)}
                                      placeholder={`Checklist #${index + 1}`}
                                      className={`flex-1 bg-[#2A2A2C] border-[#3A3A3C] text-white placeholder:text-white/40 rounded-md text-sm h-7 px-3 ${
                                        item.completed 
                                          ? 'text-white/60 line-through' 
                                          : 'text-white/90'
                                      }`}
                                    />
                                    {creativeData.checklist.length > 1 && (
                                      <Button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          removeChecklistItem(index)
                                        }}
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0 opacity-0 group-hover:opacity-100"
                                        title="Remover"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Timer Section - Following kanban-task-modal pattern */}
                          <div className="bg-[#1E1E20] border border-[#2E2E30] rounded-lg p-4 mb-3">
                            <div className="flex items-center gap-2 mb-3">
                              <Clock className="h-5 w-5 text-blue-400" />
                              <h3 className="text-base font-semibold text-white/95">Tempo Gasto</h3>
                            </div>
                            
                            {loadingTimeHistory ? (
                              <div className="flex items-center justify-center py-8 text-white/60">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                Carregando histórico...
                              </div>
                            ) : timeHistory.totalSeconds > 0 ? (
                              <div className="space-y-3">
                                {/* Total Time */}
                                <div className="bg-[#2A2A2C] border border-[#3A3A3C] rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-white/70">Tempo Total</span>
                                  </div>
                                  <div className="text-2xl font-mono font-bold text-blue-400">
                                    {formatTime(timeHistory.totalSeconds)}
                                  </div>
                                </div>
                                
                                {/* Time per User Summary */}
                                {(() => {
                                  const getUserSessionsSummary = (sessions: any[]) => {
                                    const userSessions: { [userId: string]: { user: any, totalTime: number, sessions: any[] } } = {}
                                    
                                    sessions.filter(s => s.end_time).forEach(session => {
                                      if (!session.user) return
                                      
                                      const userId = session.user.id
                                      if (!userSessions[userId]) {
                                        userSessions[userId] = {
                                          user: session.user,
                                          totalTime: 0,
                                          sessions: []
                                        }
                                      }
                                      
                                      userSessions[userId].sessions.push(session)
                                      userSessions[userId].totalTime += session.duration_seconds || 0
                                    })
                                    
                                    // Converter para array e ordenar por tempo total decrescente
                                    return Object.values(userSessions).sort((a, b) => b.totalTime - a.totalTime)
                                  }
                                  
                                  const usersSummary = getUserSessionsSummary(timeHistory.sessions)
                                  return usersSummary.length > 1 ? (
                                    <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-lg p-3">
                                      <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-medium text-white/90">Tempo por Usuário</span>
                                        <span className="text-xs text-white/50">{usersSummary.length} pessoas</span>
                                      </div>
                                      <div className="space-y-2">
                                        {usersSummary.map(({ user, totalTime: userTotalTime }) => (
                                          <div key={user.id} className="flex items-center justify-between bg-[#2A2A2C] rounded-md p-2">
                                            <div className="flex items-center gap-2">
                                              <Avatar className="h-6 w-6 border border-[#3A3A3C]">
                                                <AvatarImage src={user.avatar_url || "/minimal-avatar.png"} />
                                                <AvatarFallback className="text-xs bg-[#3A3A3C] text-white/70 font-semibold">
                                                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                                </AvatarFallback>
                                              </Avatar>
                                              <span className="text-sm text-white/90 font-medium">{user.name || 'Usuário'}</span>
                                            </div>
                                            <div className="text-sm font-mono font-semibold text-blue-400">
                                              {formatTime(userTotalTime)}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null
                                })()}
                                
                                {/* Sessions History - Individual Sessions */}
                                {timeHistory.sessions.filter(s => s.end_time).length > 0 && (
                                  <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-sm font-medium text-white/90">Histórico de Sessões</span>
                                      <span className="text-xs text-white/50">{timeHistory.sessions.filter(s => s.end_time).length} sessões</span>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto space-y-2">
                                      {timeHistory.sessions
                                        .filter(s => s.end_time)
                                        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                                        .map((session, index) => {
                                          // Garantir que as datas sejam interpretadas como UTC corretamente
                                          const startTime = new Date(session.start_time.includes('Z') ? session.start_time : session.start_time + 'Z')
                                          const endTime = new Date(session.end_time.includes('Z') ? session.end_time : session.end_time + 'Z')
                                          const duration = session.duration_seconds || 0
                                          
                                          return (
                                            <div key={session.id} className="bg-[#2A2A2C] rounded-md p-2">
                                              <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                  <Avatar className="h-5 w-5 border border-[#3A3A3C]">
                                                    <AvatarImage src={session.user?.avatar_url || "/minimal-avatar.png"} />
                                                    <AvatarFallback className="text-xs bg-[#3A3A3C] text-white/70 font-semibold">
                                                      {session.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                                                    </AvatarFallback>
                                                  </Avatar>
                                                  <div className="text-xs text-white/70 font-medium">
                                                    {session.user?.name || 'Usuário'}
                                                  </div>
                                                </div>
                                                <div className="text-xs font-mono font-semibold text-blue-400">
                                                  {formatTime(duration)}
                                                </div>
                                              </div>
                                              <div className="ml-4 space-y-1">
                                                <div className="flex justify-between text-xs text-white/50">
                                                  <span>Início:</span>
                                                  <span className="font-mono">
                                                    {startTime.toLocaleDateString('pt-BR', { 
                                                      day: '2-digit', 
                                                      month: '2-digit',
                                                      year: '2-digit'
                                                    })} às {startTime.toLocaleTimeString('pt-BR', { 
                                                      hour: '2-digit', 
                                                      minute: '2-digit' 
                                                    })}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between text-xs text-white/50">
                                                  <span>Fim:</span>
                                                  <span className="font-mono">
                                                    {endTime.toLocaleDateString('pt-BR', { 
                                                      day: '2-digit', 
                                                      month: '2-digit',
                                                      year: '2-digit'
                                                    })} às {endTime.toLocaleTimeString('pt-BR', { 
                                                      hour: '2-digit', 
                                                      minute: '2-digit' 
                                                    })}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <Clock className="h-12 w-12 text-white/20 mx-auto mb-3" />
                                <p className="text-sm text-white/50">Nenhum tempo registrado ainda</p>
                                <p className="text-xs text-white/30 mt-1">Use o timer no criativo para registrar tempo</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fixed Footer */}
              <div className="shrink-0 px-3 py-2 border-t border-[#2E2E30] bg-[#1C1C1E]">
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    className="h-9 px-3 text-white/80 hover:bg-white/5 rounded-md"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={saveItem}
                    disabled={saving}
                    className="bg-blue-600 text-white hover:bg-blue-700 rounded-md h-9 px-4"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...
                      </>
                    ) : (
                      "Salvar"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Modal de Gerenciamento de Formatos */}
      <Dialog open={showFormatManager} onOpenChange={setShowFormatManager}>
        <DialogContent className="bg-[#1F1F1F] border-[#3A3A3C] text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Gerenciar Formatos</DialogTitle>
            <DialogDescription className="text-white/70">
              Adicione, edite ou exclua formatos de criativos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Adicionar novo formato */}
            <div className="flex gap-2">
              <Input
                value={newFormatName}
                onChange={(e) => setNewFormatName(e.target.value)}
                placeholder="Nome do novo formato (ex: Tutorial)"
                className="bg-[#2A2A2C] border-[#3A3A3C] text-white flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddFormat()
                  }
                }}
              />
              <Button
                onClick={handleAddFormat}
                className="bg-[#007AFF] hover:bg-[#007AFF]/90 text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            
            {/* Lista de formatos */}
            <div className="space-y-2">
              {formats.map((format, index) => (
                <div key={format} className="flex items-center gap-2 p-2 bg-[#2A2A2C] rounded-lg">
                  {editingFormatIndex === index ? (
                    <>
                      <Input
                        value={editingFormatName}
                        onChange={(e) => setEditingFormatName(e.target.value)}
                        className="bg-[#1F1F1F] border-[#3A3A3C] text-white flex-1"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleEditFormat(index)
                          } else if (e.key === 'Escape') {
                            setEditingFormatIndex(null)
                            setEditingFormatName("")
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        onClick={() => handleEditFormat(index)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingFormatIndex(null)
                          setEditingFormatName("")
                        }}
                        size="sm"
                        variant="outline"
                        className="border-[#3A3A3C] text-white hover:bg-[#3A3A3C]"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">
                        <span className="font-mono text-xs text-white/50 mr-2">{format}</span>
                        <span className="text-white">{formatDisplayName(format)}</span>
                      </span>
                      <Button
                        onClick={() => {
                          setEditingFormatIndex(index)
                          setEditingFormatName(format)
                        }}
                        size="sm"
                        variant="outline"
                        className="border-[#3A3A3C] text-white hover:bg-[#3A3A3C]"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => setFormatToDelete(format)}
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Confirmação de exclusão de formato */}
      <AlertDialog open={!!formatToDelete} onOpenChange={(open) => !open && setFormatToDelete(null)}>
        <AlertDialogContent className="bg-[#1F1F1F] border-[#3A3A3C]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Tem certeza que deseja excluir o formato <span className="font-semibold text-white">{formatToDelete && formatDisplayName(formatToDelete)}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2C2C2E] border-[#3A3A3C] text-white hover:bg-[#3A3A3C]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => formatToDelete && handleDeleteFormat(formatToDelete)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}