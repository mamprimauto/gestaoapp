"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageCircle, Send, MoreVertical, Check, X, Reply, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { getSupabaseClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Comment {
  id: string
  content: string
  selection_start: number
  selection_end: number
  selected_text: string
  resolved: boolean
  created_at: string
  updated_at: string
  profiles: {
    id: string
    name: string
    avatar_url?: string
  }
  estruturas_invisiveis_comment_replies: Reply[]
}

interface Reply {
  id: string
  content: string
  created_at: string
  profiles: {
    id: string
    name: string
    avatar_url?: string
  }
}

interface CommentThreadProps {
  comment: Comment
  onCommentUpdate: (commentId: string, updates: Partial<Comment>) => void
  onCommentDelete: (commentId: string) => void
  onHighlightText: (start: number, end: number) => void
  estruturaId: string
}

export default function CommentThread({ 
  comment, 
  onCommentUpdate, 
  onCommentDelete, 
  onHighlightText,
  estruturaId 
}: CommentThreadProps) {
  const [showReplies, setShowReplies] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [isAddingReply, setIsAddingReply] = useState(false)
  const [replies, setReplies] = useState<Reply[]>(comment.estruturas_invisiveis_comment_replies || [])
  const replyInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAddingReply && replyInputRef.current) {
      replyInputRef.current.focus()
    }
  }, [isAddingReply])

  const handleResolve = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        toast.error("Usuário não autenticado")
        return
      }

      const response = await fetch(`/api/estruturas-invisiveis/${estruturaId}/comments/${comment.id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ resolved: !comment.resolved })
      })

      if (response.ok) {
        const updatedComment = await response.json()
        onCommentUpdate(comment.id, { resolved: updatedComment.resolved })
        toast.success(updatedComment.resolved ? "Comentário resolvido" : "Comentário reaberto")
      } else {
        throw new Error("Erro ao atualizar comentário")
      }
    } catch (error) {
      console.error("Error updating comment:", error)
      toast.error("Erro ao atualizar comentário")
    }
  }

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja deletar este comentário?")) return

    try {
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        toast.error("Usuário não autenticado")
        return
      }

      const response = await fetch(`/api/estruturas-invisiveis/${estruturaId}/comments/${comment.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        onCommentDelete(comment.id)
        toast.success("Comentário deletado")
      } else {
        throw new Error("Erro ao deletar comentário")
      }
    } catch (error) {
      console.error("Error deleting comment:", error)
      toast.error("Erro ao deletar comentário")
    }
  }

  const handleAddReply = async () => {
    if (!replyText.trim()) return

    try {
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        toast.error("Usuário não autenticado")
        return
      }

      const response = await fetch(`/api/estruturas-invisiveis/${estruturaId}/comments/${comment.id}/replies`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ content: replyText })
      })

      if (response.ok) {
        const newReply = await response.json()
        setReplies(prev => [...prev, newReply])
        setReplyText("")
        setIsAddingReply(false)
        setShowReplies(true)
        toast.success("Resposta adicionada")
      } else {
        throw new Error("Erro ao adicionar resposta")
      }
    } catch (error) {
      console.error("Error adding reply:", error)
      toast.error("Erro ao adicionar resposta")
    }
  }

  const formatDate = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3 ${comment.resolved ? 'opacity-75' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={comment.profiles.avatar_url} />
            <AvatarFallback className="text-xs bg-purple-600">
              {getInitials(comment.profiles.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-300">{comment.profiles.name}</span>
          <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
          {comment.resolved && (
            <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
              Resolvido
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResolve}
            className="h-6 w-6 p-0"
            title={comment.resolved ? "Reabrir" : "Resolver"}
          >
            {comment.resolved ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
            title="Deletar"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Selected text */}
      <div 
        className="bg-gray-700 p-2 rounded text-sm text-gray-300 cursor-pointer hover:bg-gray-600 transition-colors"
        onClick={() => onHighlightText(comment.selection_start, comment.selection_end)}
        title="Clique para destacar o texto no editor"
      >
        <div className="text-xs text-gray-500 mb-1">Texto comentado:</div>
        "{comment.selected_text}"
      </div>

      {/* Comment content */}
      <div className="text-sm text-gray-100">
        {comment.content}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAddingReply(!isAddingReply)}
          className="h-7 text-xs text-gray-400 hover:text-gray-200"
        >
          <Reply className="h-3 w-3 mr-1" />
          Responder
        </Button>
        {replies.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplies(!showReplies)}
            className="h-7 text-xs text-gray-400 hover:text-gray-200"
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            {replies.length} {replies.length === 1 ? 'resposta' : 'respostas'}
          </Button>
        )}
      </div>

      {/* Reply input */}
      {isAddingReply && (
        <div className="flex items-center gap-2">
          <Input
            ref={replyInputRef}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Digite sua resposta..."
            className="bg-gray-700 border-gray-600 text-white text-sm h-8"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddReply()
              }
              if (e.key === 'Escape') {
                setIsAddingReply(false)
                setReplyText("")
              }
            }}
          />
          <Button
            size="sm"
            onClick={handleAddReply}
            disabled={!replyText.trim()}
            className="h-8 w-8 p-0 bg-purple-600 hover:bg-purple-700"
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Replies */}
      {showReplies && replies.length > 0 && (
        <div className="space-y-2 pl-6 border-l border-gray-600">
          {replies.map((reply) => (
            <div key={reply.id} className="bg-gray-750 p-3 rounded text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={reply.profiles.avatar_url} />
                  <AvatarFallback className="text-xs bg-purple-600">
                    {getInitials(reply.profiles.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-gray-300">{reply.profiles.name}</span>
                <span className="text-xs text-gray-500">{formatDate(reply.created_at)}</span>
              </div>
              <div className="text-gray-100">{reply.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}