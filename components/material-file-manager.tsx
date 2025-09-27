"use client"
import { useState, useEffect, useRef } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
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

type ProductMaterial = {
  id: string
  product_id: string
  title: string
  description: string | null
  file_url: string
  file_path: string | null
  file_type: string | null
  file_size: number | null
  thumbnail_url: string | null
  category: string | null
  tags: string[] | null
  created_at: string
  created_by: string | null
}

interface MaterialFileManagerProps {
  productId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onFileDeleted?: () => void
  onFileUploaded?: () => void
}

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes === 0) return '0 Bytes'
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

export default function MaterialFileManager({
  productId,
  open,
  onOpenChange,
  onFileDeleted,
  onFileUploaded
}: MaterialFileManagerProps) {
  const { toast } = useToast()
  const [materials, setMaterials] = useState<ProductMaterial[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [fileToDelete, setFileToDelete] = useState<ProductMaterial | null>(null)
  const [previewFile, setPreviewFile] = useState<{ url: string; type: string; name: string; isBlob?: boolean } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Carregar materiais
  const loadMaterials = async () => {
    setLoading(true)
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from("product_materials")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setMaterials((data as ProductMaterial[]) || [])
    } catch (error) {
      setMaterials([])
    } finally {
      setLoading(false)
    }
  }

  // Carregar quando abrir
  useEffect(() => {
    if (!open) return
    loadMaterials()
  }, [productId, open])

  // Upload de arquivo
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    const fileArray = Array.from(files)

    try {
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token

      if (!token) {
        throw new Error("Sessão expirada. Por favor, faça login novamente.")
      }

      for (const file of fileArray) {
        // Validação de tamanho (200MB max)
        if (file.size > 200 * 1024 * 1024) {
          toast({
            title: "Arquivo muito grande",
            description: `${file.name} excede 200MB`,
            variant: "destructive",
          })
          continue
        }

        // Criar FormData
        const formData = new FormData()
        formData.append("file", file)
        formData.append("productId", productId)
        formData.append("title", file.name)
        formData.append("category", "material")

        // Fazer upload usando a nova API
        const response = await fetch("/api/materials/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        })

        // Verificar se a resposta tem conteúdo
        const contentType = response.headers.get("content-type")
        let result: any = {}

        if (contentType && contentType.includes("application/json")) {
          try {
            result = await response.json()
          } catch (jsonError) {
            console.error("Erro ao processar resposta JSON:", jsonError)
            result = { error: "Resposta inválida do servidor" }
          }
        }

        if (!response.ok) {
          console.error("Erro no upload:", result)
          throw new Error(result.error || `Erro HTTP ${response.status}`)
        }

        toast({
          title: "Upload concluído",
          description: `${file.name} foi enviado com sucesso`,
        })
      }

      // Recarregar lista
      await loadMaterials()
      onFileUploaded?.()

    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message || "Falha ao enviar arquivo",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  // Preview de arquivo
  const handlePreview = async (material: ProductMaterial) => {
    if (!material.file_type?.startsWith('image/') && !material.file_type?.startsWith('video/')) return

    setPreviewLoading(true)
    try {
      setPreviewFile({
        url: material.file_url,
        type: material.file_type || '',
        name: material.title
      })
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

  // Download de arquivo
  const handleDownload = async (material: ProductMaterial) => {
    setDownloadingId(material.id)
    try {
      // Usar a URL assinada diretamente
      const response = await fetch(material.file_url)
      if (!response.ok) throw new Error('Falha no download')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = material.title
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      window.URL.revokeObjectURL(url)

      toast({
        title: "Download iniciado",
        description: `${material.title} está sendo baixado.`,
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

  // Deletar arquivo
  const confirmDelete = async () => {
    if (!fileToDelete) return

    setDeletingId(fileToDelete.id)
    try {
      const supabase = await getSupabaseClient()

      // Deletar do banco
      const { error } = await supabase
        .from("product_materials")
        .delete()
        .eq("id", fileToDelete.id)

      if (error) throw error

      // Se tiver file_path, tentar deletar do storage também
      if (fileToDelete.file_path) {
        await supabase.storage
          .from("task-files")
          .remove([fileToDelete.file_path])
          .catch(() => {}) // Ignorar erros de storage
      }

      setMaterials(prev => prev.filter(m => m.id !== fileToDelete.id))
      onFileDeleted?.()

      toast({
        title: "Material excluído",
        description: `${fileToDelete.title} foi excluído com sucesso.`,
      })

      setFileToDelete(null)
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
      setFileToDelete(null)
    }
  }

  // Cleanup blob URLs
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

  const isPreviewableFile = (contentType: string | null): boolean => {
    return contentType?.startsWith('image/') || contentType?.startsWith('video/') || false
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="bg-[#1F1F1F] border-[#3A3A3C] text-white max-w-md"
          onInteractOutside={(e) => {
            if (fileToDelete) {
              e.preventDefault()
            }
          }}
          onPointerDownOutside={(e) => {
            if (fileToDelete) {
              e.preventDefault()
            }
          }}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-white flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-blue-500" />
                  Materiais do Produto
                </DialogTitle>
                <DialogDescription className="text-white/70">
                  {materials.length > 0 ? `${materials.length} material(is) disponível(is)` : "Nenhum material enviado ainda"}
                </DialogDescription>
              </div>
              <Button
                onClick={() => inputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                size="sm"
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Enviar Material
              </Button>
            </div>
          </DialogHeader>

          {/* Input oculto para upload */}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.html"
            className="hidden"
            onChange={(e) => {
              handleUpload(e.target.files)
              e.target.value = ''
            }}
          />

          <div className="space-y-3 max-h-80 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-white/60" />
              </div>
            )}

            {!loading && materials.length === 0 && (
              <div className="text-center py-8">
                <div className="text-white/60 mb-4">
                  <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum material encontrado</p>
                </div>
                <Button
                  onClick={() => inputRef.current?.click()}
                  variant="outline"
                  className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Clique aqui para enviar
                </Button>
              </div>
            )}

            {!loading && materials.map((material) => (
              <div
                key={material.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-[#3A3A3C] bg-[#2C2C2E] hover:bg-[#3A3A3C] transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className={cn(
                    "shrink-0",
                    isPreviewableFile(material.file_type) && "cursor-pointer hover:opacity-75 transition-opacity"
                  )}
                  onClick={(e) => {
                    if (isPreviewableFile(material.file_type)) {
                      e.stopPropagation()
                      handlePreview(material)
                    }
                  }}
                  title={isPreviewableFile(material.file_type) ? "Clique para visualizar" : undefined}
                >
                  {getFileIcon(material.file_type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {material.title}
                  </div>
                  <div className="text-xs text-white/60 flex items-center gap-2">
                    {material.file_size && (
                      <>
                        <span>{formatFileSize(material.file_size)}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{new Date(material.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  {material.description && (
                    <div className="text-xs text-white/50 mt-1 truncate">
                      {material.description}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Preview button */}
                  {isPreviewableFile(material.file_type) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        handlePreview(material)
                      }}
                      disabled={previewLoading || downloadingId === material.id || deletingId === material.id}
                      className="shrink-0 border-[#4A4A4A] hover:bg-[#4A4A4A] h-8 w-8 p-0"
                      title="Visualizar"
                    >
                      {previewLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  )}

                  {/* Download button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      handleDownload(material)
                    }}
                    disabled={downloadingId === material.id || deletingId === material.id}
                    className="shrink-0 border-[#4A4A4A] hover:bg-[#4A4A4A] h-8 w-8 p-0"
                    title="Baixar arquivo"
                  >
                    {downloadingId === material.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>

                  {/* Delete button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      setFileToDelete(material)
                    }}
                    disabled={downloadingId === material.id || deletingId === material.id}
                    className="shrink-0 border-[#4A4A4A] hover:bg-red-500/20 hover:border-red-500 hover:text-red-400 h-8 w-8 p-0"
                    title="Excluir material"
                  >
                    {deletingId === material.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {!loading && materials.length > 0 && (
            <div className="text-xs text-white/50 text-center pt-2 border-t border-[#3A3A3C]">
              {materials.length} material{materials.length !== 1 ? 'is' : ''} encontrado{materials.length !== 1 ? 's' : ''}
            </div>
          )}
        </DialogContent>

        {/* Preview Lightbox */}
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
                {previewFile.type.startsWith('image/') ? (
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
                ) : previewFile.type.startsWith('video/') ? (
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
                    />
                  </div>
                ) : null}
              </div>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-md text-sm">
                {previewFile.name}
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete Confirmation */}
      {fileToDelete && (
        <AlertDialog open={!!fileToDelete} onOpenChange={(open) => {
          if (!open) {
            setFileToDelete(null)
          }
        }}>
          <AlertDialogContent className="bg-[#1F1F1F] border-[#3A3A3C]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription className="text-white/70">
                Tem certeza que deseja excluir o material{" "}
                <span className="font-semibold text-white">{fileToDelete?.title}</span>?
                <br />
                <span className="text-red-400 text-sm">Esta ação não pode ser desfeita.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setFileToDelete(null)}
                className="bg-[#2C2C2E] border-[#3A3A3C] text-white hover:bg-[#3A3A3C]"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Excluir Material
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}