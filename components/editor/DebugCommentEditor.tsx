"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageCircle, Plus, X } from "lucide-react"
import { toast } from "sonner"
import TiptapEditor from "./TiptapEditor"

interface DebugCommentEditorProps {
  value: string
  onChange: (content: string) => void
  placeholder?: string
  readOnly?: boolean
}

export default function DebugCommentEditor({
  value,
  onChange,
  placeholder,
  readOnly
}: DebugCommentEditorProps) {
  const [selectedText, setSelectedText] = useState("")
  const [showPopup, setShowPopup] = useState(false)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const [commentText, setCommentText] = useState("")
  const [comments, setComments] = useState<string[]>([])
  const editorRef = useRef<HTMLDivElement>(null)

  // Only handle mouseup events to avoid the constant selectionchange firing
  const handleMouseUp = () => {
    if (readOnly || showPopup) return // Don't interfere if popup is already open

    setTimeout(() => {
      const selection = window.getSelection()
      const text = selection?.toString().trim()
      
      console.log("Mouse up - Selection detected:", text)
      
      if (text && text.length > 2) {
        setSelectedText(text)
        setShowPopup(true)
        setPopupPosition({ x: 300, y: 100 }) // Fixed position for debugging
        toast.info(`Texto selecionado: "${text}"`)
      }
    }, 100)
  }

  // Add event listener on mount
  useEffect(() => {
    if (!readOnly) {
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [readOnly])

  const addComment = () => {
    if (commentText.trim()) {
      const newComment = `"${selectedText}" - ${commentText}`
      setComments(prev => [...prev, newComment])
      toast.success("Comentário adicionado!")
      setCommentText("")
      setShowPopup(false)
      setSelectedText("")
      // Clear the selection to avoid issues
      window.getSelection()?.removeAllRanges()
    }
  }

  const closePopup = () => {
    setShowPopup(false)
    setCommentText("")
    setSelectedText("")
    window.getSelection()?.removeAllRanges()
  }

  return (
    <div className="relative" ref={editorRef}>
      {/* Debug info */}
      <div className="mb-4 p-3 bg-gray-800 rounded text-xs text-gray-300">
        <div>Selected: "{selectedText}"</div>
        <div>Show popup: {showPopup ? "Yes" : "No"}</div>
        <div>Comments: {comments.length}</div>
      </div>

      <TiptapEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
      />

      {/* Selection button */}
      {!readOnly && (
        <div className="mt-4">
          <Button onClick={() => {
            const selection = window.getSelection()
            const text = selection?.toString().trim()
            if (text && text.length > 2) {
              setSelectedText(text)
              setShowPopup(true)
              setPopupPosition({ x: 300, y: 100 })
              toast.info(`Texto selecionado: "${text}"`)
            } else {
              toast.info("Nenhum texto selecionado")
            }
          }} className="mr-2">
            Testar Seleção
          </Button>
          <span className="text-sm text-gray-400">
            Ou selecione texto no editor acima
          </span>
        </div>
      )}

      {/* Simple popup */}
      {showPopup && (
        <div 
          className="fixed z-50 bg-red-600 border border-red-500 rounded-lg p-4 shadow-xl"
          style={{ left: popupPosition.x, top: popupPosition.y }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="text-white text-sm mb-2">
            Comentar: "{selectedText}"
          </div>
          <Input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Digite um comentário"
            className="mb-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addComment()
              }
            }}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={addComment}>
              Adicionar
            </Button>
            <Button size="sm" variant="outline" onClick={closePopup}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Comments list */}
      {comments.length > 0 && (
        <div className="mt-4 p-3 bg-gray-800 rounded">
          <h4 className="text-white text-sm font-semibold mb-2">
            Comentários ({comments.length}):
          </h4>
          {comments.map((comment, index) => (
            <div key={index} className="text-sm text-gray-300 mb-1 p-2 bg-gray-700 rounded">
              {comment}
            </div>
          ))}
        </div>
      )}

      {/* Event listeners */}
      <div className="mt-4">
        <div className="text-sm text-gray-400 mb-2">
          Event listeners são ativados automaticamente quando não está em readOnly
        </div>
        <Button 
          onClick={() => {
            const selection = window.getSelection()
            const text = selection?.toString().trim() || "Nenhum texto selecionado"
            toast.info(`Seleção atual: "${text}"`)
          }}
          className="mr-2"
        >
          Ver Seleção Atual
        </Button>
        <Button 
          onClick={() => {
            setSelectedText("Texto de teste")
            setShowPopup(true)
            toast.info("Popup de teste ativado")
          }}
          variant="outline"
        >
          Testar Popup
        </Button>
      </div>
    </div>
  )
}