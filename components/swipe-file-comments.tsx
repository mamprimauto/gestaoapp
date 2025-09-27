"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MessageSquare, Send, Loader2, ImageIcon, X, Maximize2 } from "lucide-react"

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
}

interface SwipeFileCommentsProps {
  swipeFileId: string
  onCommentChange?: () => void
}

export default function SwipeFileComments({ swipeFileId, onCommentChange }: SwipeFileCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [posting, setPosting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Scroll to the latest comment
  const scrollToLatest = useCallback(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [])

  // Load comments
  const loadComments = useCallback(async () => {
    if (!swipeFileId || swipeFileId === 'undefined' || swipeFileId === 'null') {
      return
    }

    try {
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from("swipe_file_comments")
        .select(`
          *,
          user:profiles!swipe_file_comments_user_id_fkey (
            id,
            name,
            email,
            avatar_url
          )
        `)
        .eq("swipe_file_id", swipeFileId)
        .order("created_at", { ascending: true })

      if (error) throw error

      data?.forEach((comment: any) => {
        if (comment.image_url) {

        }
      })
      
      setComments(data || [])
      
      // Scroll to latest after loading
      setTimeout(scrollToLatest, 100)
    } catch (error) {

    } finally {
      setLoading(false)
    }
  }, [swipeFileId, scrollToLatest])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione apenas imagens")
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB")
      return
    }

    setSelectedFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Upload image to Supabase Storage
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const supabase = await getSupabaseClient()
      
      // Verificar se o usuário está autenticado e obter a sessão completa
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {

        toast.error("Erro de autenticação. Por favor, faça login novamente.")
        return null
      }
      
      if (!session || !session.user) {

        toast.error("Você precisa estar autenticado para fazer upload")
        return null
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase()
      const fileName = `${session.user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      // Garantir que o token seja enviado no header
      const { data, error: uploadError } = await supabase.storage
        .from('swipe-file-comments')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {

        if (uploadError.message?.includes('authorization') || uploadError.message?.includes('Authorization')) {
          toast.error("Execute o script SQL 059 no Supabase para desabilitar RLS completamente.")

        } else if (uploadError.message?.includes('not found')) {
          toast.error("Bucket não existe. Execute o script SQL 059 no Supabase.")
        } else if (uploadError.message?.includes('mime type')) {
          toast.error("Tipo de arquivo não permitido. Use JPG, PNG, GIF ou WebP.")
        } else {
          toast.error(`Erro no upload: ${uploadError.message}`)
        }
        return null
      }

      // Obter a URL pública da imagem
      // Usar o path retornado pelo upload para maior confiabilidade
      const pathToUse = data.path || fileName
      const { data: { publicUrl } } = supabase.storage
        .from('swipe-file-comments')
        .getPublicUrl(pathToUse)

      // Verificar se a URL é válida
      if (!publicUrl || publicUrl.includes('undefined')) {

        toast.error("Erro ao gerar URL da imagem")
        return null
      }
      
      // Testar se a imagem é acessível fazendo um HEAD request
      try {
        const testResponse = await fetch(publicUrl, { method: 'HEAD' })
        if (!testResponse.ok) {

          toast.error("Imagem enviada mas não está acessível. Execute o script SQL 061 no Supabase.")
        } else {

        }
      } catch (testError) {

      }
      
      return publicUrl
    } catch (error: any) {

      toast.error("Erro inesperado. Verifique o console para detalhes.")
      return null
    }
  }

  // Submit comment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newComment.trim() && !selectedFile) {
      toast.error("Digite um comentário ou selecione uma imagem")
      return
    }

    setPosting(true)
    try {
      const supabase = await getSupabaseClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      let imageUrl = null
      
      // Upload image if selected
      if (selectedFile) {
        setUploading(true)
        imageUrl = await uploadImage(selectedFile)
        setUploading(false)
        
        if (!imageUrl) {

          return // Não continuar se o upload falhou
        }

      }

      // Insert comment
      const commentData = {
        swipe_file_id: swipeFileId,
        user_id: user.id,
        content: newComment.trim() || "",
        image_url: imageUrl
      }

      const { error } = await supabase
        .from("swipe_file_comments")
        .insert(commentData)

      if (error) throw error

      // Clear form
      setNewComment("")
      setSelectedFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      
      // Reload comments
      await loadComments()
      
      // Notify parent
      onCommentChange?.()
      
      toast.success("Comentário adicionado!")
    } catch (error) {

      toast.error("Erro ao adicionar comentário")
    } finally {
      setPosting(false)
      setUploading(false)
    }
  }

  // Remove selected file
  const removeSelectedFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Format date
  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60))
        if (minutes === 0) return "agora"
        return `há ${minutes}min`
      }
      return `há ${hours}h`
    }
    if (days === 1) return "ontem"
    if (days < 7) return `há ${days} dias`
    
    return d.toLocaleDateString('pt-BR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Comments list */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum comentário ainda</p>
            <p className="text-xs mt-1">Seja o primeiro a comentar!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={comment.user.avatar_url || ""} />
                <AvatarFallback className="bg-gray-700 text-xs">
                  {comment.user.name?.[0]?.toUpperCase() || comment.user.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {comment.user.name || comment.user.email?.split('@')[0] || "Usuário"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                {comment.content && (
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                )}
                {comment.image_url && (
                  <div className="mt-2">
                    <img
                      src={comment.image_url}
                      alt="Imagem do comentário"
                      className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity bg-gray-800"
                      onClick={() => setLightboxImage(comment.image_url)}
                      onError={(e) => {

                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        // Adicionar um placeholder de erro
                        const errorDiv = document.createElement('div')
                        errorDiv.className = 'bg-gray-800 rounded-lg p-4 text-gray-500 text-sm'
                        errorDiv.innerHTML = '⚠️ Imagem não disponível'
                        target.parentElement?.appendChild(errorDiv)
                      }}
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="border-t border-gray-700 p-4">
        {/* Image preview */}
        {previewUrl && (
          <div className="mb-3 relative inline-block">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-32 rounded-lg"
            />
            <Button
              type="button"
              onClick={removeSelectedFile}
              size="sm"
              variant="ghost"
              className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-red-500 hover:bg-red-600"
            >
              <X className="h-3 w-3 text-white" />
            </Button>
          </div>
        )}
        
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Adicione um comentário..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 resize-none focus:outline-none focus:border-blue-500"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              variant="outline"
              className="border-gray-700 text-gray-400 hover:text-white"
              disabled={posting}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={posting || (!newComment.trim() && !selectedFile)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {posting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="Imagem ampliada"
            className="max-w-full max-h-full object-contain"
          />
          <Button
            onClick={() => setLightboxImage(null)}
            size="sm"
            variant="ghost"
            className="absolute top-4 right-4 text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  )
}