"use client"
import { useState, useEffect, useMemo } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { 
  FileIcon, 
  FileText, 
  FileVideo, 
  FileImage, 
  File,
  Download,
  ExternalLink 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
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
interface FilePreviewProps {
  taskId: string
  className?: string
  size?: "sm" | "md" | "lg"
  showControls?: boolean
  onClick?: () => void
}
const PREVIEW_TYPES = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
  video: ["video/mp4", "video/webm", "video/mov", "video/avi"],
  document: ["application/pdf", "text/plain"],
  text: ["text/plain", "text/markdown", "application/json"],
}
function getFileType(contentType: string | null): "image" | "video" | "document" | "text" | "other" {
  if (!contentType) return "other"
  if (PREVIEW_TYPES.image.some(type => contentType.startsWith(type))) return "image"
  if (PREVIEW_TYPES.video.some(type => contentType.startsWith(type))) return "video"
  if (PREVIEW_TYPES.document.includes(contentType)) return "document"
  if (PREVIEW_TYPES.text.includes(contentType)) return "text"
  return "other"
}
function getFileIcon(contentType: string | null, size: "sm" | "md" | "lg" = "md") {
  const iconSize = {
    sm: "h-4 w-4",
    md: "h-5 w-5", 
    lg: "h-6 w-6"
  }[size]
  const fileType = getFileType(contentType)
  const iconClass = "text-white/60"
  switch (fileType) {
    case "image":
      return <FileImage className={cn(iconClass, iconSize)} />
    case "video":
      return <FileVideo className={cn(iconClass, iconSize)} />
    case "document":
      return <FileText className={cn(iconClass, iconSize)} />
    case "text":
      return <FileText className={cn(iconClass, iconSize)} />
    default:
      return <File className={cn(iconClass, iconSize)} />
  }
}
export default function FilePreview({ 
  taskId, 
  className, 
  size = "md",
  showControls = false,
  onClick
}: FilePreviewProps) {
  const { toast } = useToast()
  const [files, setFiles] = useState<TaskFile[]>([])
  const [loading, setLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isBlobUrl, setIsBlobUrl] = useState(false)
  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-12 w-12",
    lg: "h-16 w-16"
  }
  // Pega o arquivo mais recente para preview
  const latestFile = useMemo(() => {
    if (files.length === 0) return null
    return files.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  }, [files])
  // Carrega lista de arquivos da task
  useEffect(() => {
    async function loadFiles() {
      setLoading(true)
      try {
        const supabase = await getSupabaseClient()
        const { data, error } = await supabase
          .from("task_files")
          .select("*")
          .eq("task_id", taskId)
          .order("created_at", { ascending: false })
        if (error) throw error
        setFiles((data as TaskFile[]) || [])
      } catch (error) {
        setFiles([])
      } finally {
        setLoading(false)
      }
    }
    void loadFiles()
  }, [taskId])
  // Cleanup blob URLs when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (previewUrl && isBlobUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl, isBlobUrl])
  // Carrega preview para imagens e vídeos
  useEffect(() => {
    async function loadPreview() {
      const fileType = getFileType(latestFile?.content_type)
      if (!latestFile || (fileType !== "image" && fileType !== "video")) {
        setPreviewUrl(null)
        return
      }
      try {
        const supabase = await getSupabaseClient()
        const { data: sess } = await supabase.auth.getSession()
        const jwt = sess.session?.access_token
        if (!jwt) return
        if (fileType === "video") {
          // For videos, always use blob URL approach to ensure inline playback
          const downloadRes = await fetch(`/api/tasks/files/${latestFile.id}/download`, {
            headers: { Authorization: `Bearer ${jwt}` },
          })
          const downloadPayload = await downloadRes.json()
          if (downloadRes.ok && downloadPayload?.url) {
            // Fetch the file as blob using the signed URL
            const fileRes = await fetch(downloadPayload.url)
            if (fileRes.ok) {
              const blob = await fileRes.blob()
              const blobUrl = URL.createObjectURL(blob)
              setPreviewUrl(blobUrl)
              setIsBlobUrl(true)
              return
            }
          }
        } else {
          // For images, try stream API first for inline viewing
          try {
            const res = await fetch(`/api/tasks/files/${latestFile.id}/stream`, {
              headers: { Authorization: `Bearer ${jwt}` },
            })
            const payload = await res.json()
            if (res.ok && payload?.url) {
              setPreviewUrl(payload.url as string)
              setIsBlobUrl(false)
              return
            }
          } catch (streamError) {
          }
          // Fallback to public URL for images
          const { data } = supabase.storage
            .from('task-files')
            .getPublicUrl(latestFile.path)
          if (data?.publicUrl) {
            setPreviewUrl(data.publicUrl)
            setIsBlobUrl(false)
          }
        }
      } catch (error) {
      }
    }
    void loadPreview()
  }, [latestFile])
  const handleDownload = async (fileId: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { data: sess } = await supabase.auth.getSession()
      const jwt = sess.session?.access_token
      if (!jwt) throw new Error("Sessão expirada")
      // Use download API for actual file downloads (this is correct behavior)
      const res = await fetch(`/api/tasks/files/${fileId}/download`, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const payload = await res.json()
      if (!res.ok || !payload?.url) {
        throw new Error(payload?.error || "Erro ao baixar arquivo")
      }
      window.open(payload.url as string, "_blank", "noopener,noreferrer")
    } catch (error: any) {
      toast({
        title: "Erro ao baixar",
        description: error.message,
        variant: "destructive",
      })
    }
  }
  if (loading) {
    return (
      <div className={cn(
        "rounded-lg bg-[#2C2C2E] border border-[#3A3A3C] animate-pulse",
        sizeClasses[size],
        className
      )} />
    )
  }
  if (!latestFile) {
    return (
      <div className={cn(
        "rounded-lg border-2 border-dashed border-[#3A3A3C] bg-[#1C1C1E] flex items-center justify-center",
        sizeClasses[size],
        className
      )}>
        <FileIcon className="h-5 w-5 text-white/30" />
      </div>
    )
  }
  const fileType = getFileType(latestFile.content_type)
  const isImage = fileType === "image" && previewUrl
  const isVideo = fileType === "video" && previewUrl
  return (
    <div 
      className={cn(
        "relative rounded-lg overflow-hidden border border-[#3A3A3C] bg-[#2C2C2E] group",
        onClick && "cursor-pointer hover:border-[#4A4A4A] transition-colors",
        sizeClasses[size],
        className
      )}
      onClick={onClick}
    >
      {isImage ? (
        <>
          <img
            src={previewUrl}
            alt={latestFile.file_name}
            className="w-full h-full object-cover"
            onError={() => setPreviewUrl(null)}
          />
          {/* Overlay com controles */}
          {showControls && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload(latestFile.id)
                }}
              >
                <Download className="h-3 w-3" />
              </Button>
              {onClick && (
                <Button
                  size="sm"
                  variant="ghost" 
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClick()
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </>
      ) : isVideo ? (
        <>
          <div className="relative w-full h-full group">
            <video
              src={previewUrl}
              className="w-full h-full object-cover"
              controls
              autoPlay
              muted
              controlsList="nofullscreen"
              playsInline
              preload="metadata"
              style={{ pointerEvents: 'auto' }}
              onContextMenu={(e) => e.preventDefault()}
              onError={(e) => {
                setPreviewUrl(null)
              }}
              onLoadStart={() => {}}
              onCanPlay={() => {}}
            />
            {/* Download overlay button for videos */}
            {showControls && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    // Create download link using blob URL
                    const link = document.createElement('a')
                    link.href = previewUrl
                    link.download = latestFile.file_name
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }}
                  className="bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                  title="Baixar vídeo"
                >
                  <Download className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          {/* Overlay com controles - mantido para outros casos */}
          {showControls && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              {onClick && (
                <Button
                  size="sm"
                  variant="ghost" 
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClick()
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-2">
          {getFileIcon(latestFile.content_type, size)}
          {size !== "sm" && (
            <div className="text-[10px] text-white/60 mt-1 text-center truncate w-full px-1">
              {latestFile.file_name.length > 12 
                ? `${latestFile.file_name.substring(0, 12)}...`
                : latestFile.file_name}
            </div>
          )}
          {showControls && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload(latestFile.id)
                }}
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}
      {/* Badge de contagem se há múltiplos arquivos */}
      {files.length > 1 && (
        <div className="absolute -top-1 -right-1 h-4 w-4 bg-[#FFD60A] text-black text-[10px] rounded-full flex items-center justify-center font-medium">
          {files.length}
        </div>
      )}
      {/* Indicador de arquivo novo (menos de 24h) */}
      {new Date(latestFile.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000 && (
        <div className="absolute top-1 left-1">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  )
}
// Hook para carregar arquivos de uma task (útil para outros componentes)
export function useTaskFiles(taskId: string) {
  const [files, setFiles] = useState<TaskFile[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    async function loadFiles() {
      setLoading(true)
      try {
        const supabase = await getSupabaseClient()
        const { data, error } = await supabase
          .from("task_files")
          .select("*")
          .eq("task_id", taskId)
          .order("created_at", { ascending: false })
        if (error) throw error
        setFiles((data as TaskFile[]) || [])
      } catch (error) {
        setFiles([])
      } finally {
        setLoading(false)
      }
    }
    void loadFiles()
  }, [taskId])
  const refetch = () => {
    setLoading(true)
    // Re-executa o efeito
    setFiles([])
  }
  return { files, loading, refetch }
}