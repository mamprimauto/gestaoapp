"use client"
import { useState, useEffect, useCallback, useRef, Fragment } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MessageSquare, Send, Loader2, ImageIcon, X, Video, Trash2 } from "lucide-react"

type Comment = {
  id: string
  content: string
  image_url: string | null
  created_at: string
  updated_at: string
  user: {
    id: string
    name: string | null
    email: string | null
    avatar_url: string | null
  }
  user_id?: string
}

interface UniversalCommentsProps {
  entityId: string
  entityType: "task" | "swipe-file"
  onCommentChange?: () => void
}

export default function UniversalComments({ entityId, entityType, onCommentChange }: UniversalCommentsProps) {
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [posting, setPosting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [lightboxFile, setLightboxFile] = useState<{url: string; type: string; name: string} | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  
  // Get API endpoint based on entity type
  const getApiEndpoint = useCallback(() => {
    if (entityType === "swipe-file") {
      return `/api/swipe-files/${entityId}/comments`
    } else {
      return `/api/tasks/${entityId}/comments`
    }
  }, [entityId, entityType])
  
  const getUploadEndpoint = useCallback(() => {
    if (entityType === "swipe-file") {
      return `/api/swipe-files/${entityId}/files/sign-upload`
    } else {
      return `/api/tasks/${entityId}/files/sign-upload`
    }
  }, [entityId, entityType])
  
  // Função para renderizar texto com links clicáveis
  const renderTextWithLinks = (text: string) => {
    // Regex melhorado para detectar URLs (incluindo pontuação no final)
    const urlRegex = /(https?:\/\/[^\s<]+)/gi
    
    // Dividir o texto preservando as URLs
    const parts = text.split(urlRegex)
    
    return parts.map((part, index) => {
      // Verificar se a parte é uma URL
      if (part.match(/^https?:\/\//i)) {
        // Limpar pontuação do final da URL se houver
        let cleanUrl = part
        let trailing = ''
        
        // Remover pontuação comum do final (.,!?)
        const match = part.match(/^(.*?)([\.,!?\)\]]+)$/)
        if (match) {
          cleanUrl = match[1]
          trailing = match[2]
        }
        
        return (
          <Fragment key={index}>
            <a
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-400 underline decoration-blue-500/50 hover:decoration-blue-400 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              {cleanUrl}
            </a>
            {trailing}
          </Fragment>
        )
      }
      // Se não é uma URL, retorna o texto normal
      return <Fragment key={index}>{part}</Fragment>
    })
  }
  
  // Scroll to the latest comment
  const scrollToLatest = useCallback(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [])
  
  // Load comments
  const loadComments = useCallback(async () => {
    if (!entityId || entityId === 'undefined' || entityId === 'null') {
      return
    }
    try {
      const res = await fetch(getApiEndpoint())
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      const sortedComments = (data.comments || []).sort((a: Comment, b: Comment) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      setComments(sortedComments)
      setTimeout(() => scrollToLatest(), 100)
    } catch (error: any) {
      toast({
        title: "Erro ao carregar comentários",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [entityId, toast, scrollToLatest, getApiEndpoint])
  
  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas imagens ou vídeos.",
        variant: "destructive",
      })
      return
    }
    
    const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    const sizeLabel = file.type.startsWith('video/') ? '50MB' : '10MB'
    if (file.size > maxSize) {
      toast({
        title: "Erro",
        description: `Arquivo muito grande. Máximo ${sizeLabel} permitido.`,
        variant: "destructive",
      })
      return
    }
    
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }, [toast])
  
  // Remove selected file
  const removeFile = useCallback(() => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }, [previewUrl])
  
  // Upload file
  const uploadFile = useCallback(async (file: File): Promise<string> => {
    try {
      const supabase = await getSupabaseClient()
      
      const signRes = await fetch(getUploadEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          fileName: file.name || 'image.png', 
          size: file.size, 
          contentType: file.type || 'image/png'
        }),
      })
      
      const signData = await signRes.json()
      
      if (!signRes.ok || !signData?.token || !signData?.path) {
        throw new Error(`Falha ao obter URL de upload: ${signData.error || 'Erro desconhecido'}`)
      }
      
      const uploadUrl = signData.signedUrl || 
        `https://dpajrkohmqdbskqbimqf.supabase.co/storage/v1/upload/sign?token=${signData.token}`
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'image/png'
        }
      })
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload falhou: ${uploadResponse.status} ${uploadResponse.statusText}`)
      }
      
      const { data: urlData } = supabase.storage
        .from('task-files')
        .getPublicUrl(signData.path)
      
      return urlData.publicUrl
    } catch (error: any) {
      throw new Error(`Erro no upload do arquivo: ${error.message}`)
    }
  }, [getUploadEndpoint])
  
  // Post new comment
  const postComment = useCallback(async () => {
    if (!newComment.trim() && !selectedFile) return
    setPosting(true)
    let fileUrl: string | null = null
    
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (selectedFile) {
        setUploading(true)
        fileUrl = await uploadFile(selectedFile)
      }
      
      const userId = session?.user?.id || "00000000-0000-0000-0000-000000000000"
      
      const res = await fetch(getApiEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          content: newComment.trim(),
          user_id: userId,
          ...(fileUrl && { image_url: fileUrl })
        }),
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      setComments(prev => [...prev, data.comment])
      setNewComment("")
      removeFile()
      onCommentChange?.()
      setTimeout(() => scrollToLatest(), 100)
      
      toast({
        title: "Comentário adicionado",
        description: selectedFile 
          ? `Seu comentário com ${selectedFile.type.startsWith('video/') ? 'vídeo' : 'imagem'} foi publicado.`
          : "Seu comentário foi publicado com sucesso.",
      })
    } catch (error: any) {
      toast({
        title: "Erro ao comentar",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setPosting(false)
      setUploading(false)
    }
  }, [entityId, newComment, selectedFile, toast, uploadFile, removeFile, onCommentChange, scrollToLatest, getApiEndpoint])
  
  // Delete comment
  const deleteComment = useCallback(async (commentId: string) => {
    setDeletingCommentId(commentId)
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id || currentUserId
      
      const res = await fetch(getApiEndpoint(), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          comment_id: commentId,
          user_id: userId
        }),
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      setComments(prev => prev.filter(c => c.id !== commentId))
      
      toast({
        title: "Comentário excluído",
        description: "O comentário foi removido com sucesso.",
      })
      
      onCommentChange?.()
    } catch (error: any) {
      toast({
        title: "Erro ao excluir comentário",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setDeletingCommentId(null)
    }
  }, [currentUserId, toast, onCommentChange, getApiEndpoint])
  
  // Load comments and get current user
  useEffect(() => {
    const getUserId = async () => {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        setCurrentUserId(session.user.id)
      }
    }
    
    if (entityId && entityId !== 'undefined' && entityId !== 'null') {
      void getUserId()
      void loadComments()
    }
  }, [entityId, loadComments])
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMins < 1) return "agora"
    if (diffMins < 60) return `${diffMins}m atrás`
    if (diffHours < 24) return `${diffHours}h atrás`
    if (diffDays < 7) return `${diffDays}d atrás`
    
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
        <span className="ml-2 text-white/60">Carregando comentários...</span>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Comments List */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-white/40" />
            <p className="text-lg font-medium mb-2">Nenhum comentário ainda</p>
            <p className="text-sm">Seja o primeiro a comentar!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={comment.user.avatar_url || "/minimal-avatar.png"} />
                <AvatarFallback className="bg-[#3A3A3C] text-white/80 text-sm">
                  {(comment.user.name?.[0] || comment.user.email?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="bg-[#2C2C2E] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {comment.user.name || comment.user.email}
                      </span>
                      <span className="text-xs text-white/50">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    {(comment.user_id === currentUserId || comment.user.id === currentUserId) && (
                      <button
                        onClick={() => deleteComment(comment.id)}
                        disabled={deletingCommentId === comment.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#3A3A3C] rounded"
                        title="Excluir comentário"
                      >
                        {deletingCommentId === comment.id ? (
                          <Loader2 className="h-3 w-3 text-white/60 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3 text-white/60 hover:text-red-400" />
                        )}
                      </button>
                    )}
                  </div>
                  {comment.content && (
                    <div className="text-sm text-white/90 whitespace-pre-wrap break-words">
                      {renderTextWithLinks(comment.content)}
                    </div>
                  )}
                  {comment.image_url && (
                    <div className="mt-2">
                      {comment.image_url.match(/\.(mp4|webm|mov|avi)$/i) ? (
                        <video
                          src={comment.image_url}
                          className="max-w-full max-h-64 rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                          controls
                          preload="metadata"
                          onClick={() => setLightboxFile({
                            url: comment.image_url!,
                            type: 'video',
                            name: 'Vídeo do comentário'
                          })}
                        />
                      ) : (
                        <img
                          src={comment.image_url}
                          alt="Imagem do comentário"
                          className="max-w-full max-h-64 rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                          loading="lazy"
                          onClick={() => setLightboxFile({
                            url: comment.image_url!,
                            type: 'image',
                            name: 'Imagem do comentário'
                          })}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>
      
      {/* New Comment Input */}
      <div className="border-t border-[#2E2E30] pt-4">
        <div className="space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escreva um comentário..."
            className="w-full bg-[#2A2A2C] border border-[#3A3A3C] text-white placeholder:text-white/40 resize-none rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#FFD60A] focus:border-transparent"
            rows={3}
            disabled={posting}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                void postComment()
              }
            }}
          />
          
          {/* File Preview */}
          {previewUrl && selectedFile && (
            <div className="relative inline-block">
              {selectedFile.type.startsWith('video/') ? (
                <video
                  src={previewUrl}
                  className="max-w-32 max-h-32 rounded-md border border-[#3A3A3C]"
                  controls
                  preload="metadata"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-32 max-h-32 rounded-md border border-[#3A3A3C]"
                />
              )}
              <button
                onClick={removeFile}
                className="absolute -top-2 -right-2 bg-[#FF453A] hover:bg-[#FF453A]/90 text-white rounded-full p-1 transition-colors"
                disabled={posting}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          
          {/* Hidden file input */}
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
            id="comment-file-upload"
            disabled={posting}
          />
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <p className="text-xs text-white/50">
                Ctrl+Enter para enviar
              </p>
              <label
                htmlFor="comment-file-upload"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md border border-[#3A3A3C] bg-[#2A2A2C] hover:bg-[#3A3A3C] transition-colors cursor-pointer text-sm",
                  posting && "cursor-not-allowed opacity-50"
                )}
              >
                {selectedFile?.type.startsWith('video/') ? (
                  <Video className="h-4 w-4 text-white/70" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-white/70" />
                )}
                <span className="text-white/70 font-medium">
                  {selectedFile 
                    ? `Alterar ${selectedFile.type.startsWith('video/') ? 'vídeo' : 'imagem'}`
                    : "Anexar arquivo"
                  }
                </span>
              </label>
            </div>
            <Button
              onClick={postComment}
              disabled={(!newComment.trim() && !selectedFile) || posting}
              size="sm"
              className="bg-[#FFD60A] text-black hover:bg-[#FFD60A]/90"
            >
              {posting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploading ? "Enviando arquivo..." : "Enviando..."}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Comentar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Lightbox Modal */}
      {lightboxFile && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setLightboxFile(null)}
        >
          <div className="relative w-[90vw] h-[60vh] sm:w-[600px] sm:h-[400px] bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden">
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setLightboxFile(null)
              }}
              className="absolute top-3 right-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full p-1.5 transition-colors z-30 pointer-events-auto"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="p-4 w-full h-full">
              {lightboxFile.type === 'video' ? (
                <video
                  src={lightboxFile.url}
                  className="w-full h-full object-contain bg-black rounded"
                  controls
                  autoPlay
                  muted
                  playsInline
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img
                  src={lightboxFile.url}
                  alt={lightboxFile.name}
                  className="w-full h-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}