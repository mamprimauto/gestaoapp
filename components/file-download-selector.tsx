"use client"
import { useState, useEffect, useRef } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useUploadQueue } from "./upload-queue-context"
import { cn } from "@/lib/utils"
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
import { 
  Download,
  File,
  FileImage,
  FileVideo,
  FileText,
  Loader2,
  Trash2,
  Eye,
  X,
  Upload,
  FolderOpen
} from "lucide-react"
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
interface FileDownloadSelectorProps {
  taskId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  fileCategory?: string
  onFileDeleted?: () => void // Callback para recarregar contadores após exclusão
  onFileUploaded?: () => void // Callback para recarregar contadores após upload
  showUploadButton?: boolean // Mostrar botão de upload no modal
}
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
function getFileIcon(contentType: string | null) {
  if (!contentType) return <File className="h-4 w-4 text-white/60" />
  if (contentType.startsWith('image/')) {
    return <FileImage className="h-4 w-4 text-blue-400" />
  }
  if (contentType.startsWith('video/')) {
    return <FileVideo className="h-4 w-4 text-purple-400" />
  }
  if (contentType.includes('pdf') || contentType.includes('document')) {
    return <FileText className="h-4 w-4 text-red-400" />
  }
  return <File className="h-4 w-4 text-white/60" />
}
export default function FileDownloadSelector({ 
  taskId, 
  open, 
  onOpenChange,
  fileCategory,
  onFileDeleted,
  onFileUploaded,
  showUploadButton = false
}: FileDownloadSelectorProps) {
  const { toast } = useToast()
  const { addUpload } = useUploadQueue()
  const [files, setFiles] = useState<TaskFile[]>([])
  const [loading, setLoading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<{ url: string; type: string; name: string; isBlob?: boolean } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<TaskFile | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Função auxiliar para recarregar a lista de arquivos
  const loadFiles = async () => {
    setLoading(true)
    try {
      const supabase = await getSupabaseClient()
      let query = supabase
        .from("task_files")
        .select("*")
        .eq("task_id", taskId)
      if (fileCategory) {
        query = query.eq("file_category", fileCategory)
      }
      const { data, error } = await query.order("created_at", { ascending: false })
      if (error) throw error
      setFiles((data as TaskFile[]) || [])
    } catch (error) {
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  // Carrega arquivos quando o dialog abre
  useEffect(() => {
    if (!open) return
    loadFiles()
  }, [taskId, open, fileCategory])
  
  // Handle upload de múltiplos arquivos
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    
    try {
      // Adiciona todos os arquivos à fila
      for (const file of fileArray) {
        // Validação básica de tamanho (2GB max)
        if (file.size > 2 * 1024 * 1024 * 1024) {
          toast({
            title: "Arquivo muito grande",
            description: `${file.name} excede 2GB`,
            variant: "destructive",
          })
          continue
        }
        
        addUpload(file, taskId, fileCategory || "entregavel")
      }
      
      toast({
        title: fileArray.length === 1 ? "Upload iniciado" : "Uploads iniciados",
        description: `${fileArray.length} arquivo(s) na fila`,
      })
      
      // Recarregar arquivos após 2 segundos
      setTimeout(() => {
        loadFiles()
        onFileUploaded?.()
      }, 2000)
      
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Falha ao adicionar arquivos",
        variant: "destructive",
      })
    }
  }
  // Close preview on ESC key and cleanup blob URLs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewFile) {
        if (previewFile.isBlob) {
          URL.revokeObjectURL(previewFile.url)
        }
        setPreviewFile(null)
      }
    }
    if (previewFile) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [previewFile])
  // Cleanup blob URLs when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (previewFile?.isBlob) {
        URL.revokeObjectURL(previewFile.url)
      }
    }
  }, [previewFile])
  // Check if file is an image
  const isImageFile = (contentType: string | null): boolean => {
    return contentType?.startsWith('image/') || false
  }
  // Check if file is a video
  const isVideoFile = (contentType: string | null): boolean => {
    return contentType?.startsWith('video/') || false
  }
  // Check if file can be previewed (image or video)
  const isPreviewableFile = (contentType: string | null): boolean => {
    return isImageFile(contentType) || isVideoFile(contentType)
  }
  // Handle file preview (image or video)
  const handlePreview = async (file: TaskFile) => {
    if (!isPreviewableFile(file.content_type)) return
    setPreviewLoading(true)
    try {
      if (isVideoFile(file.content_type)) {
        // For videos, always use blob URL approach to ensure inline playback
        const supabase = await getSupabaseClient()
        const { data: sess } = await supabase.auth.getSession()
        const jwt = sess.session?.access_token
        if (!jwt) throw new Error("Sessão expirada")
        // Get download URL first
        const downloadRes = await fetch(`/api/tasks/files/${file.id}/download`, {
          headers: { Authorization: `Bearer ${jwt}` },
        })
        const downloadPayload = await downloadRes.json()
        if (!downloadRes.ok || !downloadPayload?.url) {
          throw new Error(downloadPayload?.error || "Erro ao obter arquivo para preview")
        }
        // Fetch the file as blob using the signed URL
        const fileRes = await fetch(downloadPayload.url)
        if (!fileRes.ok) {
          throw new Error("Erro ao baixar arquivo para preview")
        }
        const blob = await fileRes.blob()
        const blobUrl = URL.createObjectURL(blob)
        setPreviewFile({
          url: blobUrl,
          type: file.content_type || '',
          name: file.file_name,
          isBlob: true // Flag to identify blob URLs for cleanup
        })
      } else {
        // For images, use regular public URL
        const supabase = await getSupabaseClient()
        const { data } = supabase.storage
          .from('task-files')
          .getPublicUrl(file.path)
        if (data?.publicUrl) {
          setPreviewFile({
            url: data.publicUrl,
            type: file.content_type || '',
            name: file.file_name
          })
        } else {
          throw new Error("Não foi possível obter a URL do arquivo")
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar arquivo",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setPreviewLoading(false)
    }
  }
  const handleDownload = async (file: TaskFile) => {
    setDownloadingId(file.id)
    try {
      const supabase = await getSupabaseClient()
      const { data: sess } = await supabase.auth.getSession()
      const jwt = sess.session?.access_token
      if (!jwt) throw new Error("Sessão expirada")
      const res = await fetch(`/api/tasks/files/${file.id}/download`, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const payload = await res.json()
      if (!res.ok || !payload?.url) {
        throw new Error(payload?.error || "Erro ao baixar arquivo")
      }
      // Download via fetch para controlar o nome do arquivo
      const response = await fetch(payload.url as string)
      if (!response.ok) throw new Error('Falha no download')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = file.file_name // Agora podemos forçar o nome correto
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Limpar o blob URL
      window.URL.revokeObjectURL(url)
      toast({
        title: "Download iniciado",
        description: `${file.file_name} está sendo baixado.`,
      })
    } catch (error: any) {
      toast({
        title: "Erro ao baixar",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setDownloadingId(null)
    }
  }
  const handleDelete = (file: TaskFile) => {
    // Não usar async aqui para evitar problemas com propagação
    setFileToDelete(file)
    
    // NÃO fechar o modal principal, deixar aberto enquanto confirma
    // onOpenChange(false) - REMOVIDO
    
    // Dispatch custom event to signal delete is in progress
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('file-delete-start'))
    }
  }
  
  const confirmDelete = async () => {
    if (!fileToDelete) return
    
    setDeletingId(fileToDelete.id)
    try {
      const supabase = await getSupabaseClient()
      const { data: sess } = await supabase.auth.getSession()
      const jwt = sess.session?.access_token
      if (!jwt) throw new Error("Sessão expirada")
      const res = await fetch(`/api/tasks/files/${fileToDelete.id}/delete`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload?.error || "Erro ao excluir arquivo")
      }
      // Remove o arquivo da lista local
      setFiles(prev => prev.filter(f => f.id !== fileToDelete.id))
      // Chama callback para recarregar contadores
      onFileDeleted?.()
      toast({
        title: "Arquivo excluído",
        description: `${fileToDelete.file_name} foi excluído com sucesso.`,
      })
      // Reset states
      setFileToDelete(null)
      
      // Dispatch custom event to signal delete is done
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('file-delete-end'))
      }
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
      setFileToDelete(null)
      
      // Dispatch custom event to signal delete is done
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('file-delete-end'))
      }
    }
  }
  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="bg-[#1F1F1F] border-[#3A3A3C] text-white max-w-md"
        onInteractOutside={(e) => {
          // Previne fechamento se o AlertDialog estiver aberto
          if (fileToDelete) {
            e.preventDefault()
          }
        }}
        onPointerDownOutside={(e) => {
          // Previne fechamento se o AlertDialog estiver aberto
          if (fileToDelete) {
            e.preventDefault()
          }
        }}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-white flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-blue-500" />
                Arquivos do Criativo
              </DialogTitle>
              <DialogDescription className="text-white/70">
                {files.length > 0 ? `${files.length} arquivo(s) disponível(is)` : "Nenhum arquivo enviado ainda"}
              </DialogDescription>
            </div>
            {showUploadButton && (
              <Button
                onClick={() => inputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Enviar Arquivos
              </Button>
            )}
          </div>
        </DialogHeader>
        
        {/* Input oculto para upload */}
        {showUploadButton && (
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              handleUpload(e.target.files)
              e.target.value = '' // Reset para permitir re-selecionar
            }}
          />
        )}
        <div className="space-y-3 max-h-80 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            </div>
          )}
          {!loading && files.length === 0 && (
            <div className="text-center py-8">
              <div className="text-white/60 mb-4">
                <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum arquivo encontrado</p>
              </div>
              {showUploadButton && (
                <Button
                  onClick={() => inputRef.current?.click()}
                  variant="outline"
                  className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Clique aqui para enviar
                </Button>
              )}
            </div>
          )}
          {!loading && files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-[#3A3A3C] bg-[#2C2C2E] hover:bg-[#3A3A3C] transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className={cn(
                  "shrink-0",
                  isPreviewableFile(file.content_type) && "cursor-pointer hover:opacity-75 transition-opacity"
                )}
                onClick={(e) => {
                  if (isPreviewableFile(file.content_type)) {
                    e.stopPropagation()
                    handlePreview(file)
                  }
                }}
                title={isPreviewableFile(file.content_type) ? "Clique para visualizar" : undefined}
              >
                {getFileIcon(file.content_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {file.file_name}
                </div>
                <div className="text-xs text-white/60 flex items-center gap-2">
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span>{new Date(file.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Preview button - for images and videos */}
                {isPreviewableFile(file.content_type) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      handlePreview(file)
                    }}
                    disabled={previewLoading || downloadingId === file.id || deletingId === file.id}
                    className="shrink-0 border-[#4A4A4A] hover:bg-[#4A4A4A] h-8 w-8 p-0"
                    title={`Visualizar ${isVideoFile(file.content_type) ? 'vídeo' : 'imagem'}`}
                  >
                    {previewLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleDownload(file)
                  }}
                  disabled={downloadingId === file.id || deletingId === file.id}
                  className="shrink-0 border-[#4A4A4A] hover:bg-[#4A4A4A] h-8 w-8 p-0"
                  title="Baixar arquivo"
                >
                  {downloadingId === file.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleDelete(file)
                  }}
                  disabled={downloadingId === file.id || deletingId === file.id}
                  className={cn(
                    "shrink-0 h-8 w-8 p-0",
                    confirmDeleteId === file.id
                      ? "border-red-500 bg-red-500/20 hover:bg-red-500/30 text-red-400"
                      : "border-[#4A4A4A] hover:bg-red-500/20 hover:border-red-500 hover:text-red-400"
                  )}
                  title={confirmDeleteId === file.id ? "Clique novamente para confirmar" : "Excluir arquivo"}
                >
                  {deletingId === file.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
        {!loading && files.length > 0 && (
          <div className="text-xs text-white/50 text-center pt-2 border-t border-[#3A3A3C]">
            {files.length} arquivo{files.length !== 1 ? 's' : ''} encontrado{files.length !== 1 ? 's' : ''}
          </div>
        )}
      </DialogContent>
      {/* File Preview Lightbox (Image or Video) */}
      {previewFile && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            if (previewFile?.isBlob) {
              URL.revokeObjectURL(previewFile.url)
            }
            setPreviewFile(null)
          }}
        >
          <div className="relative w-[90vw] h-[60vh] sm:w-[600px] sm:h-[400px] bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden">
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                if (previewFile?.isBlob) {
                  URL.revokeObjectURL(previewFile.url)
                }
                setPreviewFile(null)
              }}
              className="absolute top-3 right-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full p-1.5 transition-colors z-30 pointer-events-auto"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="p-4 w-full h-full" onClick={(e) => e.stopPropagation()}>
              {/* Render image or video based on file type */}
              {isImageFile(previewFile.type) ? (
                <img
                  src={previewFile.url}
                  alt={`Preview de ${previewFile.name}`}
                  className="w-full h-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                  onError={() => {
                    toast({
                      title: "Erro ao carregar imagem",
                      description: "Não foi possível exibir a imagem.",
                      variant: "destructive",
                    })
                    setPreviewFile(null)
                  }}
                />
              ) : isVideoFile(previewFile.type) ? (
                <div className="relative w-full h-full group">
                  <video
                    src={previewFile.url}
                    controls
                    autoPlay
                    muted
                    controlsList="nofullscreen"
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain bg-black rounded"
                    style={{ pointerEvents: 'auto' }}
                    onContextMenu={(e) => e.preventDefault()}
                    onError={(e) => {
                      toast({
                        title: "Erro ao carregar vídeo",
                        description: "Não foi possível reproduzir o vídeo.",
                        variant: "destructive",
                      })
                      setPreviewFile(null)
                    }}
                    onLoadStart={() => {}}
                    onCanPlay={() => {}}
                  />
                  {/* Download overlay button */}
                  <div className="absolute top-3 right-14 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        // Create download link using blob URL
                        const link = document.createElement('a')
                        link.href = previewFile.url
                        link.download = previewFile.name
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        toast({
                          title: "Download iniciado",
                          description: `${previewFile.name} está sendo baixado.`,
                        })
                      }}
                      className="bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
                      title="Baixar vídeo"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            {/* File name display */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-md text-sm">
              {previewFile.name}
            </div>
          </div>
        </div>
      )}
    </Dialog>
    
    {/* Delete Confirmation Dialog - Simple Alert Dialog */}
    {fileToDelete && (
      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => {
        if (!open) {
          setFileToDelete(null)
          // NÃO reabrir o modal, ele já está aberto
          // onOpenChange(true) - REMOVIDO
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('file-delete-end'))
          }
        }
      }}>
        <AlertDialogContent className="bg-[#1F1F1F] border-[#3A3A3C]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Tem certeza que deseja excluir o arquivo{" "}
              <span className="font-semibold text-white">{fileToDelete?.file_name}</span>?
              <br />
              <span className="text-red-400 text-sm">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setFileToDelete(null)
                // NÃO reabrir o modal, ele já está aberto
                // onOpenChange(true) - REMOVIDO
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('file-delete-end'))
                }
              }}
              className="bg-[#2C2C2E] border-[#3A3A3C] text-white hover:bg-[#3A3A3C]"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir Arquivo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}
    </>
  )
}