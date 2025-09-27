"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageCircle, Plus, X, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { getSupabaseClient } from "@/lib/supabase/client"
import TiptapEditor from "./TiptapEditor"

interface SavedComment {
  id: string
  text: string
  selectedText: string
  position: number
  timestamp: string
}

interface SimpleCommentEditorProps {
  value: string
  onChange: (content: string) => void
  placeholder?: string
  readOnly?: boolean
  estruturaId: string
}

interface CommentPopup {
  show: boolean
  x: number
  y: number
  selectedText: string
  position: number
}

export default function SimpleCommentEditor({
  value,
  onChange,
  placeholder,
  readOnly,
  estruturaId
}: SimpleCommentEditorProps) {
  const [commentPopup, setCommentPopup] = useState<CommentPopup>({
    show: false,
    x: 0,
    y: 0,
    selectedText: "",
    position: 0
  })
  const [commentText, setCommentText] = useState("")
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [savedComments, setSavedComments] = useState<SavedComment[]>([])
  const [showComments, setShowComments] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // Handle text selection
  useEffect(() => {
    const handleMouseUp = (event: MouseEvent) => {
      if (readOnly) return

      setTimeout(() => {
        const selection = window.getSelection()
        if (!selection || selection.isCollapsed) {
          setCommentPopup(prev => ({ ...prev, show: false }))
          return
        }

        const selectedText = selection.toString().trim()
        if (!selectedText || selectedText.length < 3) {
          setCommentPopup(prev => ({ ...prev, show: false }))
          return
        }

        // Check if the selection is within the editor
        const editorElement = editorRef.current?.querySelector('.ProseMirror')
        if (!editorElement) return

        const range = selection.getRangeAt(0)
        if (!editorElement.contains(range.commonAncestorContainer)) {
          return
        }

        // Calculate position in text
        const editorTextContent = editorElement.textContent || ""
        const position = editorTextContent.indexOf(selectedText)

        // Position popup near the selection
        const rect = range.getBoundingClientRect()
        
        setCommentPopup({
          show: true,
          x: Math.min(rect.right + 10, window.innerWidth - 350),
          y: rect.top + window.scrollY,
          selectedText: selectedText,
          position: position
        })
      }, 50)
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [readOnly])

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setCommentPopup(prev => ({ ...prev, show: false }))
        setCommentText("")
        setIsAddingComment(false)
      }
    }

    if (commentPopup.show) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [commentPopup.show])

  // Load comments when component mounts
  useEffect(() => {
    loadComments()
  }, [estruturaId])

  const loadComments = async () => {
    if (!estruturaId) return
    
    try {
      const stored = localStorage.getItem(`comments_${estruturaId}`)
      if (stored) {
        setSavedComments(JSON.parse(stored))
      }
    } catch (error) {
      console.error("Error loading comments:", error)
    }
  }

  const saveCommentsToStorage = (comments: SavedComment[]) => {
    if (!estruturaId) return
    localStorage.setItem(`comments_${estruturaId}`, JSON.stringify(comments))
  }

  const handleAddComment = async () => {
    if (!commentText.trim()) return

    const newComment: SavedComment = {
      id: Date.now().toString(),
      text: commentText,
      selectedText: commentPopup.selectedText,
      position: commentPopup.position,
      timestamp: new Date().toLocaleString('pt-BR')
    }

    const updatedComments = [...savedComments, newComment]
    setSavedComments(updatedComments)
    saveCommentsToStorage(updatedComments)
    
    toast.success(`Comentário adicionado!`)
    
    // Clear the popup
    setCommentPopup({ show: false, x: 0, y: 0, selectedText: "", position: 0 })
    setCommentText("")
    setIsAddingComment(false)
    
    // Clear selection
    window.getSelection()?.removeAllRanges()
  }

  const removeComment = (commentId: string) => {
    const updatedComments = savedComments.filter(c => c.id !== commentId)
    setSavedComments(updatedComments)
    saveCommentsToStorage(updatedComments)
    toast.success("Comentário removido")
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
      {commentPopup.show && !readOnly && (
        <div
          ref={popupRef}
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[300px]"
          style={{
            left: commentPopup.x,
            top: commentPopup.y,
          }}
        >
          <div className="text-xs text-gray-400 mb-2">
            Comentar: "{commentPopup.selectedText.slice(0, 50)}{commentPopup.selectedText.length > 50 ? '...' : ''}"
          </div>
          
          {!isAddingComment ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setIsAddingComment(true)}
                className="bg-purple-600 hover:bg-purple-700 h-8 text-xs"
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                Adicionar Comentário
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCommentPopup({ show: false, x: 0, y: 0, selectedText: "" })}
                className="h-8 text-xs"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
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
                    setIsAddingComment(false)
                    setCommentText("")
                  }
                }}
                autoFocus
              />
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="bg-purple-600 hover:bg-purple-700 h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Comentar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingComment(false)
                    setCommentText("")
                  }}
                  className="h-7 text-xs"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comments counter and toggle */}
      {!readOnly && (
        <div className="absolute top-2 right-2 flex items-center gap-2">
          {savedComments.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 h-8"
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              {savedComments.length}
            </Button>
          )}
          <div className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-400">
            💬 Selecione texto para comentar
          </div>
        </div>
      )}

      {/* Comments sidebar */}
      {showComments && savedComments.length > 0 && (
        <div className="absolute top-12 right-2 bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl min-w-[300px] max-w-[400px] max-h-[400px] overflow-y-auto z-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white">Comentários ({savedComments.length})</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="space-y-3">
            {savedComments.map((comment) => (
              <div key={comment.id} className="bg-gray-800 p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">
                  "{comment.selectedText.slice(0, 30)}{comment.selectedText.length > 30 ? '...' : ''}"
                </div>
                <div className="text-sm text-gray-200 mb-2">
                  {comment.text}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {comment.timestamp}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeComment(comment.id)}
                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}