"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageCircle, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { getSupabaseClient } from "@/lib/supabase/client"
import TiptapEditor from "./TiptapEditor"

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

interface CommentableEditorProps {
  value: string
  onChange: (content: string) => void
  placeholder?: string
  readOnly?: boolean
  estruturaId: string
  comments: Comment[]
  onCommentsChange: (comments: Comment[]) => void
}

interface CommentPopup {
  show: boolean
  x: number
  y: number
  selection: {
    start: number
    end: number
    text: string
  } | null
}

export default function CommentableEditor({
  value,
  onChange,
  placeholder,
  readOnly,
  estruturaId,
  comments,
  onCommentsChange
}: CommentableEditorProps) {
  const [commentPopup, setCommentPopup] = useState<CommentPopup>({
    show: false,
    x: 0,
    y: 0,
    selection: null
  })
  const [commentText, setCommentText] = useState("")
  const [isAddingComment, setIsAddingComment] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // Handle text selection with mouseup event for better reliability
  useEffect(() => {
    const handleMouseUp = () => {
      if (readOnly) return

      setTimeout(() => {
        const selection = window.getSelection()
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
          setCommentPopup(prev => ({ ...prev, show: false }))
          return
        }

        const selectedText = selection.toString().trim()
        if (!selectedText || selectedText.length < 2) {
          setCommentPopup(prev => ({ ...prev, show: false }))
          return
        }

        try {
          const range = selection.getRangeAt(0)
          const editorElement = editorRef.current?.querySelector('.ProseMirror')
          
          if (!editorElement) {
            return
          }

          // Check if selection is within editor
          let isInEditor = false
          let node = range.commonAncestorContainer
          while (node && node !== document.body) {
            if (node === editorElement) {
              isInEditor = true
              break
            }
            node = node.parentNode
          }

          if (!isInEditor) {
            return
          }

          // Simple position calculation
          const textContent = editorElement.textContent || ""
          const startPos = textContent.indexOf(selectedText)
          const endPos = startPos + selectedText.length

          if (startPos === -1) {
            return
          }

          // Get popup position
          const rect = range.getBoundingClientRect()
          const editorRect = editorElement.getBoundingClientRect()
          
          setCommentPopup({
            show: true,
            x: Math.min(rect.right + 10, window.innerWidth - 350),
            y: Math.max(rect.top - editorRect.top + 30, 10),
            selection: {
              start: startPos,
              end: endPos,
              text: selectedText
            }
          })
        } catch (error) {
          console.error("Error handling selection:", error)
          setCommentPopup(prev => ({ ...prev, show: false }))
        }
      }, 100)
    }

    const editorElement = editorRef.current
    if (editorElement) {
      editorElement.addEventListener('mouseup', handleMouseUp)
      return () => editorElement.removeEventListener('mouseup', handleMouseUp)
    }
  }, [readOnly])

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setCommentPopup(prev => ({ ...prev, show: false }))
        setIsAddingComment(false)
        setCommentText("")
      }
    }

    if (commentPopup.show) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [commentPopup.show])

  const handleAddComment = async () => {
    if (!commentText.trim() || !commentPopup.selection) return

    setIsAddingComment(true)
    try {
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        toast.error("Usuário não autenticado")
        return
      }

      const response = await fetch(`/api/estruturas-invisiveis/${estruturaId}/comments`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: commentText,
          selection_start: commentPopup.selection.start,
          selection_end: commentPopup.selection.end,
          selected_text: commentPopup.selection.text
        })
      })

      if (response.ok) {
        const newComment = await response.json()
        onCommentsChange([...comments, { ...newComment, estruturas_invisiveis_comment_replies: [] }])
        setCommentText("")
        setCommentPopup({ show: false, x: 0, y: 0, selection: null })
        toast.success("Comentário adicionado")
        
        // Clear selection
        window.getSelection()?.removeAllRanges()
      } else {
        throw new Error("Erro ao adicionar comentário")
      }
    } catch (error) {
      console.error("Error adding comment:", error)
      toast.error("Erro ao adicionar comentário")
    } finally {
      setIsAddingComment(false)
    }
  }

  const highlightText = (start: number, end: number) => {
    const editorElement = editorRef.current?.querySelector('.ProseMirror')
    if (!editorElement) return

    // Clear existing highlights
    editorElement.querySelectorAll('.comment-highlight').forEach(el => {
      el.classList.remove('comment-highlight')
    })

    // Simple text highlighting (basic implementation)
    const textContent = editorElement.textContent || ""
    if (start >= 0 && end <= textContent.length) {
      // This is a basic implementation. In a real scenario, you'd want to use
      // Tiptap's mark system or a more sophisticated highlighting approach
      const selection = window.getSelection()
      const range = document.createRange()
      
      try {
        // Find the text node and position
        let currentPos = 0
        const walker = document.createTreeWalker(
          editorElement,
          NodeFilter.SHOW_TEXT,
          null
        )

        let startNode: Node | null = null
        let endNode: Node | null = null
        let startOffset = 0
        let endOffset = 0

        let node
        while (node = walker.nextNode()) {
          const nodeText = node.textContent || ""
          const nodeEnd = currentPos + nodeText.length

          if (!startNode && start >= currentPos && start <= nodeEnd) {
            startNode = node
            startOffset = start - currentPos
          }
          
          if (!endNode && end >= currentPos && end <= nodeEnd) {
            endNode = node
            endOffset = end - currentPos
          }

          if (startNode && endNode) break
          currentPos = nodeEnd
        }

        if (startNode && endNode) {
          range.setStart(startNode, startOffset)
          range.setEnd(endNode, endOffset)
          selection?.removeAllRanges()
          selection?.addRange(range)
          
          // Scroll into view
          range.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      } catch (error) {
        console.error("Error highlighting text:", error)
      }
    }
  }

  return (
    <div className="relative" ref={editorRef}>
      <TiptapEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
      />

      {/* Comment popup */}
      {commentPopup.show && commentPopup.selection && !readOnly && (
        <div
          ref={popupRef}
          className="absolute z-50 bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg min-w-[300px]"
          style={{
            left: commentPopup.x,
            top: commentPopup.y,
          }}
        >
          <div className="text-xs text-gray-400 mb-2">
            Comentar: "{commentPopup.selection.text.slice(0, 50)}{commentPopup.selection.text.length > 50 ? '...' : ''}"
          </div>
          
          <div className="space-y-2">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Digite seu comentário..."
              className="bg-gray-800 border-gray-600 text-white text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddComment()
                }
                if (e.key === 'Escape') {
                  setCommentPopup({ show: false, x: 0, y: 0, selection: null })
                  setCommentText("")
                }
              }}
              autoFocus
            />
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={!commentText.trim() || isAddingComment}
                className="bg-purple-600 hover:bg-purple-700 h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                {isAddingComment ? "Adicionando..." : "Comentar"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCommentPopup({ show: false, x: 0, y: 0, selection: null })
                  setCommentText("")
                }}
                className="h-7 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comments indicators (simple dots) */}
      {comments.length > 0 && (
        <div className="absolute top-2 right-2">
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1">
            <MessageCircle className="h-3 w-3 text-purple-400" />
            <span className="text-xs text-gray-300">{comments.length}</span>
          </div>
        </div>
      )}
    </div>
  )
}