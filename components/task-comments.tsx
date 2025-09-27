"use client"
import { useState, useEffect, useCallback, useRef, Fragment } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
// Using textarea element directly since Textarea component doesn't exist
import { MessageSquare, Send, Loader2, ImageIcon, X, Video, Trash2, Bold, Italic, Underline, Edit2, Check } from "lucide-react"
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
  user_id?: string // Adicionar user_id para verificar propriedade
}
interface TaskCommentsProps {
  taskId: string
  onCommentChange?: () => void
}
export default function TaskComments({ taskId, onCommentChange }: TaskCommentsProps) {
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
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState<string>("") 
  const [updatingCommentId, setUpdatingCommentId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Função para renderizar texto com formatação markdown e links clicáveis
  const renderFormattedText = (text: string) => {
    // Primeiro aplicar formatações markdown
    let formattedText = text
      // Bold: **text** -> <strong>text</strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic: *text* -> <em>text</em>
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
      // Underline: __text__ -> <u>text</u>
      .replace(/__(.*?)__/g, '<u>$1</u>')
      // Code: `text` -> <code>text</code>
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Quote: > text -> <blockquote>text</blockquote>
      .replace(/^>\s(.+)$/gm, '<blockquote>$1</blockquote>')
      // List: - text -> <li>text</li>
      .replace(/^-\s(.+)$/gm, '<li>$1</li>')
      // Links: [text](url) -> <a href="url">text</a>
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>')

    // Depois detectar URLs automáticas
    const urlRegex = /(https?:\/\/[^\s<]+)/gi
    formattedText = formattedText.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>')

    // Wrap lists in ul tags
    formattedText = formattedText.replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc ml-4 space-y-1">$1</ul>')
    
    return (
      <div 
        dangerouslySetInnerHTML={{ __html: formattedText }}
        className="break-words"
        style={{
          wordBreak: 'break-word',
          overflowWrap: 'anywhere'
        }}
      />
    )
  }

  // Função para renderizar texto com links clicáveis (fallback)
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
  // Scroll to the latest (last) comment
  const scrollToLatest = useCallback(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [])

  // WYSIWYG Editor Functions
  const editorRef = useRef<HTMLDivElement>(null)
  const editEditorRef = useRef<HTMLDivElement>(null)

  const applyFormatting = (format: string) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    
    // Check if we have selected text
    if (range.collapsed) {
      // No selection, just set the cursor to apply formatting to new text
      document.execCommand(format, false)
      return
    }

    // Apply formatting to selected text
    switch (format) {
      case 'bold':
        document.execCommand('bold', false)
        break
      case 'italic':
        document.execCommand('italic', false)
        break
      case 'underline':
        document.execCommand('underline', false)
        break
    }
    
    // Update the newComment state with the HTML content
    if (editorRef.current) {
      setNewComment(editorRef.current.innerHTML)
    }
  }

  // Handle content changes in the editor
  const handleEditorInput = () => {
    if (editorRef.current) {
      setNewComment(editorRef.current.innerHTML)
    }
  }

  // Convert HTML content to plain text for submission
  const getPlainTextContent = (html: string) => {
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent || div.innerText || ''
  }

  // Convert HTML to markdown for storage
  const convertToMarkdown = (html: string) => {
    return html
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<b>(.*?)<\/b>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<i>(.*?)<\/i>/g, '*$1*')
      .replace(/<u>(.*?)<\/u>/g, '__$1__')
      .replace(/<div>/g, '\n')
      .replace(/<\/div>/g, '')
      .replace(/<br>/g, '\n')
      .replace(/<.*?>/g, '') // Remove any remaining HTML tags
  }

  // Load comments
  const loadComments = useCallback(async () => {
    // Verificar se taskId é válido antes de prosseguir
    if (!taskId || taskId === 'undefined' || taskId === 'null') {
      return
    }
    try {
      // Não precisa de autenticação para sistema interno
      const res = await fetch(`/api/tasks/${taskId}/comments`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Sort comments from oldest to newest (ascending order by created_at)
      const sortedComments = (data.comments || []).sort((a: Comment, b: Comment) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      setComments(sortedComments)
      // Auto-scroll to latest comment after loading
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
  }, [taskId, toast, scrollToLatest])
  // Handle file selection (image or video)
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Validate file type (image or video)
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas imagens (JPG, PNG, GIF, WebP) ou vídeos (MP4, WebM, MOV).",
        variant: "destructive",
      })
      return
    }
    // Check file size (50MB limit for videos, 10MB for images)
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
    // Create preview URL
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
  // Upload file (image or video) using existing upload system
  const uploadFile = useCallback(async (file: File): Promise<string> => {
    try {
      // Obter instância do Supabase (necessária para gerar URL pública)
      const supabase = await getSupabaseClient()
      
      // Sistema interno - não precisa de sessão para upload
      const signRes = await fetch(`/api/tasks/${taskId}/files/sign-upload`, {
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
      
      // Upload using the signed URL - USANDO FETCH DIRETO

      // Construir URL de upload
      const uploadUrl = signData.signedUrl || 
        `https://dpajrkohmqdbskqbimqf.supabase.co/storage/v1/upload/sign?token=${signData.token}`
      
      // Upload direto usando fetch
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file, // Envia APENAS o arquivo binário
        headers: {
          'Content-Type': file.type || 'image/png'
        }
      })
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()

        throw new Error(`Upload falhou: ${uploadResponse.status} ${uploadResponse.statusText}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('task-files')
        .getPublicUrl(signData.path)

      // Test URL accessibility
      try {
        const testResponse = await fetch(urlData.publicUrl, { method: 'HEAD' })

      } catch (testError) {

      }
      
      return urlData.publicUrl
    } catch (error: any) {
      throw new Error(`Erro no upload do arquivo: ${error.message}`)
    }
  }, [taskId])
  // Post new comment
  const postComment = useCallback(async () => {
    // Get plain text content for validation
    const plainText = editorRef.current ? getPlainTextContent(editorRef.current.innerHTML) : ''
    if (!plainText.trim() && !selectedFile) return
    
    setPosting(true)
    let fileUrl: string | null = null
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      // Upload file if selected
      if (selectedFile) {
        setUploading(true)
        fileUrl = await uploadFile(selectedFile)
      }
      
      // Get user ID from session or use a default
      const userId = session?.user?.id || "00000000-0000-0000-0000-000000000000"
      
      // Convert HTML content to markdown for storage
      const markdownContent = convertToMarkdown(newComment)
      
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          content: markdownContent.trim(),
          user_id: userId,
          ...(fileUrl && { image_url: fileUrl })
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Add new comment to the end of the list (newest last)
      setComments(prev => [...prev, data.comment])
      setNewComment("")
      // Clear the WYSIWYG editor
      if (editorRef.current) {
        editorRef.current.innerHTML = ""
      }
      removeFile()
      // Notify parent component about comment change
      onCommentChange?.()
      // Scroll to show the new comment
      setTimeout(() => scrollToLatest(), 100)
      toast({
        title: "Comentário adicionado",
        description: selectedFile 
          ? `Seu comentário com ${selectedFile.type.startsWith('video/') ? 'vídeo' : 'imagem'} foi publicado com sucesso.`
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
  }, [taskId, newComment, selectedFile, toast, uploadFile, removeFile, onCommentChange, scrollToLatest])
  // Delete comment
  const deleteComment = useCallback(async (commentId: string) => {
    setDeletingCommentId(commentId)
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id || currentUserId
      
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
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
      
      // Remover comentário da lista
      setComments(prev => prev.filter(c => c.id !== commentId))
      
      toast({
        title: "Comentário excluído",
        description: "O comentário foi removido com sucesso.",
      })
      
      // Notificar mudança
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
  }, [taskId, currentUserId, toast, onCommentChange])

  // Start editing comment
  const startEditComment = useCallback((comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditContent(comment.content)
    // Set the content in the edit editor
    setTimeout(() => {
      if (editEditorRef.current) {
        // Convert markdown back to HTML for editing
        const htmlContent = comment.content
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
          .replace(/__(.*?)__/g, '<u>$1</u>')
        editEditorRef.current.innerHTML = htmlContent
        editEditorRef.current.focus()
      }
    }, 50)
  }, [])

  // Cancel editing comment
  const cancelEditComment = useCallback(() => {
    setEditingCommentId(null)
    setEditContent("")
    if (editEditorRef.current) {
      editEditorRef.current.innerHTML = ""
    }
  }, [])

  // Update comment
  const updateComment = useCallback(async (commentId: string) => {
    const plainText = editEditorRef.current ? getPlainTextContent(editEditorRef.current.innerHTML) : ''
    if (!plainText.trim()) return
    
    setUpdatingCommentId(commentId)
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id || currentUserId
      
      // Convert HTML content to markdown for storage
      const markdownContent = editEditorRef.current ? convertToMarkdown(editEditorRef.current.innerHTML) : ''
      
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          comment_id: commentId,
          content: markdownContent.trim(),
          user_id: userId
        }),
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      // Update comment in the list
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, content: markdownContent.trim(), updated_at: new Date().toISOString() } : c
      ))
      
      // Clear editing state
      cancelEditComment()
      
      toast({
        title: "Comentário atualizado",
        description: "O comentário foi editado com sucesso.",
      })
      
      // Notificar mudança
      onCommentChange?.()
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar comentário",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setUpdatingCommentId(null)
    }
  }, [taskId, currentUserId, toast, onCommentChange, cancelEditComment])

  // Apply formatting to edit editor
  const applyEditFormatting = (format: string) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    
    // Check if we have selected text
    if (range.collapsed) {
      // No selection, just set the cursor to apply formatting to new text
      document.execCommand(format, false)
      return
    }

    // Apply formatting to selected text
    switch (format) {
      case 'bold':
        document.execCommand('bold', false)
        break
      case 'italic':
        document.execCommand('italic', false)
        break
      case 'underline':
        document.execCommand('underline', false)
        break
    }
    
    // Update the editContent state with the HTML content
    if (editEditorRef.current) {
      setEditContent(editEditorRef.current.innerHTML)
    }
  }

  // Handle content changes in the edit editor
  const handleEditEditorInput = () => {
    if (editEditorRef.current) {
      setEditContent(editEditorRef.current.innerHTML)
    }
  }
  
  // Load comments on mount and get current user
  useEffect(() => {
    const getUserId = async () => {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        setCurrentUserId(session.user.id)
      }
    }
    
    if (taskId && taskId !== 'undefined' && taskId !== 'null') {
      void getUserId()
      void loadComments()
    }
  }, [taskId, loadComments])
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
      <div className="flex-1 overflow-y-auto space-y-4 mb-2 min-h-0">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-white/40" />
            <p className="text-lg font-medium mb-2">Nenhum comentário ainda</p>
            <p className="text-sm">Seja o primeiro a comentar neste criativo!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              {/* Avatar */}
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={comment.user.avatar_url || "/minimal-avatar.png"} />
                <AvatarFallback className="bg-[#3A3A3C] text-white/80 text-sm">
                  {(comment.user.name?.[0] || comment.user.email?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Comment Content */}
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
                    {/* Botões de ação - apenas para o dono do comentário */}
                    {(comment.user_id === currentUserId || comment.user.id === currentUserId) && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditComment(comment)}
                          disabled={editingCommentId !== null || deletingCommentId === comment.id}
                          className="p-1 hover:bg-[#3A3A3C] rounded"
                          title="Editar comentário"
                        >
                          <Edit2 className="h-3 w-3 text-white/60 hover:text-blue-400" />
                        </button>
                        <button
                          onClick={() => deleteComment(comment.id)}
                          disabled={deletingCommentId === comment.id || editingCommentId !== null}
                          className="p-1 hover:bg-[#3A3A3C] rounded"
                          title="Excluir comentário"
                        >
                          {deletingCommentId === comment.id ? (
                            <Loader2 className="h-3 w-3 text-white/60 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 text-white/60 hover:text-red-400" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  {comment.content && (
                    <div className="text-sm text-white/90 whitespace-pre-wrap break-words">
                      {editingCommentId === comment.id ? (
                        // Edit Mode
                        <div className="space-y-2 mt-2">
                          {/* Rich Text Formatting Toolbar */}
                          <div className="bg-[#1A1A1C] border border-[#3A3A3C] rounded-t-md p-1">
                            <div className="flex flex-wrap gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                                onClick={() => applyEditFormatting('bold')}
                                title="Bold (Ctrl+B)"
                              >
                                <Bold className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                                onClick={() => applyEditFormatting('italic')}
                                title="Italic (Ctrl+I)"
                              >
                                <Italic className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                                onClick={() => applyEditFormatting('underline')}
                                title="Underline (Ctrl+U)"
                              >
                                <Underline className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <div 
                            ref={editEditorRef}
                            contentEditable
                            suppressContentEditableWarning
                            className="w-full min-h-[60px] bg-[#1A1A1C] border border-[#3A3A3C] border-t-0 text-white resize-none rounded-b-md p-2 focus:outline-none focus:ring-2 focus:ring-[#FFD60A] focus:border-transparent [&:empty:before]:content-[attr(data-placeholder)] [&:empty:before]:text-white/40 [&:empty:before]:pointer-events-none [&:focus:before]:content-none"
                            style={{
                              whiteSpace: 'pre-wrap',
                              wordWrap: 'break-word',
                              lineHeight: '1.5'
                            }}
                            onInput={handleEditEditorInput}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                e.preventDefault()
                                updateComment(comment.id)
                              }
                              if (e.key === "Escape") {
                                e.preventDefault()
                                cancelEditComment()
                              }
                              // Keyboard shortcuts
                              if (e.ctrlKey || e.metaKey) {
                                switch (e.key) {
                                  case 'b':
                                    e.preventDefault()
                                    applyEditFormatting('bold')
                                    break
                                  case 'i':
                                    e.preventDefault()
                                    applyEditFormatting('italic')
                                    break
                                  case 'u':
                                    e.preventDefault()
                                    applyEditFormatting('underline')
                                    break
                                }
                              }
                            }}
                            data-placeholder="Edite seu comentário..."
                          />
                          
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={cancelEditComment}
                              variant="ghost"
                              size="sm"
                              className="text-white/70 hover:text-white hover:bg-white/10"
                            >
                              Cancelar
                            </Button>
                            <Button
                              onClick={() => updateComment(comment.id)}
                              disabled={updatingCommentId === comment.id || (!editContent.trim() && !(editEditorRef.current && getPlainTextContent(editEditorRef.current.innerHTML).trim()))}
                              size="sm"
                              className="bg-[#4A4A4C] text-white hover:bg-[#5A5A5C] border border-[#3A3A3C]"
                            >
                              {updatingCommentId === comment.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Salvando...
                                </>
                              ) : (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  Salvar
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        renderFormattedText(comment.content)
                      )}
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
        {/* Scroll target for auto-scroll to latest comment */}
        <div ref={commentsEndRef} />
      </div>
      {/* New Comment Input */}
      <div className="border-t border-[#2E2E30] pt-4">
        <div className="space-y-3">
          {/* Rich Text Formatting Toolbar */}
          <div className="bg-[#1E1E20] border border-[#3A3A3C] rounded-t-md p-2">
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => applyFormatting('bold')}
                title="Bold (Ctrl+B)"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => applyFormatting('italic')}
                title="Italic (Ctrl+I)"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => applyFormatting('underline')}
                title="Underline (Ctrl+U)"
              >
                <Underline className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div 
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="w-full min-h-[72px] bg-[#2A2A2C] border border-[#3A3A3C] border-t-0 text-white resize-none rounded-b-md p-2 focus:outline-none focus:ring-2 focus:ring-[#FFD60A] focus:border-transparent [&:empty:before]:content-[attr(data-placeholder)] [&:empty:before]:text-white/40 [&:empty:before]:pointer-events-none [&:focus:before]:content-none"
            style={{
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              lineHeight: '1.5'
            }}
            onInput={handleEditorInput}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                void postComment()
              }
              // Keyboard shortcuts
              if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                  case 'b':
                    e.preventDefault()
                    applyFormatting('bold')
                    break
                  case 'i':
                    e.preventDefault()
                    applyFormatting('italic')
                    break
                  case 'u':
                    e.preventDefault()
                    applyFormatting('underline')
                    break
                }
              }
            }}
            data-placeholder="Escreva um comentário..."
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
            <div className="flex items-center gap-2">
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
              <Button
                onClick={postComment}
                disabled={((!newComment.trim() || (editorRef.current && !getPlainTextContent(editorRef.current.innerHTML).trim())) && !selectedFile) || posting || editingCommentId !== null}
                size="sm"
                className="bg-[#4A4A4C] text-white hover:bg-[#5A5A5C] border border-[#3A3A3C]"
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
            <p className="text-xs text-white/50">
              Ctrl+Enter para enviar
            </p>
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