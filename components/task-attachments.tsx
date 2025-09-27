"use client"
import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, FileIcon, Loader2, Paperclip, Trash2, UploadCloud, Image, Film, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"
type TaskFile = {
  id: string
  task_id: string
  file_name: string
  path: string
  size: number
  content_type: string | null
  uploaded_by: string
  created_at: string
}
const MAX = 1024 * 1024 * 1024 // 1GB

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  const gb = mb / 1024
  return `${gb.toFixed(2)} GB`
}

function isImageFile(fileName: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
  return imageExtensions.includes(ext)
}

function isVideoFile(fileName: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv']
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
  return videoExtensions.includes(ext)
}

function isPDFFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.pdf')
}

function getFileIcon(fileName: string) {
  if (isImageFile(fileName)) return Image
  if (isVideoFile(fileName)) return Film
  if (isPDFFile(fileName)) return FileText
  return FileIcon
}
function toErrorMessage(e: any): string {
  if (!e) return "Erro desconhecido"
  if (typeof e === "string") return e
  if (typeof e.message === "string") return e.message
  if (typeof e.error === "string") return e.error
  if (typeof e.error?.message === "string") return e.error.message
  try {
    return JSON.stringify(e, Object.getOwnPropertyNames(e))
  } catch {
    return "Erro inesperado"
  }
}
export default function TaskAttachments({ taskId }: { taskId: string }) {
  const { toast } = useToast()
  const [files, setFiles] = useState<TaskFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [previewFile, setPreviewFile] = useState<{url: string, name: string} | null>(null)
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement | null>(null)
  const inputId = useMemo(() => `file-input-${taskId}`, [taskId])
  async function load() {
    setLoading(true)
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from("task_files")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
      if (error) throw error
      const taskFiles = (data as TaskFile[]) || []
      setFiles(taskFiles)
      
      // Generate preview URLs for image files
      const urls: Record<string, string> = {}
      for (const file of taskFiles) {
        if (isImageFile(file.file_name)) {
          const { data: urlData } = supabase.storage
            .from("task-files")
            .getPublicUrl(file.path)
          if (urlData?.publicUrl) {
            urls[file.id] = urlData.publicUrl
          }
        }
      }
      setFileUrls(urls)
    } catch (e: any) {
      toast({ title: "Erro ao carregar anexos", description: toErrorMessage(e), variant: "destructive" })
      setFiles([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])
  async function signUpload(path: string, token: string, file: File, contentType?: string) {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase.storage
      .from("task-files")
      .uploadToSignedUrl(path, token, file, { contentType: contentType || "application/octet-stream" } as any)
    return { data, error }
  }
  async function doUpload(selected: FileList | null) {
    if (!selected || selected.length === 0) return
    setUploading(true)
    try {
      const supabase = await getSupabaseClient()
      const { data: sess } = await supabase.auth.getSession()
      const jwt = sess.session?.access_token
      if (!jwt) throw new Error("Sessão expirada. Entre novamente.")
      for (const file of Array.from(selected)) {
        if (file.size > MAX) {
          toast({ title: "Arquivo muito grande", description: `${file.name} excede 1GB`, variant: "destructive" })
          continue
        }
        // 1) Pede URL assinada de upload
        const signRes = await fetch(`/api/tasks/${taskId}/files/sign-upload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ fileName: file.name, size: file.size, contentType: file.type }),
        })
        const signData = await signRes.json().catch(() => ({}))
        if (!signRes.ok || !signData?.token || !signData?.path) {
          toast({
            title: "Falha ao preparar upload",
            description: toErrorMessage(signData),
            variant: "destructive",
          })
          continue
        }
        // 2) Faz upload direto ao Storage com path + token corretos
        const up = await signUpload(signData.path as string, signData.token as string, file, file.type)
        if (up.error) {
          toast({
            title: "Falha no upload",
            description: toErrorMessage(up.error),
            variant: "destructive",
          })
          continue
        }
        // 3) Confirma e registra metadados
        const confirmRes = await fetch(`/api/tasks/files/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            taskId,
            path: signData.path,
            fileName: signData.fileName || file.name,
            size: file.size,
            contentType: file.type || null,
          }),
        })
        const inserted = await confirmRes.json().catch(() => ({}))
        if (!confirmRes.ok) {
          toast({
            title: "Erro ao registrar metadados",
            description: toErrorMessage(inserted),
            variant: "destructive",
          })
          continue
        }
        const newFile = inserted as TaskFile
        setFiles((prev) => [newFile, ...prev])
        
        // Add preview URL for image files
        if (isImageFile(newFile.file_name)) {
          const { data: urlData } = supabase.storage
            .from("task-files")
            .getPublicUrl(newFile.path)
          if (urlData?.publicUrl) {
            setFileUrls(prev => ({...prev, [newFile.id]: urlData.publicUrl}))
          }
        }
      }
    } catch (e: any) {
      toast({ title: "Erro no upload", description: toErrorMessage(e), variant: "destructive" })
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }
  async function onDelete(id: string) {
    try {
      const supabase = await getSupabaseClient()
      const { data: sess } = await supabase.auth.getSession()
      const jwt = sess.session?.access_token
      if (!jwt) throw new Error("Sessão expirada.")
      const res = await fetch(`/api/tasks/files/${id}/delete`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof payload?.error === "string" ? payload.error : toErrorMessage(payload))
      setFiles((prev) => prev.filter((f) => f.id !== id))
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: toErrorMessage(e), variant: "destructive" })
    }
  }
  async function onDownload(id: string) {
    try {
      const supabase = await getSupabaseClient()
      const { data: sess } = await supabase.auth.getSession()
      const jwt = sess.session?.access_token
      if (!jwt) throw new Error("Sessão expirada.")
      const res = await fetch(`/api/tasks/files/${id}/download`, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok || !payload?.url)
        throw new Error(typeof payload?.error === "string" ? payload.error : toErrorMessage(payload))
      window.open(payload.url as string, "_blank", "noopener,noreferrer")
    } catch (e: any) {
      toast({ title: "Erro ao baixar", description: toErrorMessage(e), variant: "destructive" })
    }
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    void doUpload(e.dataTransfer.files)
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }
  const count = files.length
  const list = useMemo(() => files, [files])
  return (
    <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-lg transition-all duration-300 hover:border-[#3A3A3C]">
      {/* Header */}
      <div className="border-b border-[#2A2A2C] px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#FF9F0A] rounded-full"></div>
            <label className="text-[12px] font-medium text-white/90">Anexos</label>
            <span className="text-[10px] text-white/50">({count})</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id={inputId}
              ref={inputRef}
              type="file"
              multiple
              accept="*/*"
              className="hidden"
              onChange={(e) => void doUpload(e.target.files)}
            />
            <Button
              asChild
              disabled={uploading}
              className="h-7 px-2 rounded-md bg-[#2A2A2C] border border-[#3A3A3C] text-white/70 hover:bg-[#3A3A3C] text-[11px]"
              title="Selecionar arquivo(s) para enviar"
            >
              <label
                htmlFor={inputId}
                onClick={() => (inputRef.current as any)?.showPicker?.()}
                className="flex items-center cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <UploadCloud className="h-3 w-3 mr-1" />
                )}
                {uploading ? "Enviando..." : "Enviar"}
              </label>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3">
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={cn(
            "rounded-md border border-dashed p-2 text-[11px] text-white/50 transition-colors",
            dragOver ? "border-[#FF9F0A] bg-[#2A2A2C]" : "border-[#3A3A3C] bg-[#1C1C1E]",
          )}
        >
          Arraste arquivos aqui ou clique em Enviar
        </div>
        {/* Files Grid */}
        <div className="mt-3">
          {loading && (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-md border border-[#2A2A2C] bg-[#1C1C1E] animate-pulse" />
              ))}
            </div>
          )}
          
          {!loading && list.length === 0 && (
            <div className="text-center py-4 text-white/40">
              <Paperclip className="h-6 w-6 mx-auto mb-1 opacity-30" />
              <p className="text-[11px]">Nenhum anexo ainda</p>
            </div>
          )}
          
          {!loading && list.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {list.map((f) => {
                const FileIconComponent = getFileIcon(f.file_name)
                const isImage = isImageFile(f.file_name)
                const previewUrl = fileUrls[f.id]
                
                return (
                  <div
                    key={f.id}
                    className="relative group aspect-square rounded-md overflow-hidden bg-[#1F1F21] border border-[#2A2A2C] hover:border-[#3A3A3C] transition-all"
                  >
                    {/* Preview or Icon */}
                    {isImage && previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={f.file_name}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setPreviewFile({ url: previewUrl, name: f.file_name })}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2">
                        <FileIconComponent className="h-8 w-8 text-white/40 mb-1" />
                        <div className="text-[9px] text-white/50 text-center truncate w-full px-1">
                          {f.file_name}
                        </div>
                        <div className="text-[8px] text-white/30">
                          {formatSize(f.size)}
                        </div>
                      </div>
                    )}
                    
                    {/* Actions Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-7 w-7 p-0 bg-white/10 hover:bg-white/20 text-white"
                        onClick={() => onDownload(f.id)}
                        title="Baixar"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-7 w-7 p-0 bg-white/10 hover:bg-red-500/30 text-white hover:text-red-400"
                        onClick={() => onDelete(f.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Image Preview Modal */}
      {previewFile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
            >
              <X className="h-5 w-5 text-white" />
            </button>
            <img
              src={previewFile.url}
              alt={previewFile.name}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-4 right-4 text-center">
              <p className="text-white/80 text-sm bg-black/50 backdrop-blur-sm px-3 py-1 rounded-md inline-block">
                {previewFile.name}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
