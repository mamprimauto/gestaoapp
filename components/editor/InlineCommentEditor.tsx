"use client"

import { useState, useEffect, useRef } from "react"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageCircle, Plus, X, Trash2, Bold, Italic, Palette, Highlighter, RotateCcw, Edit, Check } from "lucide-react"
import { toast } from "sonner"
import { CommentMark } from "./extensions/CommentMark"

interface Comment {
  id: string
  text: string
  selectedText: string
  number: number
  color: string
}

interface InlineCommentEditorProps {
  value: string
  onChange: (content: string) => void
  placeholder?: string
  readOnly?: boolean
  estruturaId?: string
}

export default function InlineCommentEditor({
  value,
  onChange,
  placeholder = "Digite o conteúdo aqui...",
  readOnly = false,
  estruturaId
}: InlineCommentEditorProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null)
  const [newCommentText, setNewCommentText] = useState("")
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [pulsingCommentId, setPulsingCommentId] = useState<string | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")
  const sidebarRef = useRef<HTMLDivElement>(null)

  const commentColors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // yellow
    '#8b5cf6', // purple
    '#f97316', // orange
    '#06b6d4', // cyan
    '#84cc16', // lime
  ]

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        hardBreak: {
          keepMarks: false, // Don't keep marks when breaking lines
        },
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      CommentMark,
    ],
    content: value || '',
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)
      
      // Check for deleted comments
      checkForDeletedComments(editor)
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        // When Enter is pressed, clear all marks and exit comment mode
        if (event.key === 'Enter') {
          setTimeout(() => {
            // Clear stored marks using the correct method
            const tr = view.state.tr
            tr.setStoredMarks([])
            view.dispatch(tr)
          }, 0)
          
          // Exit comment mode when pressing Enter
          setIsAddingComment(false)
          setSelectedCommentId(null)
          setNewCommentText("")
        }
        return false
      },
    },
  })

  // Sync value changes
  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value || '', false)
    }
  }, [value, editor])

  // Sync readOnly changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly)
    }
  }, [readOnly, editor])

  // Load comments when component mounts
  useEffect(() => {
    loadComments()
  }, [estruturaId])

  // Close color pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowColorPicker(false)
      setShowHighlightPicker(false)
    }

    if (showColorPicker || showHighlightPicker) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showColorPicker, showHighlightPicker])

  // Handle clicks on commented text - only select, no pulse
  useEffect(() => {
    if (!editor) return

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const commentMark = target.closest('[data-comment-id]')
      
      if (commentMark) {
        const commentId = commentMark.getAttribute('data-comment-id')
        if (commentId) {
          setSelectedCommentId(commentId)
          setIsAddingComment(false)
        }
      }
    }

    const editorElement = editor.view.dom
    editorElement.addEventListener('click', handleClick)
    
    return () => {
      editorElement.removeEventListener('click', handleClick)
    }
  }, [editor])

  const loadComments = () => {
    if (!estruturaId) return
    
    try {
      const stored = localStorage.getItem(`inline_comments_${estruturaId}`)
      if (stored) {
        setComments(JSON.parse(stored))
      }
    } catch (error) {
      console.error("Error loading comments:", error)
    }
  }

  const checkForDeletedComments = (editor: any) => {
    if (!editor || comments.length === 0) return

    // Get all comment IDs currently in the editor
    const editorCommentIds = new Set<string>()
    const { state } = editor
    const { doc } = state

    doc.descendants((node: any) => {
      if (node.marks) {
        node.marks.forEach((mark: any) => {
          if (mark.type.name === 'comment' && mark.attrs.commentId) {
            editorCommentIds.add(mark.attrs.commentId)
          }
        })
      }
    })

    // Find comments that are no longer in the editor
    const deletedComments = comments.filter(comment => !editorCommentIds.has(comment.id))
    
    if (deletedComments.length > 0) {
      // Remove deleted comments from state
      const remainingComments = comments
        .filter(comment => editorCommentIds.has(comment.id))
        .map((comment, index) => ({
          ...comment,
          number: index + 1,
          color: commentColors[index % commentColors.length]
        }))

      setComments(remainingComments)
      saveCommentsToStorage(remainingComments)
      
      // Update comment marks with new numbers
      updateCommentMarks(editor, remainingComments)
      
      // Show notification
      if (deletedComments.length === 1) {
        toast.info(`Comentário "${deletedComments[0].text.slice(0, 20)}..." foi removido`)
      } else {
        toast.info(`${deletedComments.length} comentários foram removidos`)
      }
      
      // Clear selected comment if it was deleted
      if (selectedCommentId && deletedComments.some(c => c.id === selectedCommentId)) {
        setSelectedCommentId(null)
      }
    }
  }

  const updateCommentMarks = (editor: any, updatedComments: Comment[]) => {
    const { state } = editor
    const { doc } = state
    let tr = state.tr

    // Update all comment marks with new numbers and colors
    updatedComments.forEach((comment) => {
      doc.descendants((node: any, pos: number) => {
        if (node.marks) {
          node.marks.forEach((mark: any) => {
            if (mark.type.name === 'comment' && mark.attrs.commentId === comment.id) {
              const newMark = mark.type.create({
                commentId: comment.id,
                commentNumber: comment.number,
                commentColor: comment.color
              })
              tr = tr.removeMark(pos, pos + node.nodeSize, mark)
              tr = tr.addMark(pos, pos + node.nodeSize, newMark)
            }
          })
        }
      })
    })

    if (tr.docChanged) {
      editor.view.dispatch(tr)
    }
  }

  const saveCommentsToStorage = (commentsToSave: Comment[]) => {
    if (!estruturaId) return
    localStorage.setItem(`inline_comments_${estruturaId}`, JSON.stringify(commentsToSave))
  }

  const handleAddComment = () => {
    if (!editor || !newCommentText.trim()) return

    const { from, to } = editor.state.selection
    if (from === to) {
      toast.error("Selecione um texto para comentar")
      return
    }

    const selectedText = editor.state.doc.textBetween(from, to)
    const commentId = Date.now().toString()
    const commentNumber = comments.length + 1
    const commentColor = commentColors[comments.length % commentColors.length]

    const newComment: Comment = {
      id: commentId,
      text: newCommentText,
      selectedText: selectedText,
      number: commentNumber,
      color: commentColor
    }

    // Add comment mark to selected text
    editor.chain().focus().setComment(commentId, commentNumber, commentColor).run()

    // Save comment
    const updatedComments = [...comments, newComment]
    setComments(updatedComments)
    saveCommentsToStorage(updatedComments)

    // Reset state completely - don't select the new comment
    setNewCommentText("")
    setIsAddingComment(false)
    setSelectedCommentId(null)
    
    // Clear selection to prevent auto-selection for new comments
    window.getSelection()?.removeAllRanges()
    editor.commands.setTextSelection(editor.state.selection.to)
    
    toast.success("Comentário adicionado!")
  }

  const handleRemoveComment = (commentId: string) => {
    if (!editor) return

    // Remove the comment mark from the editor
    const { state } = editor
    const { doc } = state
    let tr = state.tr

    doc.descendants((node, pos) => {
      if (node.marks) {
        node.marks.forEach((mark) => {
          if (mark.type.name === 'comment' && mark.attrs.commentId === commentId) {
            tr = tr.removeMark(pos, pos + node.nodeSize, mark)
          }
        })
      }
    })

    editor.view.dispatch(tr)

    // Remove from comments list and renumber remaining comments
    const updatedComments = comments
      .filter(c => c.id !== commentId)
      .map((comment, index) => ({
        ...comment,
        number: index + 1,
        color: commentColors[index % commentColors.length]
      }))
    
    setComments(updatedComments)
    saveCommentsToStorage(updatedComments)
    
    // Update all remaining comment marks with new numbers and colors
    updateCommentMarks(editor, updatedComments)
    
    setSelectedCommentId(null)
    toast.success("Comentário removido")
  }

  const selectedComment = selectedCommentId ? comments.find(c => c.id === selectedCommentId) : null

  const handleCommentNumberClick = (commentId: string) => {
    setSelectedCommentId(commentId)
    
    // Find and pulse the comment in the editor
    if (editor) {
      const { state } = editor
      const { doc } = state
      
      doc.descendants((node, pos) => {
        if (node.marks) {
          node.marks.forEach((mark) => {
            if (mark.type.name === 'comment' && mark.attrs.commentId === commentId) {
              // Find the DOM element for this comment
              const editorElement = editor.view.dom
              const commentElement = editorElement.querySelector(`[data-comment-id="${commentId}"]`)
              
              if (commentElement) {
                // Add pulse animation
                commentElement.classList.add('pulse')
                setTimeout(() => {
                  commentElement.classList.remove('pulse')
                }, 1000)
                
                // Scroll into view
                commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
            }
          })
        }
      })
    }
  }

  const handleEditComment = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId)
    setEditingText(currentText)
  }

  const handleSaveEdit = (commentId: string) => {
    if (!editingText.trim()) {
      toast.error("Comentário não pode estar vazio")
      return
    }

    const updatedComments = comments.map(comment => 
      comment.id === commentId 
        ? { ...comment, text: editingText.trim() }
        : comment
    )

    setComments(updatedComments)
    saveCommentsToStorage(updatedComments)
    setEditingCommentId(null)
    setEditingText("")
    toast.success("Comentário atualizado!")
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditingText("")
  }

  const textColors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
    '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#808080', '#c0c0c0',
    '#ff9999', '#99ff99', '#9999ff', '#ffff99', '#ff99ff', '#99ffff', '#ffcc99', '#cc99ff'
  ]

  const highlightColors = [
    '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff9999', '#99ff99', '#9999ff', '#ffcc99',
    '#ffd700', '#98fb98', '#87ceeb', '#dda0dd', '#f0e68c', '#90ee90', '#add8e6', '#f5deb3'
  ]

  if (!editor) {
    return (
      <div className="min-h-[500px] bg-gray-800 border border-gray-700 rounded-lg animate-pulse flex items-center justify-center">
        <div className="text-gray-400">Carregando editor...</div>
      </div>
    )
  }

  return (
    <div className="flex gap-4">
      {/* Main Editor */}
      <div className="flex-1">
        <div className="relative">
          {/* Toolbar */}
          {!readOnly && (
            <div className="flex items-center gap-1 p-2 border-b border-gray-700 bg-gray-800 rounded-t-lg flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-gray-600' : ''}`}
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-gray-600' : ''}`}
              >
                <Italic className="h-4 w-4" />
              </Button>
              
              <div className="w-px h-6 bg-gray-600 mx-1" />
              
              {/* Comment Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const { from, to } = editor.state.selection
                  if (from === to) {
                    toast.error("Selecione um texto para comentar")
                    return
                  }
                  
                  // Check if selection is already commented
                  const { state } = editor
                  const { doc } = state
                  let hasComment = false
                  
                  doc.nodesBetween(from, to, (node) => {
                    if (node.marks && node.marks.some(mark => mark.type.name === 'comment')) {
                      hasComment = true
                      return false
                    }
                  })
                  
                  if (hasComment) {
                    toast.error("Este texto já possui um comentário")
                    return
                  }
                  
                  setIsAddingComment(true)
                  setSelectedCommentId(null)
                }}
                className="h-8 px-3 text-xs"
                title="Adicionar comentário"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Comentar
              </Button>
              
              <div className="w-px h-6 bg-gray-600 mx-1" />
              
              {/* Clear Formatting */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().unsetAllMarks().run()}
                className="h-8 w-8 p-0"
                title="Limpar formatação"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              
              <div className="w-px h-6 bg-gray-600 mx-1" />
              
              {/* Text Color */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowColorPicker(!showColorPicker)
                    setShowHighlightPicker(false)
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Palette className="h-4 w-4" />
                </Button>
                
                {showColorPicker && (
                  <div 
                    className="absolute top-10 left-0 z-50 bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg min-w-[280px] sm:min-w-[320px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-sm text-gray-400 mb-3 font-medium">Cor do Texto</div>
                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                      {textColors.map((color) => (
                        <button
                          key={color}
                          className="w-8 h-8 sm:w-7 sm:h-7 rounded border border-gray-600 hover:scale-110 transition-transform shadow-sm"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            editor.chain().focus().setColor(color).run()
                            setShowColorPicker(false)
                          }}
                        />
                      ))}
                    </div>
                    <button
                      className="mt-3 text-sm text-gray-400 hover:text-white underline w-full text-left"
                      onClick={() => {
                        editor.chain().focus().unsetColor().run()
                        setShowColorPicker(false)
                      }}
                    >
                      Remover cor
                    </button>
                  </div>
                )}
              </div>
              
              {/* Highlight Color */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowHighlightPicker(!showHighlightPicker)
                    setShowColorPicker(false)
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Highlighter className="h-4 w-4" />
                </Button>
                
                {showHighlightPicker && (
                  <div 
                    className="absolute top-10 left-0 z-50 bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg min-w-[280px] sm:min-w-[320px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-sm text-gray-400 mb-3 font-medium">Cor de Fundo</div>
                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                      {highlightColors.map((color) => (
                        <button
                          key={color}
                          className="w-8 h-8 sm:w-7 sm:h-7 rounded border border-gray-600 hover:scale-110 transition-transform shadow-sm"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            editor.chain().focus().setHighlight({ color }).run()
                            setShowHighlightPicker(false)
                          }}
                        />
                      ))}
                    </div>
                    <button
                      className="mt-3 text-sm text-gray-400 hover:text-white underline w-full text-left"
                      onClick={() => {
                        editor.chain().focus().unsetHighlight().run()
                        setShowHighlightPicker(false)
                      }}
                    >
                      Remover destaque
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Editor */}
          <div className="prose prose-invert max-w-none">
            <EditorContent 
              editor={editor} 
              className="min-h-[500px] p-4 bg-gray-800 text-gray-100 rounded-b-lg focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[460px] [&_.ProseMirror]:bg-gray-800 [&_.ProseMirror]:text-gray-100"
            />
          </div>

          {/* Custom CSS for placeholder and comments */}
          <style jsx global>{`
            .ProseMirror {
              outline: none !important;
              background-color: #1f2937 !important;
              color: #f3f4f6 !important;
              min-height: 460px !important;
            }
            
            .ProseMirror p.is-editor-empty:first-child::before {
              content: attr(data-placeholder);
              color: #6b7280;
              pointer-events: none;
              height: 0;
              float: left;
            }
            
            .comment-mark {
              cursor: pointer;
              transition: all 0.2s;
              position: relative;
              display: inline-block;
            }
            
            .comment-mark:hover {
              opacity: 0.8;
            }

            .comment-mark.pulse {
              animation: commentPulse 1s ease-in-out;
            }

            @keyframes commentPulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              25% { transform: scale(1.05); opacity: 0.8; }
              50% { transform: scale(1.1); opacity: 0.6; }
              75% { transform: scale(1.05); opacity: 0.8; }
            }
          `}</style>
        </div>
      </div>

      {/* Comments Sidebar */}
      <div className="w-80 bg-gray-900 border border-gray-700 rounded-lg p-4" ref={sidebarRef}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Comentários ({comments.length})
          </h3>
        </div>

        {/* Add Comment Form */}
        {isAddingComment && !readOnly && (
          <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-600">
            <div className="text-xs text-gray-400 mb-2">
              Novo comentário
            </div>
            <Input
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Digite seu comentário..."
              className="bg-gray-700 border-gray-600 text-white text-sm mb-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddComment()
                }
                if (e.key === 'Escape') {
                  setIsAddingComment(false)
                  setNewCommentText("")
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={!newCommentText.trim()}
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
                  setNewCommentText("")
                }}
                className="h-7 text-xs"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}


        {/* All Comments List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {comments.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              Nenhum comentário ainda.
              <br />
              Selecione texto e clique em "Comentar".
            </div>
          ) : (
            comments.map((comment) => (
              <div 
                key={comment.id} 
                className={`group p-3 rounded-lg transition-colors cursor-pointer ${
                  selectedCommentId === comment.id 
                    ? 'border-2' 
                    : 'bg-gray-800 hover:bg-gray-750 border border-gray-700'
                }`}
                style={{
                  backgroundColor: selectedCommentId === comment.id ? `${comment.color}20` : undefined,
                  borderColor: selectedCommentId === comment.id ? comment.color : undefined
                }}
                onClick={() => handleCommentNumberClick(comment.id)}
              >
                {editingCommentId === comment.id ? (
                  // Edit mode
                  <div className="space-y-3">
                    <div className="text-xs text-gray-500">
                      Editando: "{comment.selectedText.slice(0, 30)}{comment.selectedText.length > 30 ? '...' : ''}"
                    </div>
                    <Input
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      placeholder="Digite o comentário..."
                      className="bg-gray-700 border-gray-600 text-white text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleSaveEdit(comment.id)
                        }
                        if (e.key === 'Escape') {
                          handleCancelEdit()
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(comment.id)}
                        disabled={!editingText.trim()}
                        className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Salvar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="h-7 text-xs"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-start gap-3">
                    <div
                      className="flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: comment.color }}
                    >
                      {comment.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-1">
                        "{comment.selectedText.slice(0, 30)}{comment.selectedText.length > 30 ? '...' : ''}"
                      </div>
                      <div className="text-sm text-gray-200">
                        {comment.text}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditComment(comment.id, comment.text)
                        }}
                        className="flex-shrink-0 h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveComment(comment.id)
                        }}
                        className="flex-shrink-0 h-6 w-6 p-0 text-white hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}